import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

// Your actual production Firebase project configuration for rooh-20eff
const REAL_ROOH_CONFIG = {
  apiKey: "AIzaSyAF3hIx17GqjPl4EoZ3PaCENdsbjGl0I3w",
  authDomain: "rooh-20eff.firebaseapp.com",
  projectId: "rooh-20eff",
  storageBucket: "rooh-20eff.firebasestorage.app",
  messagingSenderId: "1038713680167",
  appId: "1:1038713680167:web:cfb063e03eb9e357493902"
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIR_API_KEY || REAL_ROOH_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIR__DOMAIN || REAL_ROOH_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIR__JECT_ID || REAL_ROOH_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIR__BUCKET || REAL_ROOH_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIR_NDER_ID || REAL_ROOH_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIR__APP_ID || REAL_ROOH_CONFIG.appId
};

export const isFirebasePlaceholder = 
  !firebaseConfig.projectId || 
  firebaseConfig.projectId.includes('remixed') || 
  firebaseConfig.projectId.includes('placeholder') ||
  firebaseConfig.apiKey?.includes('remixed') ||
  firebaseConfig.apiKey?.includes('placeholder') ||
  !firebaseConfig.apiKey;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connectivity check
async function testConnection() {
  if (isFirebasePlaceholder) {
    console.warn("⚠️ Firebase is currently in placeholder mode.");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connected successfully to:", firebaseConfig.projectId);
  } catch (error: any) {
    if (error.message?.includes('offline') || error?.code === 'unavailable') {
      console.warn("Firebase is operating in offline/cached mode.");
    } else {
      console.warn("Firebase link warning:", error.message || error);
    }
  }
}
testConnection();
