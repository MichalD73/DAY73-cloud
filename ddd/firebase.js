import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, query, where, orderBy, limit, getDocs, addDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, listAll, getMetadata, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// Canonical Firebase config (ensure storageBucket uses appspot.com domain)
const firebaseConfig = {
  apiKey: 'AIzaSyDdKzUd-QVHEdHMGl3kbuAKk4p6CjgkgzQ',
  authDomain: 'central-asset-storage.firebaseapp.com',
  projectId: 'central-asset-storage',
  storageBucket: 'central-asset-storage.appspot.com',
  messagingSenderId: '907874309868',
  appId: '1:907874309868:web:5354ee69d6212f3d9937c9'
};

// Initialize core services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Use default bucket from config (do NOT pass a manual gs:// URL)
const storage = getStorage(app);

// Aggregated API (kept stable to match existing window.firebase expectations)
const firebaseApi = {
  app,
  auth,
  db,
  storage,
  // Firestore exports
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
  // Storage exports
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
  listAll,
  getMetadata,
  deleteObject,
  // Auth helpers
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  getRedirectResult
};

// Attach to window for legacy/self-test usage
if (typeof window !== 'undefined') {
  // Overwrite only if missing to avoid clobbering a previously initialized instance
  window.firebase = window.firebase || firebaseApi;
}

export default firebaseApi;
export {
  app,
  auth,
  db,
  storage,
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

// --- Debug helpers (data source tracing) --------------------------------------
function ensureDatasourceBanner() {
  if (typeof document === 'undefined') return { textContent: '' };
  let el = document.getElementById('datasource-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'datasource-banner';
    el.style.position = 'fixed';
    el.style.top = '6px';
    el.style.right = '6px';
    el.style.zIndex = '99999';
    el.style.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    el.style.background = 'rgba(17,24,39,.9)';
    el.style.color = '#a7f3d0';
    el.style.border = '1px solid rgba(16,185,129,.5)';
    el.style.borderRadius = '8px';
    el.style.padding = '6px 10px';
    el.style.boxShadow = '0 2px 10px rgba(0,0,0,.25)';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Show/log data source in UI corner banner + console.
 * @param {object} p { module, fs, st, note }
 */
export function showDataSource(p = {}) {
  const fsPath = p.fs?.path || (typeof p.fs === 'string' ? p.fs : null);
  const stPath = p.st?.fullPath || (typeof p.st === 'string' ? p.st : null);
  const msg = [
    `[DataSource] module=${p.module || 'unknown'}`,
    fsPath ? `fs=${fsPath}` : null,
    stPath ? `st=${stPath}` : null,
    p.note ? `note=${p.note}` : null
  ].filter(Boolean).join(' | ');
    try { console.log(msg); } catch { /* noop */ }
    try { const el = ensureDatasourceBanner(); el.textContent = msg; } catch { /* noop */ }
}

/** getDocs wrapper with trace */
export async function getDocsWithTrace(colRef, label = 'getDocs') {
  const path = colRef?.path || '(unknown-path)';
    try { console.log(`[FS:${label}] ${path}`); } catch { /* noop */ }
  return await getDocs(colRef);
}

/** onSnapshot wrapper with trace */
export function onSnapshotWithTrace(refLike, cb, err, label = 'onSnapshot') {
  const path = refLike?.path || '(unknown-path)';
    try { console.log(`[FS:${label}] ${path}`); } catch { /* noop */ }
  return onSnapshot(refLike, cb, err);
}

// Extend firebaseApi object so consumers using window.firebase also see helpers
firebaseApi.showDataSource = showDataSource;
firebaseApi.getDocsWithTrace = getDocsWithTrace;
firebaseApi.onSnapshotWithTrace = onSnapshotWithTrace;
