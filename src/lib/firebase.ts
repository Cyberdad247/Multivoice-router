import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true
  },
  firebaseConfig.firestoreDatabaseId
);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    // Attempt a cold read to verify setup
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
    console.log("Firebase connection established.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('permission-denied') || (error as any).code === 'permission-denied')) {
      console.log("Firebase connection verified (Permission Denied as expected).");
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently operating in offline mode.");
    }
  }
}

testConnection();
