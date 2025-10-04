import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  addDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

let firebaseApi = null;
let app = null;
let db = null;
let auth = null;

if (typeof window !== 'undefined' && window.firebase) {
  firebaseApi = window.firebase;
  app = firebaseApi.app;
  db = firebaseApi.db;
  auth = firebaseApi.auth;
} else {
  try {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error('Chybí Firebase konfigurace.');
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    firebaseApi = {
      app,
      db,
      auth,
      collection,
      doc,
      getDocs,
      onSnapshot,
      setDoc,
      addDoc,
      writeBatch,
      query,
      orderBy,
      serverTimestamp,
      GoogleAuthProvider,
      signInWithPopup,
      signOut,
      onAuthStateChanged
    };
  } catch (error) {
    console.warn('[Landing Lab] Firebase inicializace selhala – běžím v read-only módu.', error);
    firebaseApi = {
      app: null,
      db: null,
      auth: null,
      collection,
      doc,
      getDocs,
      onSnapshot,
      setDoc,
      addDoc,
      writeBatch,
      query,
      orderBy,
      serverTimestamp,
      GoogleAuthProvider,
      signInWithPopup,
      signOut,
      onAuthStateChanged
    };
  }
}

export const firebase = firebaseApi;

export function isFirebaseReady() {
  return Boolean(firebase?.db);
}

export function getAuthInstance() {
  return firebase?.auth ?? null;
}
