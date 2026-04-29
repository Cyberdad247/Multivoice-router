import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    // Attempt a cold read to verify setup
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission-denied')) {
      console.log("Firebase connection verified (Permission Denied as expected).");
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}

testConnection();
