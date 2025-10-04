const {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} = window.firebase || {};

if (!auth || !db) {
  console.error('[Landing Lab] Firebase API není dostupné. Zkontroluj načtení ../../shared/firebase.js.');
}

const LAB_NAMESPACE = 'landing-lab';
const DOCS_COLLECTION = collection(db, 'sandboxProjects', LAB_NAMESPACE, 'docs');
const EVENTS_COLLECTION = collection(db, 'sandboxProjects', LAB_NAMESPACE, 'events');

const dom = {
  status: document.getElementById('lab-status'),
  signin: document.getElementById('lab-signin'),
  signout: document.getElementById('lab-signout'),
  userLabel: document.getElementById('lab-user-label'),
  form: document.getElementById('lab-doc-form'),
  title: document.getElementById('lab-doc-title'),
  note: document.getElementById('lab-doc-note'),
  list: document.getElementById('lab-doc-list'),
  reset: document.getElementById('lab-reset'),
  cta: document.getElementById('lab-cta-example'),
  placeholder: document.getElementById('lab-placeholder')
};

let currentUser = null;
let unsubscribeDocs = null;

function setStatus(message, tone = 'info', timeout = 4000) {
  if (!dom.status) return;
  if (!message) {
    dom.status.style.display = 'none';
    dom.status.textContent = '';
    dom.status.removeAttribute('data-tone');
    return;
  }
  dom.status.textContent = message;
  dom.status.dataset.tone = tone;
  dom.status.style.display = 'block';
  if (timeout > 0) {
    window.clearTimeout(setStatus._timer);
    setStatus._timer = window.setTimeout(() => setStatus(''), timeout);
  }
}

function requireUser() {
  if (!currentUser) {
    setStatus('Přihlas se, prosím.', 'error');
    return false;
  }
  return true;
}

async function signIn() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('[Landing Lab] signIn failed', error);
    setStatus('Přihlášení se nezdařilo.', 'error');
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[Landing Lab] signOut failed', error);
    setStatus('Odhlášení se nezdařilo.', 'error');
  }
}

function subscribeDocs() {
  if (unsubscribeDocs) unsubscribeDocs();
  if (!currentUser) {
    dom.list.innerHTML = '';
    dom.reset.hidden = true;
    return;
  }

  const docsQuery = query(DOCS_COLLECTION, orderBy('createdAt', 'desc'));
  unsubscribeDocs = window.firebase.onSnapshot(docsQuery, (snapshot) => {
    const fragment = document.createDocumentFragment();
    dom.list.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement('div');
      item.className = 'lab-doc-item';
      const title = data?.title || 'Bez názvu';
      const note = data?.note || '';
      const createdAt = data?.createdAt?.toDate?.();
      item.innerHTML = `
        <strong>${escapeHtml(title)}</strong>
        <span>${createdAt ? createdAt.toLocaleString('cs-CZ') : 'bez data'}</span>
        ${note ? `<p>${escapeHtml(note)}</p>` : ''}
      `;
      fragment.appendChild(item);
    });
    dom.list.appendChild(fragment);
    dom.reset.hidden = snapshot.empty;
  }, (error) => {
    console.error('[Landing Lab] subscribeDocs failed', error);
    setStatus('Načtení dokumentů selhalo.', 'error');
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (!requireUser()) return;

  const title = dom.title.value.trim();
  const note = dom.note.value.trim();
  if (!title) {
    setStatus('Vyplň titulek.', 'error');
    return;
  }

  try {
    await addDoc(DOCS_COLLECTION, {
      title,
      note,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    dom.title.value = '';
    dom.note.value = '';
    setStatus('Dokument uložen.', 'success');
    await logEvent('doc_created', { title });
  } catch (error) {
    console.error('[Landing Lab] addDoc failed', error);
    setStatus('Uložení dokumentu se nezdařilo.', 'error');
  }
}

async function logEvent(action, payload = {}) {
  try {
    await addDoc(EVENTS_COLLECTION, {
      action,
      payload,
      uid: currentUser?.uid || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('[Landing Lab] Nepodařilo se zapsat event.', error);
  }
}

async function handleReset() {
  if (!requireUser()) return;
  if (!confirm('Opravdu smazat všechny testovací záznamy v tomto sandboxu?')) return;
  try {
    const snapshot = await getDocs(DOCS_COLLECTION);
    if (snapshot.empty) {
      setStatus('Sandbox je už prázdný.', 'info');
      return;
    }
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(doc(db, 'sandboxProjects', LAB_NAMESPACE, 'docs', docSnap.id));
    });
    await batch.commit();
    setStatus('Sandbox byl vyčištěn.', 'success');
    await logEvent('sandbox_reset');
  } catch (error) {
    console.error('[Landing Lab] reset failed', error);
    setStatus('Vyčištění se nezdařilo.', 'error');
  }
}

async function handleCtaClick() {
  if (!requireUser()) return;
  setStatus('Event odeslán do Firestore.', 'success');
  await logEvent('cta_clicked', { label: 'Demo CTA' });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateUiForUser() {
  if (currentUser) {
    dom.userLabel.textContent = currentUser.displayName || currentUser.email || 'Bez jména';
    dom.signin.hidden = true;
    dom.signout.hidden = false;
    dom.form.querySelectorAll('input, textarea, button').forEach((el) => el.disabled = false);
  } else {
    dom.userLabel.textContent = 'Nepřihlášen';
    dom.signin.hidden = false;
    dom.signout.hidden = true;
    dom.form.querySelectorAll('input, textarea, button').forEach((el) => {
      if (el.type !== 'button') el.value = '';
      el.disabled = true;
    });
    dom.reset.hidden = true;
    dom.list.innerHTML = '';
  }
}

function init() {
  dom.signin?.addEventListener('click', signIn);
  dom.signout?.addEventListener('click', signOutUser);
  dom.form?.addEventListener('submit', handleFormSubmit);
  dom.reset?.addEventListener('click', handleReset);
  dom.cta?.addEventListener('click', handleCtaClick);

  // Disable inputs until auth loads
  updateUiForUser();

  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    updateUiForUser();
    subscribeDocs();
    if (currentUser) {
      logEvent('session_started');
    }
  });
}

init();
