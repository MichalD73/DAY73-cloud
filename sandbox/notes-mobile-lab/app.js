import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '../../shared/firebase.js';

if (!auth || !db || !storage) {
  console.error('[Notes Mobile Lab] Firebase není dostupné. Zkontroluj načtení ../../shared/firebase.js');
}

const COLLECTION_ROOT = 'project73-notes';
const FOLDER_COLLECTION = 'folders';
const NOTE_COLLECTION = 'items';
const DEFAULT_FOLDER_NAME = 'Inbox';
const STORAGE_ROOT = 'project73_notes/mobile';
const MAX_NOTES = 60;

const STORAGE_KEYS = {
  COMPACT: 'p73_notes_mobile_compact',
  FOLDERS: 'p73_notes_mobile_folders',
  LAYOUT: 'p73_notes_mobile_layout'
};

const SESSION_KEYS = {
  NOTE: 'p73_notes_mobile_active_note',
  FOLDER: 'p73_notes_mobile_active_folder'
};

const dom = {
  authBtn: document.getElementById('lab-auth-btn'),
  tabs: Array.from(document.querySelectorAll('.mobile-tabs__item')),
  feed: document.getElementById('lab-feed'),
  feedEmpty: document.getElementById('lab-feed-empty'),
  composer: document.getElementById('lab-composer'),
  input: document.getElementById('lab-input'),
  submit: document.getElementById('lab-submit'),
  file: document.getElementById('lab-file'),
  attachmentBtn: document.getElementById('lab-attachment-btn'),
  attachmentPreview: document.getElementById('lab-attachment-preview'),
  attachmentThumb: document.getElementById('lab-attachment-thumb'),
  attachmentRemove: document.getElementById('lab-attachment-remove'),
  toast: document.getElementById('lab-toast'),
  countNotes: document.getElementById('lab-count-notes'),
  countFav: document.getElementById('lab-count-fav')
};

let currentUser = null;
let defaultFolderId = null;
let notesUnsubscribe = null;
let selectedFilter = 'all';
let attachmentFile = null;
let cachedNotes = [];

function showToast(message, tone = 'info', duration = 3200) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.dataset.tone = tone;
  dom.toast.hidden = false;
  dom.toast.classList.add('is-visible');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
    dom.toast.hidden = true;
  }, duration);
}

function requireUser() {
  if (!currentUser) {
    showToast('Přihlas se, prosím.', 'error');
    return false;
  }
  return true;
}

function buildNotesCollection(uid) {
  return collection(db, COLLECTION_ROOT, uid, NOTE_COLLECTION);
}

function buildFoldersCollection(uid) {
  return collection(db, COLLECTION_ROOT, uid, FOLDER_COLLECTION);
}

function setComposerEnabled(enabled) {
  const isEnabled = Boolean(enabled);
  dom.input.disabled = !isEnabled;
  dom.submit.disabled = !isEnabled;
  if (dom.attachmentBtn) dom.attachmentBtn.disabled = !isEnabled;
  dom.input.placeholder = isEnabled ? 'Napiš poznámku nebo vlož odkaz…' : 'Přihlas se, abys mohl zapisovat.';
}

async function ensureDefaultFolder(uid) {
  if (!uid) return null;
  try {
    const foldersRef = buildFoldersCollection(uid);
    const defaultQuery = query(foldersRef, where('isDefault', '==', true), limit(1));
    const snapshot = await getDocs(defaultQuery);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return docSnap.id;
    }

    const newDoc = doc(foldersRef);
    await setDoc(newDoc, {
      name: DEFAULT_FOLDER_NAME,
      parentId: null,
      isDefault: true,
      position: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newDoc.id;
  } catch (error) {
    console.error('[Notes Mobile Lab] ensureDefaultFolder failed', error);
    showToast('Nepodařilo se načíst složky.', 'error');
    return null;
  }
}

function deriveMetadata(text) {
  const lines = text.split(/\r?\n/);
  const title = (lines[0] || '').trim() || 'Bez názvu';
  const previewSource = lines.slice(1).join(' ').trim();
  const preview = previewSource.length > 160 ? `${previewSource.slice(0, 160)}…` : previewSource;
  return { title, preview: preview || 'Žádný další text' };
}

function extractPlainText(note) {
  if (!note) return '';
  if (typeof note.content === 'string') return note.content;
  const ops = note.richContent?.ops;
  if (!Array.isArray(ops)) return '';
  return ops
    .map((op) => {
      if (typeof op.insert === 'string') return op.insert;
      if (op.insert?.image) return '[Obrázek]';
      return '';
    })
    .join('')
    .trim();
}

function extractFirstImage(note) {
  const ops = note.richContent?.ops;
  if (!Array.isArray(ops)) return null;
  const op = ops.find((item) => item.insert && item.insert.image);
  return op ? op.insert.image : null;
}

function renderNotes(notes) {
  cachedNotes = notes;
  const filtered = notes.filter((note) => {
    if (selectedFilter === 'favorites') return note.isFavorite === true;
    if (selectedFilter === 'notes') return note.source !== 'chat';
    return true;
  });

  dom.countNotes.textContent = notes.length;
  dom.countFav.textContent = notes.filter((note) => note.isFavorite).length;

  dom.feed.innerHTML = '';
  if (!filtered.length) {
    dom.feedEmpty.hidden = false;
    return;
  }
  dom.feedEmpty.hidden = true;

  const fragment = document.createDocumentFragment();
  filtered.forEach((note) => {
    const item = document.createElement('article');
    item.className = 'mobile-feed__item';

    const meta = document.createElement('div');
    meta.className = 'mobile-feed__meta';
    const createdAt = note.createdAt?.toDate?.();
    meta.innerHTML = `
      <span>${createdAt ? createdAt.toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }) : 'bez data'}</span>
      ${note.source === 'mobile' ? '<span style="color:#6366f1;font-weight:600;">Mobile</span>' : ''}
    `;

    const text = document.createElement('div');
    text.className = 'mobile-feed__text';
    text.textContent = extractPlainText(note);

    item.appendChild(meta);
    if (text.textContent) item.appendChild(text);

    const imageUrl = extractFirstImage(note);
    if (imageUrl) {
      const figure = document.createElement('div');
      figure.className = 'mobile-feed__image';
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Přiložený obrázek';
      figure.appendChild(img);
      item.appendChild(figure);
    }

    fragment.appendChild(item);
  });

  dom.feed.appendChild(fragment);
}

function subscribeNotes() {
  if (notesUnsubscribe) notesUnsubscribe();
  if (!currentUser || !defaultFolderId) {
    renderNotes([]);
    return;
  }

  const notesRef = buildNotesCollection(currentUser.uid);
  const notesQuery = query(
    notesRef,
    where('folderId', '==', defaultFolderId),
    orderBy('updatedAt', 'desc'),
    limit(MAX_NOTES)
  );

  notesUnsubscribe = onSnapshot(notesQuery, (snapshot) => {
    const notes = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      notes.push({
        id: docSnap.id,
        ...data
      });
    });
    renderNotes(notes);
  }, (error) => {
    console.error('[Notes Mobile Lab] subscribeNotes failed', error);
    showToast('Poznámky se nepodařilo načíst.', 'error');
  });
}

function updateAuthUI() {
  if (!dom.authBtn) return;
  if (currentUser) {
    dom.authBtn.textContent = currentUser.displayName ? `@${currentUser.displayName.split(' ')[0]}` : 'Odhlásit';
    dom.authBtn.dataset.state = 'signed';
  } else {
    dom.authBtn.textContent = 'Přihlásit';
    dom.authBtn.dataset.state = 'unsigned';
  }
}

async function handleSignIn() {
  console.log('[NotesLab] handleSignIn start', {
    state: dom.authBtn?.dataset.state,
    authReady: !!auth,
    popup: typeof signInWithPopup,
    redirect: typeof signInWithRedirect
  });
  if (dom.authBtn?.dataset.state === 'signed') {
    if (auth && typeof signOut === 'function') {
      await signOut(auth);
    }
    return;
  }
  if (!auth || typeof GoogleAuthProvider !== 'function') {
    showToast('Firebase Auth není dostupné.', 'error');
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const preferRedirect = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const canPopup = typeof signInWithPopup === 'function';
  const canRedirect = typeof signInWithRedirect === 'function';

  if (!canPopup && !canRedirect) {
    showToast('Přihlášení není v tomto sandboxu podporované.', 'error');
    return;
  }

  try {
    console.log('[NotesLab] initiating sign-in', { preferRedirect, canPopup, canRedirect });
    if ((preferRedirect || !canPopup) && canRedirect) {
      await signInWithRedirect(auth, provider);
      return;
    }
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.warn('[NotesLab] signInWithPopup failed', error);
    if (error?.code === 'auth/popup-blocked' && typeof signInWithRedirect === 'function') {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error('[Notes Mobile Lab] signIn redirect failed', redirectError);
        showToast('Přihlášení se nepodařilo.', 'error');
        return;
      }
    }
    console.error('[Notes Mobile Lab] signIn failed', error);
    showToast('Přihlášení se nepodařilo.', 'error');
  }
}

function resetComposer() {
  dom.input.value = '';
  dom.input.style.height = 'auto';
  dom.file.value = '';
  attachmentFile = null;
  dom.attachmentPreview.hidden = true;
}

function handleTextareaResize() {
  dom.input.style.height = 'auto';
  dom.input.style.height = `${Math.min(dom.input.scrollHeight, 200)}px`;
}

async function uploadAttachment(file) {
  const safeName = file.name.replace(/[^a-z0-9_.\-]/gi, '_');
  const path = `${STORAGE_ROOT}/${currentUser.uid}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

async function handleComposerSubmit(event) {
  event.preventDefault();
  if (!requireUser()) return;
  const text = dom.input.value.trim();
  if (!text && !attachmentFile) {
    showToast('Zadej text nebo přilož obrázek.', 'error');
    return;
  }
  dom.submit.disabled = true;
  dom.submit.textContent = 'Ukládám…';
  try {
    let imageUrl = null;
    if (attachmentFile) {
      imageUrl = await uploadAttachment(attachmentFile);
    }

    const plainText = text || (imageUrl ? '[Obrázek]' : '');
    const metadata = deriveMetadata(plainText);
    const ops = [];
    if (text) ops.push({ insert: `${text}\n` });
    if (imageUrl) ops.push({ insert: { image: imageUrl } }, { insert: '\n' });
    const richContent = ops.length ? { ops } : null;

    await addDoc(buildNotesCollection(currentUser.uid), {
      content: plainText,
      richContent,
      title: metadata.title,
      preview: metadata.preview,
      folderId: defaultFolderId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: 'mobile'
    });

    showToast('Poznámka uložená ✔️', 'success');
    resetComposer();
  } catch (error) {
    console.error('[Notes Mobile Lab] save failed', error);
    showToast('Poznámku se nepodařilo uložit.', 'error');
  } finally {
    dom.submit.disabled = false;
    dom.submit.textContent = 'Odeslat';
  }
}

function bindEvents() {
  if (dom.authBtn) {
    console.log('[NotesLab] binding auth button', dom.authBtn);
    dom.authBtn.addEventListener('click', (event) => {
      console.log('[NotesLab] auth button click', { state: dom.authBtn.dataset.state });
      event.preventDefault();
      event.stopPropagation();
      handleSignIn();
    });
  }
  dom.input?.addEventListener('input', handleTextareaResize);
  dom.composer?.addEventListener('submit', handleComposerSubmit);

  dom.attachmentBtn?.addEventListener('click', () => dom.file.click());
  dom.file?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    attachmentFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      dom.attachmentThumb.src = reader.result;
      dom.attachmentPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  dom.attachmentRemove?.addEventListener('click', () => {
    attachmentFile = null;
    dom.file.value = '';
    dom.attachmentPreview.hidden = true;
  });

  dom.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      dom.tabs.forEach((tab) => {
        tab.classList.toggle('is-active', tab === btn);
        tab.setAttribute('aria-selected', tab === btn ? 'true' : 'false');
      });
      selectedFilter = btn.dataset.filter || 'all';
      renderNotes(cachedNotes);
    });
  });
}

async function init() {
  bindEvents();
  updateAuthUI();
  setComposerEnabled(false);
  handleTextareaResize();

  if (auth && typeof getRedirectResult === 'function') {
    getRedirectResult(auth).catch((error) => {
      if (error?.code === 'auth/no-auth-event') return;
      console.error('[Notes Mobile Lab] getRedirectResult failed', error);
      showToast('Přihlášení se nepodařilo dokončit.', 'error');
    });
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    updateAuthUI();
    if (!currentUser) {
      renderNotes([]);
      setComposerEnabled(false);
      return;
    }
    defaultFolderId = await ensureDefaultFolder(currentUser.uid);
    if (!defaultFolderId) {
      setComposerEnabled(false);
      return;
    }
    setComposerEnabled(true);
    subscribeNotes();
  });
}

init();

console.log('[NotesLab] app.js loaded');
