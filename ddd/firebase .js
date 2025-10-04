import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, query, where, orderBy, limit, getDocs, addDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, listAll, getMetadata, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDdKzUd-QVHEdHMGl3kbuAKk4p6CjgkgzQ',
  authDomain: 'central-asset-storage.firebaseapp.com',
  projectId: 'central-asset-storage',
  storageBucket: 'central-asset-storage.appspot.com',
  messagingSenderId: '907874309868',
  appId: '1:907874309868:web:5354ee69d6212f3d9937c9'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Storage initialization: use default bucket from firebaseConfig.storageBucket.
// The previous code passed 'gs://central-asset-storage.firebasestorage.app' which is an invalid bucket URL
// ("firebasestorage.app" is the hosting domain, not the gs bucket). Leaving out the second param ensures
// Firebase picks up storageBucket=central-asset-storage.appspot.com from config, preventing 403/404 issues.
const storage = getStorage(app);
const auth = getAuth(app);

const firebaseApi = {
  app,
  db,
  storage,
  auth,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
  listAll,
  getMetadata,
  deleteObject,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  getRedirectResult
};

if (typeof window !== 'undefined') {
  window.firebase ??= firebaseApi;
}

export {
  app,
  db,
  storage,
  auth,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
  listAll,
  getMetadata,
  deleteObject,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  getRedirectResult
};

export default firebaseApi;
