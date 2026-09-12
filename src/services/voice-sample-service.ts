import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  orderBy,
  updateDoc 
} from 'firebase/firestore';
import { storage, db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestore';
import { VoiceSample } from '../types/voice-sample';

const LOCAL_STORAGE_KEY = 'camelot_custom_voice_samples_v1';

function getLocalSamples(): VoiceSample[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read local voice samples:', e);
    return [];
  }
}

function saveLocalSamples(samples: VoiceSample[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(samples));
  } catch (e) {
    console.warn('Failed to persist local voice samples:', e);
  }
}

export const voiceSampleService = {
  /**
   * Upload an audio snippet to Firebase Storage and register metadata in Firestore
   */
  async uploadSample(
    audioBlob: Blob,
    meta: {
      personaId: string;
      personaName: string;
      name: string;
      duration: number;
      mimeType: string;
      isBaseReference: boolean;
      transcript?: string;
      notes?: string;
    },
    onProgress?: (percent: number) => void
  ): Promise<VoiceSample> {
    const sampleId = `sample_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const user = auth.currentUser;
    const ownerId = user ? user.uid : 'guest_knight';
    const ext = meta.mimeType.includes('wav') ? 'wav' : meta.mimeType.includes('mp3') ? 'mp3' : 'webm';
    const storagePath = `voice-samples/${ownerId}/${meta.personaId}/${sampleId}.${ext}`;

    let downloadUrl = '';

    // Attempt Firebase Storage Upload if user is logged in or storage bucket is reachable
    if (user) {
      try {
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, audioBlob, {
          contentType: meta.mimeType,
          customMetadata: {
            personaId: meta.personaId,
            sampleName: meta.name,
            ownerId: user.uid
          }
        });

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress?.(Math.round(progress));
            },
            (error) => {
              console.error('Firebase Storage upload error:', error);
              reject(error);
            },
            () => resolve()
          );
        });

        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, falling back to local object URL:', storageErr);
        downloadUrl = URL.createObjectURL(audioBlob);
      }
    } else {
      // Offline / unauthenticated mode creates a persistent local Object URL & Base64 preview
      downloadUrl = URL.createObjectURL(audioBlob);
      onProgress?.(100);
    }

    const newSample: VoiceSample = {
      id: sampleId,
      personaId: meta.personaId,
      personaName: meta.personaName,
      name: meta.name,
      storagePath: storagePath,
      downloadUrl: downloadUrl,
      duration: Math.round(meta.duration * 10) / 10,
      mimeType: meta.mimeType,
      size: audioBlob.size,
      isBaseReference: meta.isBaseReference,
      transcript: meta.transcript || '',
      notes: meta.notes || '',
      ownerId: ownerId,
      createdAt: new Date().toISOString()
    };

    // Save to Firestore if authenticated
    if (user) {
      const docPath = `voice_samples/${sampleId}`;
      try {
        const docRef = doc(db, 'voice_samples', sampleId);
        await setDoc(docRef, {
          ...newSample,
          createdAt: serverTimestamp()
        });

        // If marked as base reference, unset other base references for this persona
        if (meta.isBaseReference) {
          await this.setAsBaseReference(sampleId, meta.personaId);
        }
      } catch (firestoreErr) {
        console.warn('Firestore doc creation error:', firestoreErr);
        handleFirestoreError(firestoreErr, 'create', docPath);
      }
    }

    // Always keep in local storage for fast instant playback
    const local = getLocalSamples().filter(s => s.id !== sampleId);
    if (meta.isBaseReference) {
      local.forEach(s => {
        if (s.personaId === meta.personaId) {
          s.isBaseReference = false;
        }
      });
    }
    local.unshift(newSample);
    saveLocalSamples(local);

    return newSample;
  },

  /**
   * List voice samples for a specific persona or all personas of current user
   */
  async listSamples(personaId?: string): Promise<VoiceSample[]> {
    const user = auth.currentUser;
    const local = getLocalSamples();

    if (!user) {
      return personaId ? local.filter(s => s.personaId === personaId) : local;
    }

    const path = 'voice_samples';
    try {
      let q = query(
        collection(db, 'voice_samples'),
        where('ownerId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      const cloudSamples: VoiceSample[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          personaId: data.personaId,
          personaName: data.personaName,
          name: data.name,
          storagePath: data.storagePath,
          downloadUrl: data.downloadUrl,
          duration: data.duration || 0,
          mimeType: data.mimeType || 'audio/webm',
          size: data.size || 0,
          isBaseReference: !!data.isBaseReference,
          transcript: data.transcript || '',
          notes: data.notes || '',
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
        } as VoiceSample;
      });

      // Merge cloud samples with local samples (cloud takes precedence)
      const mergedMap = new Map<string, VoiceSample>();
      local.forEach(s => mergedMap.set(s.id, s));
      cloudSamples.forEach(s => mergedMap.set(s.id, s));

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      saveLocalSamples(merged);
      return personaId ? merged.filter(s => s.personaId === personaId) : merged;
    } catch (e) {
      console.warn('Firestore listing fallback to local:', e);
      return personaId ? local.filter(s => s.personaId === personaId) : local;
    }
  },

  /**
   * Designate a sample as the primary base voice reference for a knight persona
   */
  async setAsBaseReference(sampleId: string, personaId: string): Promise<void> {
    const user = auth.currentUser;

    // Update local cache
    const local = getLocalSamples();
    let targetUrl = '';
    local.forEach(s => {
      if (s.personaId === personaId) {
        if (s.id === sampleId) {
          s.isBaseReference = true;
          targetUrl = s.downloadUrl;
        } else {
          s.isBaseReference = false;
        }
      }
    });
    saveLocalSamples(local);

    // Update Firestore if authenticated
    if (user) {
      try {
        const allSamplesForPersona = local.filter(s => s.personaId === personaId);
        for (const sample of allSamplesForPersona) {
          const docRef = doc(db, 'voice_samples', sample.id);
          await updateDoc(docRef, {
            isBaseReference: sample.id === sampleId
          }).catch(() => {});
        }

        // Also update persona document to store baseVoiceSampleId and baseVoiceSampleUrl
        const personaRef = doc(db, 'personas', personaId);
        await updateDoc(personaRef, {
          baseVoiceSampleId: sampleId,
          baseVoiceSampleUrl: targetUrl || null,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      } catch (e) {
        console.warn('Error setting base reference in Firestore:', e);
      }
    }
  },

  /**
   * Delete a voice sample from Firebase Storage and Firestore
   */
  async deleteSample(sample: VoiceSample): Promise<void> {
    const user = auth.currentUser;

    // Delete from Firebase Storage
    if (user && sample.storagePath) {
      try {
        const storageRef = ref(storage, sample.storagePath);
        await deleteObject(storageRef).catch(e => {
          console.warn('Firebase Storage delete warning (object may not exist):', e);
        });
      } catch (e) {
        console.warn('Storage deletion error:', e);
      }
    }

    // Delete from Firestore
    if (user) {
      const docPath = `voice_samples/${sample.id}`;
      try {
        await deleteDoc(doc(db, 'voice_samples', sample.id));
      } catch (e) {
        console.warn('Firestore deletion error:', e);
      }
    }

    // Delete from local cache
    const local = getLocalSamples().filter(s => s.id !== sample.id);
    saveLocalSamples(local);
  }
};
