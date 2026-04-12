import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where, limit } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getRemoteConfig, fetchAndActivate, getString } from 'firebase/remote-config';
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Analytics & Performance (only in supported environments)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const performance = typeof window !== 'undefined' ? getPerformance(app) : null;
export const remoteConfig = typeof window !== 'undefined' ? getRemoteConfig(app) : null;

if (remoteConfig) {
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  remoteConfig.defaultConfig = {
    'system_instruction': '# Saathi AI - Wise & Honest Persona\n\nYou are Saathi, a wise and honest thinking partner for people in India. Your goal is to provide deep, culturally relevant guidance in Telugu and English. You tell the truth with love, even when it is hard to hear.'
  };
}

export { 
  signInWithPopup, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where, limit,
  logEvent, fetchAndActivate, getString
};
export type { User };

// Test Connection
import { getDocFromServer } from 'firebase/firestore';
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
// testConnection(); // Removed top-level call to prevent "Pending promise was never set" error

// Error Handling Helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
