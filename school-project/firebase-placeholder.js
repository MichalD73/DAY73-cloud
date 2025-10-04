import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
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
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

let app = null;
let db = null;
let storage = null;

try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('Chybí config');
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase inicializace selhala - používám lokální data.', error);
}

export const firebase = {
  app,
  db,
  storage,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  storageRef,
  uploadBytes,
  getDownloadURL
};

export function isFirebaseReady() {
  return Boolean(db);
}

export function isStorageReady() {
  return Boolean(storage);
}

// Pokud chceš v Gemini mockovat data, můžeš tuhle funkci nahradit
// jednoduchým polem objektů a upravit notes-lab.js tak, aby používal
// lokální úložiště místo Firestore.
