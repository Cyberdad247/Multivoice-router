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
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Persona } from '../types/persona';

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

function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never {
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
