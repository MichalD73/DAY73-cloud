const NotesApp = (() => {
  const ROOT_ID = 'notes-app';
  const COLLECTION_ROOT = 'project73-notes-lab';
  const FOLDER_COLLECTION = 'folders';
  const NOTE_COLLECTION = 'items';
  const DEFAULT_FOLDER_NAME = 'Inbox';
  const MAX_NOTES = 400;
  const DETAIL_MODE = {
    IDLE: 'idle',
    CREATING: 'creating',
    EDITING: 'editing'
  };
  const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'code-block'],
    ['clean']
  ];
  const NOTE_IMAGE_STORAGE_ROOT = 'project73_notes_lab';

  let rootEl;
  let folderTreeEl;
  let folderAddBtn;
  let listEl;
  let listEmptyEl;
  let listLockedEl;
  let listHeaderTitle;
  let countEl;
  let statusEl;
  let newNoteBtn;
  let deleteNoteBtn;
  let detailMetaEl;
  let editorWrapperEl;
  let editorSurfaceEl;
  let formEl;
  let saveBtn;
  let cancelBtn;

  let authUnsubscribe = null;
  let folderUnsubscribe = null;
  let notesUnsubscribe = null;

  let currentUser = null;
  let folders = [];
  let notesCache = [];
  let currentFolderId = null;
  let defaultFolderId = null;
  let pendingFolderId = null;
  let currentNoteId = null;
  let detailMode = DETAIL_MODE.IDLE;
  let activeView = false;
  let initialized = false;
  let isSaving = false;
  let legacyMigrated = false;
  let quill = null;
  let submitContext = null;
  let lastSubmitContext = null;
  const AUTO_SAVE_DELAY_MS = 2500;
  let autoSaveTimer = null;
  let editorDirty = false;
  let lastSavedDeltaJson = null;
  let suppressEditorChange = false;
  let keyboardListenerAttached = false;
  const expandedFolders = new Set();

  function firebaseReady() {
    return typeof window !== 'undefined'
      && window.firebase
      && window.firebase.db;
  }

  function ensureRoot() {
    if (!rootEl) {
      rootEl = document.getElementById(ROOT_ID);
    }
    return rootEl;
  }

  function ensureInitialized() {
    if (initialized) return;
    const root = ensureRoot();
    if (!root) return;

    folderTreeEl = root.querySelector('#notes-folder-tree');
    folderAddBtn = root.querySelector('#notes-folder-add');
    listEl = root.querySelector('#notes-list');
    listEmptyEl = root.querySelector('#notes-empty');
    listLockedEl = root.querySelector('#notes-locked');
    listHeaderTitle = root.querySelector('#notes-current-folder-name');
    countEl = root.querySelector('#notes-count');
    statusEl = root.querySelector('#notes-status');
    newNoteBtn = root.querySelector('#notes-new');
    deleteNoteBtn = root.querySelector('#notes-delete');
    detailMetaEl = root.querySelector('#notes-detail-meta');
    editorWrapperEl = root.querySelector('#notes-editor');
    editorSurfaceEl = root.querySelector('#notes-editor-surface');
    formEl = root.querySelector('#notes-form');
    saveBtn = root.querySelector('#notes-save');
    cancelBtn = root.querySelector('#notes-cancel');

    attachFolderHandlers();
    attachListHandlers();
    attachFormHandlers();
    attachAuthObserver();

    clearDetail();
    initialized = true;
  }

  function attachFolderHandlers() {
    if (folderAddBtn) {
      folderAddBtn.addEventListener('click', () => {
        if (!currentUser) {
          setStatus('Nejprve se přihlas.', 'error');
          return;
        }
        const name = prompt('Název nové složky:', 'Nová složka');
        if (!name || !name.trim()) return;
        createFolder(name.trim(), null);
      });
    }

    if (folderTreeEl) {
      folderTreeEl.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        const folderEl = actionEl.closest('[data-folder-id]');
        const folderId = folderEl?.dataset.folderId || null;
        const action = actionEl.dataset.action;

        if (!folderId && !['toggle-root', 'add-root'].includes(action)) {
          return;
        }

        switch (action) {
          case 'select-folder':
            if (folders.some((folder) => folder.id === folderId)) {
              switchFolder(folderId);
            } else if (folderId === null) {
              switchFolder(null);
            }
            break;
          case 'toggle-folder':
            if (expandedFolders.has(folderId)) {
              expandedFolders.delete(folderId);
            } else {
              expandedFolders.add(folderId);
            }
            renderFolderTree();
            break;
          case 'add-child':
            handleCreateChildFolder(folderId);
            break;
          case 'rename-folder':
            renameFolderPrompt(folderId);
            break;
          case 'delete-folder':
            deleteFolder(folderId);
            break;
          case 'add-root':
            handleCreateChildFolder(null);
            break;
          default:
            break;
        }
      });
    }
  }

  function attachListHandlers() {
    if (listEl) {
      listEl.addEventListener('click', (event) => {
        const item = event.target.closest('.notes-list-item');
        if (!item) return;
        const noteId = item.dataset.noteId;
        openNote(noteId);
        renderNotes();
      });
    }

    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', () => {
        if (!currentUser) {
          setStatus('Nejprve se přihlas.', 'error');
          return;
        }
        if (!currentFolderId) {
          setStatus('Vyber nejprve složku.', 'error');
          return;
        }
        startNewNote();
      });
    }

    if (deleteNoteBtn) {
      deleteNoteBtn.addEventListener('click', () => {
        if (!currentNoteId) return;
        deleteNote(currentNoteId);
      });
    }
  }

  function attachFormHandlers() {
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        submitContext = 'button';
      });
    }

    if (formEl) {
      formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        const context = submitContext;
        submitContext = null;
        if (!context) {
          if (detailMode !== DETAIL_MODE.IDLE) {
            setStatus('Klikni na „Uložit poznámku“ pro uložení.', 'neutral');
          }
          return;
        }
        if (context === 'auto' && !editorDirty) {
          return;
        }
        lastSubmitContext = context;
        processSubmit();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (detailMode === DETAIL_MODE.CREATING) {
          clearDetail();
          renderNotes();
        } else if (currentNoteId) {
          openNote(currentNoteId);
          renderNotes();
        }
      });
    }

    if (!keyboardListenerAttached) {
      document.addEventListener('keydown', handleGlobalKeydown);
      keyboardListenerAttached = true;
    }
  }

  function ensureEditor() {
    if (quill) return true;
    if (typeof window === 'undefined' || typeof window.Quill === 'undefined') {
      setStatus('Editor se nepodařilo načíst. Zkontroluj připojení.', 'error');
      return false;
    }
    if (!editorSurfaceEl) return false;

    quill = new window.Quill(editorSurfaceEl, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
      placeholder: 'Začni psát…'
    });

    quill.keyboard.addBinding({ key: 13, shortKey: true }, () => {
      if (detailMode === DETAIL_MODE.IDLE) return;
      submitContext = 'keyboard';
      formEl?.requestSubmit(saveBtn || undefined);
    });

    quill.on('text-change', handleEditorTextChange);

    updateLastSavedSnapshot(quill.getContents());

    return true;
  }

  function setDetailMode(mode) {
    detailMode = mode;
    if (editorWrapperEl) {
      editorWrapperEl.hidden = mode === DETAIL_MODE.IDLE;
    }

    if (saveBtn) {
      saveBtn.disabled = mode === DETAIL_MODE.IDLE;
      saveBtn.textContent = mode === DETAIL_MODE.EDITING ? 'Uložit změny' : 'Uložit poznámku';
    }

    if (cancelBtn) {
      cancelBtn.hidden = mode === DETAIL_MODE.IDLE;
    }

    if (deleteNoteBtn) {
      deleteNoteBtn.hidden = mode !== DETAIL_MODE.EDITING;
    }
  }

  function clearDetail() {
    currentNoteId = null;
    if (quill) {
      suppressEditorChange = true;
      quill.setContents([]);
      quill.blur();
      suppressEditorChange = false;
    }
    if (detailMetaEl) detailMetaEl.innerHTML = '';
    setDetailMode(DETAIL_MODE.IDLE);
    editorDirty = false;
    clearAutoSaveTimer();
  }

  function startNewNote() {
    if (!ensureEditor()) return;
    currentNoteId = null;
    suppressEditorChange = true;
    quill.setContents([]);
    suppressEditorChange = false;
    quill.focus();
    if (detailMetaEl) detailMetaEl.innerHTML = '';
    setDetailMode(DETAIL_MODE.CREATING);
    setStatus('', 'neutral');
    renderNotes();
    updateLastSavedSnapshot(quill.getContents());
  }

  function openNote(noteId) {
    const note = notesCache.find((item) => item.id === noteId);
    if (!note) return;
    if (!ensureEditor()) return;

    currentNoteId = noteId;
    setDetailMode(DETAIL_MODE.EDITING);

    if (note.richContent) {
      suppressEditorChange = true;
      quill.setContents(note.richContent);
      suppressEditorChange = false;
    } else {
      suppressEditorChange = true;
      quill.setText(note.content || '');
      suppressEditorChange = false;
    }
    quill.focus();

    renderDetailMeta(note);
    setStatus('', 'neutral');
    updateLastSavedSnapshot(note.richContent || quill.getContents());
  }

  function renderDetailMeta(note) {
    if (!detailMetaEl) return;
    detailMetaEl.innerHTML = '';
    if (!note) return;

    const created = formatDate(note.createdAt);
    const updated = formatDate(note.updatedAt);

    if (created) {
      detailMetaEl.appendChild(createMetaRow('Vytvořeno', created));
    }
    if (updated) {
      detailMetaEl.appendChild(createMetaRow('Upraveno', updated));
    }
  }

  function createMetaRow(label, value) {
    const span = document.createElement('span');
    span.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
    return span;
  }

  function setStatus(message, tone = 'neutral') {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.dataset.tone = tone;
  }

  function updateAvailabilityState() {
    const signedIn = !!currentUser;
    if (newNoteBtn) newNoteBtn.disabled = !signedIn;
    if (folderAddBtn) folderAddBtn.disabled = !signedIn;

    if (!signedIn) {
      toggleEmptyStates({ locked: true });
      clearDetail();
      renderNotes();
    }
  }

  function toggleEmptyStates({ empty = false, locked = false }) {
    if (listEmptyEl) listEmptyEl.hidden = !empty;
    if (listLockedEl) listLockedEl.hidden = !locked;
    if (listEl) listEl.hidden = empty || locked;
  }

  function clearAutoSaveTimer() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  function updateLastSavedSnapshot(delta) {
    try {
      const source = delta || (quill ? quill.getContents() : null);
      lastSavedDeltaJson = source ? JSON.stringify(source) : null;
    } catch (_) {
      lastSavedDeltaJson = null;
    }
    editorDirty = false;
    clearAutoSaveTimer();
  }

  function scheduleAutoSave() {
    if (detailMode === DETAIL_MODE.IDLE) return;
    if (!editorDirty) {
      clearAutoSaveTimer();
      return;
    }
    clearAutoSaveTimer();
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (!editorDirty || isSaving || detailMode === DETAIL_MODE.IDLE) return;
      submitContext = 'auto';
      formEl?.requestSubmit(saveBtn || undefined);
    }, AUTO_SAVE_DELAY_MS);
  }

  function handleEditorTextChange() {
    if (suppressEditorChange || detailMode === DETAIL_MODE.IDLE) return;
    let currentJson = null;
    try {
      currentJson = JSON.stringify(quill.getContents());
    } catch (_) {
      currentJson = null;
    }
    if (currentJson && currentJson === lastSavedDeltaJson) {
      editorDirty = false;
      clearAutoSaveTimer();
      return;
    }
    editorDirty = true;
    scheduleAutoSave();
  }

  function handleGlobalKeydown(event) {
    const key = event.key?.toLowerCase?.();
    const isSaveShortcut = key === 's' && (event.metaKey || event.ctrlKey);
    if (!isSaveShortcut) return;
    if (!activeView || detailMode === DETAIL_MODE.IDLE) return;

    event.preventDefault();
    submitContext = 'shortcut';
    formEl?.requestSubmit(saveBtn || undefined);
  }

  function coerceDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function formatDate(dateValue) {
    if (!dateValue) return '';
    try {
      return new Intl.DateTimeFormat('cs-CZ', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(dateValue);
    } catch (_) {
      return '';
    }
  }

  function extractPlainText(value, fallback = '') {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (value.ops && Array.isArray(value.ops)) {
      return value.ops.map((op) => {
        if (typeof op.insert === 'string') return op.insert;
        return ' ';
      }).join('');
    }
    return fallback;
  }

  function deriveMetadata(content = '') {
    const lines = content.split(/\r?\n/);
    const title = (lines[0] || '').trim() || 'Bez názvu';
    const previewSource = lines.slice(1).join(' ').trim();
    const preview = previewSource.length > 160
      ? `${previewSource.slice(0, 160)}…`
      : previewSource || 'Žádný další text';
    return { title, preview };
  }

  function ensureCurrentFolder() {
    if (!folders.length) {
      currentFolderId = null;
      return;
    }

    if (pendingFolderId && folders.some((folder) => folder.id === pendingFolderId)) {
      currentFolderId = pendingFolderId;
      pendingFolderId = null;
      ensureFolderExpansion(currentFolderId);
      return;
    }

    if (currentFolderId && folders.some((folder) => folder.id === currentFolderId)) {
      ensureFolderExpansion(currentFolderId);
      return;
    }

    const preferred = folders.find((folder) => folder.isDefault)
      || folders.find((folder) => folder.parentId === null)
      || folders[0];
    currentFolderId = preferred ? preferred.id : null;
    ensureFolderExpansion(currentFolderId);
  }

  function ensureFolderExpansion(folderId) {
    if (!folderId) return;
    let cursor = folderId;
    while (cursor) {
      expandedFolders.add(cursor);
      const parent = folders.find((f) => f.id === cursor)?.parentId || null;
      cursor = parent;
    }
  }

  function renderFolderTree() {
    if (!folderTreeEl) return;
    folderTreeEl.innerHTML = '';

    const rootList = buildFolderList(null, 0, true);
    folderTreeEl.appendChild(rootList);
  }

  function buildFolderList(parentId, depth, includeRootEntry = false) {
    const ul = document.createElement('ul');
    ul.className = depth === 0 ? 'notes-tree-list' : 'notes-tree-children';
    ul.setAttribute('role', depth === 0 ? 'tree' : 'group');

    if (includeRootEntry) {
      const rootItem = document.createElement('li');
      rootItem.className = 'notes-tree-item';
      rootItem.dataset.folderId = '';
      rootItem.setAttribute('role', 'treeitem');
      const row = document.createElement('div');
      row.className = 'notes-tree-row' + (!currentFolderId ? ' notes-tree-row--active' : '');

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.dataset.action = 'select-folder';
      labelBtn.className = 'notes-tree-row__label';
      labelBtn.innerHTML = '<span>📁 Poznámky</span>';
      row.appendChild(labelBtn);

      const actions = document.createElement('div');
      actions.className = 'notes-tree-row__actions';
      const addRoot = document.createElement('button');
      addRoot.type = 'button';
      addRoot.className = 'notes-tree-btn';
      addRoot.dataset.action = 'add-root';
      addRoot.title = 'Přidat novou složku';
      addRoot.textContent = '+';
      actions.appendChild(addRoot);
      row.appendChild(actions);

      rootItem.appendChild(row);
      ul.appendChild(rootItem);
    }

    const entries = folders
      .filter((folder) => (folder.parentId || null) === (parentId || null))
      .sort((a, b) => {
        const posDiff = (a.position || 0) - (b.position || 0);
        if (posDiff !== 0) return posDiff;
        return a.name.localeCompare(b.name, 'cs');
      });

    entries.forEach((folder) => {
      const li = document.createElement('li');
      li.className = 'notes-tree-item';
      li.dataset.folderId = folder.id;
      li.setAttribute('role', 'treeitem');

      const row = document.createElement('div');
      row.className = 'notes-tree-row' + (folder.id === currentFolderId ? ' notes-tree-row--active' : '');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'notes-tree-toggle';
      toggle.dataset.action = 'toggle-folder';
      toggle.innerHTML = expandedFolders.has(folder.id) ? '▾' : '▸';
      const hasChildren = folders.some((child) => child.parentId === folder.id);
      toggle.hidden = !hasChildren;

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.className = 'notes-tree-row__label';
      labelBtn.dataset.action = 'select-folder';
      labelBtn.innerHTML = `<span>📂 ${escapeHtml(folder.name)}</span>`;

      const actions = document.createElement('div');
      actions.className = 'notes-tree-row__actions';

      const addChild = document.createElement('button');
      addChild.type = 'button';
      addChild.dataset.action = 'add-child';
      addChild.className = 'notes-tree-btn';
      addChild.title = 'Přidat podsložku';
      addChild.textContent = '+';
      actions.appendChild(addChild);

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.dataset.action = 'rename-folder';
      renameBtn.className = 'notes-tree-btn';
      renameBtn.title = 'Přejmenovat složku';
      renameBtn.textContent = '✎';
      actions.appendChild(renameBtn);

      if (!folder.isDefault) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.dataset.action = 'delete-folder';
        deleteBtn.className = 'notes-tree-btn';
        deleteBtn.title = 'Smazat složku';
        deleteBtn.textContent = '🗑';
        actions.appendChild(deleteBtn);
      }

      row.appendChild(toggle);
      row.appendChild(labelBtn);
      row.appendChild(actions);
      li.appendChild(row);

      if (hasChildren && expandedFolders.has(folder.id)) {
        li.appendChild(buildFolderList(folder.id, depth + 1));
      }

      ul.appendChild(li);
    });

    return ul;
  }

  function renderFolderHeader() {
    if (!listHeaderTitle) return;
    const active = folders.find((folder) => folder.id === currentFolderId);
    listHeaderTitle.textContent = active ? active.name : 'Poznámky';
  }

  async function ensureDefaultFolder(colRef) {
    if (!firebaseReady() || !currentUser) return;
    try {
      const { addDoc, serverTimestamp } = window.firebase;
      const docRef = await addDoc(colRef, {
        name: DEFAULT_FOLDER_NAME,
        parentId: null,
        isDefault: true,
        position: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      defaultFolderId = docRef.id;
      pendingFolderId = docRef.id;
      expandedFolders.add(docRef.id);
    } catch (error) {
      console.error('[Notes] ensureDefaultFolder error', error);
      setStatus('Výchozí složku se nepodařilo vytvořit.', 'error');
    }
  }

  async function migrateLegacyNotesIfNeeded() {
    if (legacyMigrated || !defaultFolderId || !firebaseReady() || !currentUser) {
      return;
    }
    try {
      const { db, collection, query, where, getDocs, updateDoc } = window.firebase;
      const notesRef = collection(db, COLLECTION_ROOT, currentUser.uid, NOTE_COLLECTION);
      const q = query(notesRef, where('folderId', '==', null));
      const snapshot = await getDocs(q);
      const ops = [];
      snapshot.forEach((docSnap) => {
        ops.push(updateDoc(docSnap.ref, { folderId: defaultFolderId }));
      });
      if (ops.length) {
        await Promise.all(ops);
        setStatus('Starší poznámky přesunuty do Inboxu.', 'success');
      }
    } catch (error) {
      console.error('[Notes] migrateLegacyNotesIfNeeded', error);
    } finally {
      legacyMigrated = true;
    }
  }

  function subscribeFolders() {
    stopFolderSubscription();
    folders = [];
    renderFolderTree();
    renderFolderHeader();

    if (!activeView || !currentUser || !firebaseReady()) {
      return;
    }

    const { db, collection, onSnapshot, orderBy, query } = window.firebase;
    const colRef = collection(db, COLLECTION_ROOT, currentUser.uid, FOLDER_COLLECTION);
    const q = query(colRef, orderBy('parentId'), orderBy('position'), orderBy('name'));

    folderUnsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        await ensureDefaultFolder(colRef);
        return;
      }

      const next = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const entry = {
          id: docSnap.id,
          name: data.name || 'Bez názvu',
          parentId: data.parentId || null,
          isDefault: !!data.isDefault,
          position: data.position || Date.now(),
          createdAt: coerceDate(data.createdAt),
          updatedAt: coerceDate(data.updatedAt)
        };
        next.push(entry);
        if (entry.isDefault) {
          defaultFolderId = entry.id;
        }
      });

      folders = next;
      ensureCurrentFolder();
      renderFolderTree();
      renderFolderHeader();
      await migrateLegacyNotesIfNeeded();
      subscribeNotes();
    }, (error) => {
      console.error('[Notes] folders onSnapshot failed', error);
      setStatus('Složky se nepodařilo načíst.', 'error');
    });
  }

  function stopFolderSubscription() {
    if (typeof folderUnsubscribe === 'function') {
      folderUnsubscribe();
    }
    folderUnsubscribe = null;
  }

  function subscribeNotes() {
    stopNotesSubscription();
    notesCache = [];
    renderNotes();

    if (!activeView || !currentUser || !currentFolderId || !firebaseReady()) {
      return;
    }

    setStatus('Načítám poznámky…', 'neutral');

    const { db, collection, onSnapshot, orderBy, query, where, limit } = window.firebase;
    const notesRef = collection(db, COLLECTION_ROOT, currentUser.uid, NOTE_COLLECTION);
    const q = query(
      notesRef,
      where('folderId', '==', currentFolderId),
      orderBy('updatedAt', 'desc'),
      limit(MAX_NOTES)
    );

    notesUnsubscribe = onSnapshot(q, (snapshot) => {
      const next = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const plain = extractPlainText(data.content, '');
        const rich = data.richContent?.ops ? { ops: data.richContent.ops } : (data.richContent || null);
        const metadata = deriveMetadata(plain);
        next.push({
          id: docSnap.id,
          folderId: data.folderId || currentFolderId,
          content: plain,
          richContent: rich,
          title: data.title || metadata.title,
          preview: data.preview || metadata.preview,
          createdAt: coerceDate(data.createdAt),
          updatedAt: coerceDate(data.updatedAt)
        });
      });

      notesCache = next;
      ensureNoteSelection();
      renderNotes();

      if (statusEl && statusEl.dataset.tone === 'neutral') {
        setStatus('Poznámky načtené.', 'neutral');
      }
    }, (error) => {
      console.error('[Notes] notes onSnapshot failed', error);
      setStatus('Poznámky se nepodařilo načíst.', 'error');
    });
  }

  function stopNotesSubscription() {
    if (typeof notesUnsubscribe === 'function') {
      notesUnsubscribe();
    }
    notesUnsubscribe = null;
  }

  function ensureNoteSelection() {
    if (!notesCache.length) {
      if (currentUser && currentFolderId) {
        if (detailMode !== DETAIL_MODE.CREATING) {
          startNewNote();
        }
        toggleEmptyStates({ empty: false });
      } else {
        if (detailMode !== DETAIL_MODE.IDLE) {
          clearDetail();
        }
        toggleEmptyStates({ empty: true });
      }
      return;
    }

    const hasSelected = currentNoteId && notesCache.some((note) => note.id === currentNoteId);
    if (detailMode === DETAIL_MODE.CREATING) {
      return;
    }

    if (hasSelected) {
      const note = notesCache.find((item) => item.id === currentNoteId);
      if (note) {
        renderDetailMeta(note);
      }
      return;
    }

    const first = notesCache[0];
    if (first) {
      openNote(first.id);
    }
  }

  function renderNotes() {
    if (!listEl || !countEl) return;
    const total = notesCache.length;
    countEl.textContent = String(total);
    listEl.innerHTML = '';

    if (!currentUser) {
      toggleEmptyStates({ locked: true });
      return;
    }

    if (!total) {
      const draftActive = detailMode === DETAIL_MODE.CREATING && currentUser;
      toggleEmptyStates({ empty: !draftActive });
      if (!draftActive) {
        return;
      }
    } else {
      toggleEmptyStates({});
    }

    const fragment = document.createDocumentFragment();
    notesCache.forEach((note) => {
      fragment.appendChild(createNoteListItem(note));
    });
    listEl.appendChild(fragment);
  }

  function createNoteListItem(note) {
    const li = document.createElement('li');
    li.className = 'notes-list-item';
    if (note.id === currentNoteId && detailMode !== DETAIL_MODE.CREATING) {
      li.classList.add('notes-list-item--active');
    }
    li.dataset.noteId = note.id;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', note.id === currentNoteId ? 'true' : 'false');

    const title = document.createElement('h3');
    title.className = 'notes-list-item__title';
    title.textContent = note.title || 'Bez názvu';

    const preview = document.createElement('p');
    preview.className = 'notes-list-item__preview';
    preview.textContent = note.preview || '';

    const meta = document.createElement('div');
    meta.className = 'notes-list-item__meta';
    meta.textContent = formatDate(note.updatedAt || note.createdAt) || '—';

    li.appendChild(title);
    li.appendChild(preview);
    li.appendChild(meta);
    return li;
  }

  function handleCreateChildFolder(parentId) {
    const parent = parentId ? folders.find((folder) => folder.id === parentId) : null;
    const promptLabel = parent ? `Název podsložky pro “${parent.name}”:` : 'Název nové složky:';
    const name = prompt(promptLabel, 'Nová složka');
    if (!name || !name.trim()) return;
    createFolder(name.trim(), parentId);
  }

  async function createFolder(name, parentId) {
    if (!firebaseReady() || !currentUser) return;
    try {
      const { db, collection, addDoc, serverTimestamp } = window.firebase;
      const colRef = collection(db, COLLECTION_ROOT, currentUser.uid, FOLDER_COLLECTION);
      const docRef = await addDoc(colRef, {
        name,
        parentId: parentId || null,
        isDefault: false,
        position: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      pendingFolderId = docRef.id;
      expandedFolders.add(parentId || docRef.id);
      setStatus('Složka vytvořená.', 'success');
    } catch (error) {
      console.error('[Notes] createFolder failed', error);
      setStatus('Složku se nepodařilo vytvořit.', 'error');
    }
  }

  function renameFolderPrompt(folderId) {
    const target = folders.find((folder) => folder.id === folderId);
    if (!target) return;
    const name = prompt('Přejmenuj složku:', target.name);
    if (!name || !name.trim()) return;
    renameFolder(folderId, name.trim());
  }

  async function renameFolder(folderId, name) {
    if (!firebaseReady() || !currentUser) return;
    try {
      const { db, doc, updateDoc, serverTimestamp } = window.firebase;
      const folderRef = doc(db, COLLECTION_ROOT, currentUser.uid, FOLDER_COLLECTION, folderId);
      await updateDoc(folderRef, {
        name,
        updatedAt: serverTimestamp()
      });
      setStatus('Složka přejmenovaná.', 'success');
    } catch (error) {
      console.error('[Notes] renameFolder failed', error);
      setStatus('Složku se nepodařilo přejmenovat.', 'error');
    }
  }

  async function deleteFolder(folderId) {
    if (!firebaseReady() || !currentUser) return;
    if (folderId === defaultFolderId) {
      setStatus('Výchozí složku nelze smazat.', 'error');
      return;
    }
    const hasChildren = folders.some((folder) => folder.parentId === folderId);
    if (hasChildren) {
      setStatus('Nejdřív odeber nebo přesuň podsložky.', 'error');
      return;
    }

    try {
      const { db, collection, query, where, limit, getDocs, doc, deleteDoc } = window.firebase;
      const notesRef = collection(db, COLLECTION_ROOT, currentUser.uid, NOTE_COLLECTION);
      const q = query(notesRef, where('folderId', '==', folderId), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setStatus('Složka obsahuje poznámky. Přesuň je nebo smaž.', 'error');
        return;
      }
      if (!confirm('Opravdu smazat složku?')) return;
      const folderRef = doc(db, COLLECTION_ROOT, currentUser.uid, FOLDER_COLLECTION, folderId);
      await deleteDoc(folderRef);
      expandedFolders.delete(folderId);
      setStatus('Složka odstraněná.', 'success');
      if (currentFolderId === folderId) {
        currentFolderId = defaultFolderId;
        currentNoteId = null;
        clearDetail();
        subscribeNotes();
      }
    } catch (error) {
      console.error('[Notes] deleteFolder failed', error);
      setStatus('Složku se nepodařilo odstranit.', 'error');
    }
  }

  function getEditorPlainText() {
    if (!quill) return '';
    const text = quill.getText() || '';
    return text.replace(/\n+$/g, '').trim();
  }

  async function externalizeEmbeddedImages(delta, noteId) {
    if (!delta || !Array.isArray(delta.ops) || !delta.ops.length) {
      return { delta, changed: false };
    }

    const cache = new Map();
    const ops = [];
    let changed = false;

    for (const originalOp of delta.ops) {
      if (
        originalOp
        && typeof originalOp.insert === 'object'
        && originalOp.insert
        && typeof originalOp.insert.image === 'string'
      ) {
        const imageValue = originalOp.insert.image;
        if (/^data:image\//i.test(imageValue)) {
          let resolvedUrl = cache.get(imageValue);
          if (!resolvedUrl) {
            resolvedUrl = await uploadDataUrlImage(imageValue, noteId);
            cache.set(imageValue, resolvedUrl);
          }

          if (resolvedUrl !== imageValue) {
            changed = true;
          }

          const clonedInsert = { ...originalOp.insert, image: resolvedUrl };
          const clonedOp = {
            ...originalOp,
            insert: clonedInsert
          };
          ops.push(clonedOp);
          continue;
        }
      }

      ops.push(originalOp);
    }

    return { delta: { ops }, changed };
  }

  async function uploadDataUrlImage(dataUrl, noteId) {
    const parsed = dataUrlToBlob(dataUrl);
    if (!parsed || !firebaseReady() || !currentUser) {
      return dataUrl;
    }

    const { blob, contentType } = parsed;
    const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;

    const safeNoteId = noteId || 'draft';
    const extension = extractExtension(contentType);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const objectPath = `${NOTE_IMAGE_STORAGE_ROOT}/${currentUser.uid}/${safeNoteId}/${fileName}`;
    const storageRef = ref(storage, objectPath);

    await uploadBytes(storageRef, blob, { contentType });
    return getDownloadURL(storageRef);
  }

  function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return null;
    }

    const [meta, base64Payload] = dataUrl.split(',');
    if (!meta || !base64Payload) {
      return null;
    }

    const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
    if (!mimeMatch) {
      return null;
    }

    const contentType = mimeMatch[1];
    let binaryString;
    try {
      binaryString = atob(base64Payload);
    } catch (_) {
      return null;
    }

    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      blob: new Blob([bytes], { type: contentType }),
      contentType
    };
  }

  function extractExtension(contentType) {
    if (!contentType || typeof contentType !== 'string') {
      return 'png';
    }

    const subtype = contentType.split('/')[1] || 'png';
    return subtype.split('+')[0];
  }

  async function processSubmit() {
    if (!firebaseReady() || !currentUser) {
      setStatus('Nejprve se přihlas.', 'error');
      return;
    }
    if (!currentFolderId) {
      setStatus('Vyber složku.', 'error');
      return;
    }
    if (!ensureEditor()) return;
    if (detailMode === DETAIL_MODE.IDLE || isSaving) return;

    const delta = quill.getContents();
    const hasEmbeddedImages = Array.isArray(delta?.ops)
      && delta.ops.some((op) => typeof op.insert === 'object' && op.insert && op.insert.image);

    const contentPlain = getEditorPlainText();
    const context = lastSubmitContext || 'button';
    if (!contentPlain && !hasEmbeddedImages) {
      if (context === 'auto') {
        editorDirty = false;
        clearAutoSaveTimer();
        lastSubmitContext = null;
        return;
      }
      setStatus('Poznámka je prázdná.', 'error');
      lastSubmitContext = null;
      return;
    }

    const metadata = deriveMetadata(contentPlain);
    const { db, collection, doc } = window.firebase;
    const notesRef = collection(db, COLLECTION_ROOT, currentUser.uid, NOTE_COLLECTION);
    const noteRef = currentNoteId ? doc(notesRef, currentNoteId) : doc(notesRef);
    const noteId = noteRef.id;

    isSaving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = currentNoteId ? 'Ukládám změny…' : 'Ukládám…';
    }

    let normalizedDelta = delta;
    try {
      const normalization = await externalizeEmbeddedImages(delta, noteId);
      normalizedDelta = normalization.delta;
      if (normalization.changed && quill) {
        const selection = quill.getSelection();
        quill.setContents(normalizedDelta, 'silent');
        if (selection) {
          const index = typeof selection.index === 'number' ? selection.index : 0;
          const length = typeof selection.length === 'number' ? selection.length : 0;
          quill.setSelection(index, length, 'silent');
        }
      }
    } catch (error) {
      console.error('[Notes] image upload failed', error);
      setStatus('Obrázky se nepodařilo uložit.', 'error');
      isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = currentNoteId ? 'Uložit změny' : 'Uložit poznámku';
      }
      lastSubmitContext = null;
      return;
    }

    const richContent = normalizedDelta && Array.isArray(normalizedDelta.ops)
      ? { ops: normalizedDelta.ops }
      : null;

    let saveSuccessful = false;
    try {
      if (currentNoteId) {
        await updateExistingNote(noteRef, contentPlain, richContent, metadata);
      } else {
        await createNewNote(noteRef, contentPlain, richContent, metadata);
      }
      saveSuccessful = true;
    } finally {
      isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = currentNoteId ? 'Uložit změny' : 'Uložit poznámku';
      }
    }

    if (saveSuccessful) {
      updateLastSavedSnapshot(normalizedDelta);
      if (context === 'auto') {
        setStatus('Poznámka automaticky uložená.', 'success');
      }
    }
    lastSubmitContext = null;
  }

  async function createNewNote(noteRef, contentPlain, richContent, metadata) {
    if (!firebaseReady() || !currentUser || !noteRef) return;
    try {
      const { setDoc, serverTimestamp } = window.firebase;
      await setDoc(noteRef, {
        content: contentPlain,
        richContent,
        title: metadata.title,
        preview: metadata.preview,
        folderId: currentFolderId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      currentNoteId = noteRef.id;
      setDetailMode(DETAIL_MODE.EDITING);
      renderDetailMeta({ createdAt: new Date(), updatedAt: new Date() });
      setStatus('Poznámka uložená.', 'success');
    } catch (error) {
      console.error('[Notes] createNewNote failed', error);
      setStatus('Poznámku se nepodařilo uložit.', 'error');
    }
  }

  async function updateExistingNote(noteRef, contentPlain, richContent, metadata) {
    if (!firebaseReady() || !currentUser || !noteRef) return;
    try {
      const { updateDoc, serverTimestamp } = window.firebase;
      await updateDoc(noteRef, {
        content: contentPlain,
        richContent,
        title: metadata.title,
        preview: metadata.preview,
        folderId: currentFolderId,
        updatedAt: serverTimestamp()
      });
      setDetailMode(DETAIL_MODE.EDITING);
      setStatus('Poznámka upravená.', 'success');
    } catch (error) {
      console.error('[Notes] updateExistingNote failed', error);
      setStatus('Změnu se nepodařilo uložit.', 'error');
    }
  }

  async function deleteNote(noteId) {
    if (!firebaseReady() || !currentUser) return;
    if (!confirm('Opravdu smazat tuto poznámku?')) return;
    try {
      const { db, doc, deleteDoc } = window.firebase;
      const noteRef = doc(db, COLLECTION_ROOT, currentUser.uid, NOTE_COLLECTION, noteId);
      await deleteDoc(noteRef);
      currentNoteId = null;
      clearDetail();
      renderNotes();
      setStatus('Poznámka odstraněná.', 'success');
    } catch (error) {
      console.error('[Notes] deleteNote failed', error);
      setStatus('Poznámku se nepodařilo odstranit.', 'error');
    }
  }

  function switchFolder(folderId) {
    const normalized = folderId || null;
    if (normalized === currentFolderId) return;
    currentFolderId = normalized || defaultFolderId || null;
    currentNoteId = null;
    clearDetail();
    ensureFolderExpansion(currentFolderId);
    renderFolderTree();
    renderFolderHeader();
    setStatus('', 'neutral');
    subscribeNotes();
  }

  function attachAuthObserver() {
    if (!firebaseReady() || authUnsubscribe) return;
    const { auth, onAuthStateChanged } = window.firebase;
    authUnsubscribe = onAuthStateChanged(auth, (user) => {
      const previousUid = currentUser ? currentUser.uid : null;
      const nextUid = user ? user.uid : null;
      if (previousUid !== nextUid) {
        folders = [];
        notesCache = [];
        currentFolderId = null;
        defaultFolderId = null;
        pendingFolderId = null;
        currentNoteId = null;
        legacyMigrated = false;
        expandedFolders.clear();
        renderFolderTree();
        renderFolderHeader();
        renderNotes();
        clearDetail();
      }
      currentUser = user || null;
      updateAvailabilityState();
      if (activeView) {
        subscribeFolders();
      }
    });
  }

  function escapeHtml(value = '') {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function show() {
    ensureInitialized();
    const root = ensureRoot();
    if (!root) return;

    activeView = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('view-notes');
    ensureEditor();
    updateAvailabilityState();
    subscribeFolders();
    if (currentUser && currentFolderId) {
      subscribeNotes();
    }
  }

  function hide() {
    const root = ensureRoot();
    if (!root) return;
    activeView = false;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('view-notes');
    stopNotesSubscription();
    stopFolderSubscription();
  }

  function init() {
    ensureInitialized();
    const root = ensureRoot();
    if (!root) return;
    if (document.body.classList.contains('view-notes')) {
      show();
    } else {
      hide();
    }
  }

  return { init, show, hide };
})();

window.P73Notes = NotesApp;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.P73Notes?.init === 'function') {
    window.P73Notes.init();
  }
});
