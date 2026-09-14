import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  orderBy,
  limit,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Persona } from '../types/persona';
import { VocalLicense } from '../types/license';
import { ArtemisTestRun } from '../types/artemis';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType: operation,
    path,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}

export const personaService = {
  async savePersona(persona: Persona) {
    if (!auth.currentUser) return;
    const path = `personas/${persona.id}`;
    try {
      const docRef = doc(db, 'personas', persona.id);
      await setDoc(docRef, {
        ...persona,
        ownerId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'write', path);
    }
  },

  async savePersonas(personasToSave: Persona[]) {
    if (!auth.currentUser || personasToSave.length === 0) return;
    const path = 'personas/batch';
    try {
      const batch = writeBatch(db);
      for (const persona of personasToSave) {
        const docRef = doc(db, 'personas', persona.id);
        batch.set(docRef, {
          ...persona,
          ownerId: auth.currentUser.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, 'write', path);
    }
  },

  async deletePersona(personaId: string) {
    const path = `personas/${personaId}`;
    try {
      await deleteDoc(doc(db, 'personas', personaId));
    } catch (e) {
      handleFirestoreError(e, 'delete', path);
    }
  },

  async listPersonas(): Promise<Persona[]> {
    if (!auth.currentUser) return [];
    const path = 'personas';
    try {
      const q = query(
        collection(db, 'personas'), 
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Persona);
    } catch (e) {
      handleFirestoreError(e, 'list', path);
    }
  }
};

export const transcriptService = {
  async saveTranscript(personaId: string, messages: any[]) {
    if (!auth.currentUser) return;
    const path = 'transcripts';
    try {
      await addDoc(collection(db, 'transcripts'), {
        id: crypto.randomUUID(),
        personaId,
        ownerId: auth.currentUser.uid,
        messages,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'create', path);
    }
  }
};

export const vocalLicenseService = {
  async saveLicense(license: VocalLicense): Promise<void> {
    if (!auth.currentUser) return;
    const path = `vocal_licenses/${license.id}`;
    try {
      const docRef = doc(db, 'vocal_licenses', license.id);
      await setDoc(docRef, {
        ...license,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'write', path);
    }
  },

  async getLicense(licenseId: string): Promise<VocalLicense | null> {
    const path = `vocal_licenses/${licenseId}`;
    try {
      const q = query(
        collection(db, 'vocal_licenses'),
        where('id', '==', licenseId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as VocalLicense;
    } catch (e) {
      handleFirestoreError(e, 'get', path);
    }
  },

  async listLicenses(personaId?: string): Promise<VocalLicense[]> {
    if (!auth.currentUser) return [];
    const path = 'vocal_licenses';
    try {
      const constraints: any[] = [where('ownerId', '==', auth.currentUser.uid)];
      if (personaId) {
        constraints.push(where('personaId', '==', personaId));
      }
      const q = query(collection(db, 'vocal_licenses'), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as VocalLicense);
    } catch (e) {
      handleFirestoreError(e, 'list', path);
    }
  }
};

export const artemisService = {
  async saveTestRun(run: ArtemisTestRun): Promise<void> {
    if (!auth.currentUser) return;
    const path = `artemis_test_runs/${run.id}`;
    try {
      const docRef = doc(db, 'artemis_test_runs', run.id);
      await setDoc(docRef, {
        ...run,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'write', path);
    }
  },

  async listTestRuns(personaId?: string): Promise<ArtemisTestRun[]> {
    if (!auth.currentUser) return [];
    const path = 'artemis_test_runs';
    try {
      const constraints: any[] = [where('ownerId', '==', auth.currentUser.uid)];
      if (personaId) {
        constraints.push(where('personaId', '==', personaId));
      }
      const q = query(collection(db, 'artemis_test_runs'), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ArtemisTestRun);
    } catch (e) {
      handleFirestoreError(e, 'list', path);
    }
  }
};

