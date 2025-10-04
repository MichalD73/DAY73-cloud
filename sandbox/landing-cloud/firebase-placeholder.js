import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

let firebaseApp;
try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('Chybí config');
  }
  const existing = getApps().find((app) => app.name === 'school-cloud-app');
  firebaseApp = existing || initializeApp(firebaseConfig, 'school-cloud-app');
} catch (error) {
  console.warn('Firebase inicializace selhala - používám lokální data.', error);
  firebaseApp = null;
}

const db = firebaseApp ? getFirestore(firebaseApp) : null;
const storage = firebaseApp ? getStorage(firebaseApp) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;

export const firebase = {
  app: firebaseApp,
  db,
  storage,
  auth,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};

export function isFirebaseReady() {
  return Boolean(firebase?.db);
}

export function isStorageReady() {
  return Boolean(firebase?.storage);
}

export function getAuthInstance() {
  return firebase?.auth ?? null;
}

// Cloud verze - připraveno pro další rozšíření a experimenty
