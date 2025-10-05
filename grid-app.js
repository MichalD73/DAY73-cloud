// --- Topbar active link highlight (works when this file is standalone) ---
 (function(){
   function focusCalendarSection(){
     requestAnimationFrame(() => {
       const section = document.getElementById('calendar-section');
       if (!section) return;
       section.classList.add('calendar-focus');
       section.scrollIntoView({ behavior: 'smooth', block: 'start' });
       setTimeout(() => section.classList.remove('calendar-focus'), 1200);
     });
   }

   function handleViewChange({ shouldScroll = false } = {}){
     const params = new URLSearchParams(window.location.search);
     const view = params.get('view') || 'grid';
     document.querySelectorAll('[data-toplink]').forEach(link => {
       const target = link.getAttribute('data-toplink');
       link.classList.toggle('active', target === view);
     });
    document.body.classList.remove(
      'view-grid','view-snippets','view-calendar','view-deferred','view-assets','view-gallery','view-super-modul','view-goal-canvas','view-notes','view-manifest','view-banners','view-mobile','view-mindmap','view-dashboard'
    );
   if (view !== 'notes' && window.NotesView && typeof window.NotesView.hide === 'function') {
      window.NotesView.hide();
    }
  if (view !== 'manifest' && window.P73Manifest && typeof window.P73Manifest.hide === 'function') {
    window.P73Manifest.hide();
  }
  if (view !== 'banners' && window.P73Banners && typeof window.P73Banners.hide === 'function') {
    window.P73Banners.hide();
  }
  if (view !== 'mobile' && window.P73Mobile && typeof window.P73Mobile.hide === 'function') {
    window.P73Mobile.hide();
  }
  if (view !== 'mindmap' && window.P73Mindmap && typeof window.P73Mindmap.hide === 'function') {
    try {
      window.P73Mindmap.hide();
    } catch (mindmapHideErr) {
      console.warn('[P73] Mindmap hide() failed:', mindmapHideErr);
    }
  }

    if(view === 'dashboard') {
      document.body.classList.add('view-dashboard');
      const dashboardEl = document.getElementById('dashboard-view');
      if (dashboardEl) {
        dashboardEl.hidden = false;
        if (window.DashboardView && typeof window.DashboardView.init === 'function') {
          try {
            if (!window.DashboardView._initialized) {
              window.DashboardView.init();
              window.DashboardView._initialized = true;
            }
          } catch (dashboardErr) {
            console.warn('[P73] Dashboard module init() failed:', dashboardErr);
          }
        }
      }
    } else {
      const dashboardEl = document.getElementById('dashboard-view');
      if (dashboardEl) dashboardEl.hidden = true;
    }

    if(view === 'notes') {
      document.body.classList.add('view-notes');
      if (window.NotesView && typeof window.NotesView.show === 'function') {
        try {
          window.NotesView.show();
        } catch (notesErr) {
          console.warn('[P73] Notes module show() failed:', notesErr);
        }
      }
    }
    else if(view === 'manifest') {
      document.body.classList.add('view-manifest');
      if (window.P73Manifest && typeof window.P73Manifest.show === 'function') {
        try {
          window.P73Manifest.show();
        } catch (manifestErr) {
          console.warn('[P73] Manifest module show() failed:', manifestErr);
        }
      }
    }
    else if(view === 'banners') {
      document.body.classList.add('view-banners');
      if (window.P73Banners && typeof window.P73Banners.show === 'function') {
        try {
          window.P73Banners.show();
        } catch (bannersErr) {
          console.warn('[P73] Banners module show() failed:', bannersErr);
        }
      }
    }
    else if(view === 'mobile') {
      document.body.classList.add('view-mobile');
      if (window.P73Mobile && typeof window.P73Mobile.show === 'function') {
        try {
          window.P73Mobile.show();
        } catch (mobileErr) {
          console.warn('[P73] Mobile module show() failed:', mobileErr);
        }
      }
    }
    else if(view === 'mindmap') {
      document.body.classList.add('view-mindmap');
      if (window.P73Mindmap && typeof window.P73Mindmap.show === 'function') {
        try {
          window.P73Mindmap.show();
        } catch (mindmapErr) {
          console.warn('[P73] Mindmap module show() failed:', mindmapErr);
        }
      }
    }
    else if(view === 'snippets') {
      document.body.classList.add('view-snippets');
      scheduleSnippetLibraryInit();
    }
    else if(view === 'calendar') document.body.classList.add('view-calendar');
     else if(view === 'deferred') document.body.classList.add('view-deferred');
     else if(view === 'assets') document.body.classList.add('view-assets');
     else if(view === 'gallery') document.body.classList.add('view-gallery');
    else if(view === 'goal-canvas') document.body.classList.add('view-goal-canvas');

     if (view === 'goal-canvas') {
       ensureGoalCanvasModule(true);
     }
    else if(view === 'super-modul') document.body.classList.add('view-super-modul');
    else document.body.classList.add('view-grid');

    if (typeof window.__P73_handleViewWorkspace === 'function') {
      try {
        window.__P73_handleViewWorkspace(view);
      } catch (err) {
        console.warn('[P73] handleViewChange workspace hook failed:', err);
      }
    }

    if(shouldScroll){ window.scrollTo({ top:0, behavior:'smooth'}); }
  }

   window.addEventListener('popstate', () => handleViewChange({ shouldScroll: true }));
   handleViewChange({ shouldScroll: true });

   const calendarNav = document.querySelector('[data-toplink="calendar"]');
   if (calendarNav){
     calendarNav.addEventListener('click', (event) => {
       event.preventDefault();
       const url = new URL(window.location.href);
       url.searchParams.set('view', 'calendar');
       const nextUrl = `${url.pathname}?${url.searchParams.toString()}#calendar`;
       window.history.pushState({}, '', nextUrl);
       handleViewChange({ shouldScroll: true });
     });
   }
 })();

const SNIPPET_COLLECTION_ROOT = 'project73-snippets';
const SNIPPET_SUBCOLLECTION = 'items';
let snippetLibraryData = [];
let snippetFilterQuery = '';
let snippetLibraryInitialized = false;
let snippetLibraryLoading = false;
let snippetLibraryUnsubscribe = null;
let snippetLibraryError = null;
let snippetInitQueued = false;

function scheduleSnippetLibraryInit() {
  if (snippetLibraryInitialized) {
    initSnippetLibrary();
    return;
  }

  const runInit = () => {
    snippetInitQueued = false;
    try {
      initSnippetLibrary();
    } catch (error) {
      console.error('SnippetLibrary: init failed', error);
    }
  };

  if (document.readyState === 'loading') {
    if (snippetInitQueued) return;
    snippetInitQueued = true;
    document.addEventListener('DOMContentLoaded', runInit, { once: true });
    return;
  }

  if (snippetInitQueued) return;
  snippetInitQueued = true;
  const raf = window.requestAnimationFrame || function(cb){ return window.setTimeout(cb, 0); };
  raf(runInit);
}

const GOAL_CANVAS_ROOT = 'project73_goal_canvas';
const GOAL_CANVAS_SUBCOLLECTION = 'items';
const BOX_COLOR_PRESETS = {
  blue: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  purple: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)',
  green: 'linear-gradient(135deg, #f1f8e9 0%, #aed581 100%)',
  orange: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
  pink: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%)'
};
let goalCanvasInitialized = false;
let goalCanvasUnsubscribe = null;
let goalCanvasItems = [];
let goalCanvasSurfaceEl = null;
let goalCanvasEmptyEl = null;
let goalCanvasAddBtn = null;
let goalCanvasDragState = null;
let goalCanvasScrollEl = null;
let goalCanvasZoomLabelEl = null;
let goalCanvasZoomOutBtn = null;
let goalCanvasZoomInBtn = null;
let goalCanvasBadgeCallable = null;
const GOAL_CANVAS_ZOOM_LEVELS = [
  { id: 'overview', label: '50%', scale: 0.5 },
  { id: 'default', label: '100%', scale: 1 },
  { id: 'focus', label: '160%', scale: 1.6 }
];
const GOAL_CANVAS_ZOOM_STORAGE_KEY = 'p73:goalCanvasZoom';
let goalCanvasZoomIndex = 1;
const GOAL_CANVAS_BASE_WIDTH = 2600;
const GOAL_CANVAS_BASE_HEIGHT = 2000;
const GOAL_CANVAS_MARGIN = 360;
const GOAL_CANVAS_PADDING_PX = 120;
const GOAL_CARD_DIMENSIONS = {
  small: { width: 220, height: 180 },
  medium: { width: 280, height: 220 },
  large: { width: 340, height: 260 }
};
let navColorPanelEl = null;
let navColorSwatchesEl = null;
let navColorTitleInput = null;
let navColorApplyBtn = null;
let navColorClearBtn = null;
let navColorSelectedKey = null;
let detailColorGridEl = null;
let detailColorClearBtn = null;

 function detachSnippetLibraryListener() {
   if (typeof snippetLibraryUnsubscribe === 'function') {
     try { snippetLibraryUnsubscribe(); } catch (_) {}
   }
   snippetLibraryUnsubscribe = null;
 }

 function getUserSnippetCollection() {
   if (!isFirebaseReady || !currentUser) return null;
   const { db, collection } = window.firebase;
   return collection(db, SNIPPET_COLLECTION_ROOT, currentUser.uid, SNIPPET_SUBCOLLECTION);
 }

 function sanitizeFileName(name = '') {
   return name.toLowerCase().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'screenshot.png';
 }

 function uploadSnippetThumbnailFile(file, onProgress) {
   return new Promise((resolve, reject) => {
     if (!file) {
       reject(new Error('Soubor nebyl vybrán'));
       return;
     }
     if (!window.firebase || !window.firebase.storage) {
       reject(new Error('Firebase není inicializováno'));
       return;
     }
     if (!currentUser || !currentUser.uid) {
       reject(new Error('Pro nahrání se přihlaste')); 
       return;
     }

     const { storage, ref, uploadBytesResumable, getDownloadURL } = window.firebase;
     const uid = currentUser.uid;
     const extension = (file.type && file.type.includes('/')) ? file.type.split('/')[1] : 'png';
     const baseName = sanitizeFileName(file.name || `printscreen.${extension}`);
     const storagePath = `project73-snippet-thumbnails/${uid}/${Date.now()}-${baseName}`;
     const storageRef = ref(storage, storagePath);
     const metadata = { contentType: file.type || 'image/png' };
     const uploadTask = uploadBytesResumable(storageRef, file, metadata);

     uploadTask.on('state_changed', (snapshot) => {
       if (typeof onProgress === 'function' && snapshot.totalBytes > 0) {
         const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
         onProgress(progress);
       }
     }, (error) => {
       reject(error);
     }, async () => {
       try {
         const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
         resolve({ url: downloadURL, storagePath });
       } catch (error) {
         reject(error);
       }
     });
   });
   refreshWorkspaceToolbar();
 }

function renderSnippetLibrary() {
  const listEl = document.getElementById('snippet-list');
  const emptyEl = document.getElementById('snippet-empty');
  const countEl = document.getElementById('snippet-count');
  if (!listEl || !emptyEl || !countEl) return;

   if (!isFirebaseReady || !currentUser) {
     countEl.textContent = '0';
     listEl.innerHTML = '';
     listEl.style.display = 'none';
     emptyEl.textContent = 'Přihlaste se pro ukládání kódů.';
     emptyEl.style.display = 'block';
     return;
   }

   if (snippetLibraryLoading) {
     countEl.textContent = snippetLibraryData.length.toString();
     listEl.innerHTML = '';
     listEl.style.display = 'none';
     emptyEl.textContent = 'Načítám kódy z databáze...';
     emptyEl.style.display = 'block';
     return;
   }

   if (snippetLibraryError) {
     countEl.textContent = snippetLibraryData.length.toString();
     listEl.innerHTML = '';
     listEl.style.display = 'none';
     emptyEl.textContent = 'Nepodařilo se načíst kódy. Zkuste to prosím znovu.';
     emptyEl.style.display = 'block';
     return;
   }

   const query = snippetFilterQuery.trim().toLowerCase();
   const filtered = query
     ? snippetLibraryData.filter((snippet) => {
         const haystack = `${snippet.title} ${snippet.description || ''}`.toLowerCase();
         return haystack.includes(query);
       })
     : [...snippetLibraryData];

   countEl.textContent = snippetLibraryData.length.toString();
   listEl.innerHTML = '';

   if (filtered.length === 0) {
     emptyEl.textContent = snippetLibraryData.length === 0
       ? 'Žádné kódy zatím nejsou uložené. Přidej první pomocí formuláře výše.'
       : 'Žádný kód neodpovídá filtru. Změň hledání nebo přidej nový.';
     emptyEl.style.display = 'block';
     listEl.style.display = 'none';
     return;
   }

   emptyEl.style.display = 'none';
   listEl.style.display = 'grid';

   filtered.forEach((snippet) => {
     const card = document.createElement('article');
     card.className = 'snippet-card';
     card.dataset.snippetId = snippet.id;

     const thumb = document.createElement('div');
     thumb.className = 'snippet-card-thumb';
     if (snippet.thumbnailUrl) {
       const img = document.createElement('img');
       img.src = snippet.thumbnailUrl;
       img.alt = snippet.title;
       thumb.appendChild(img);
     } else {
       thumb.textContent = '🧩';
     }
     card.appendChild(thumb);

     const body = document.createElement('div');
     body.className = 'snippet-card-body';

     const title = document.createElement('h4');
     title.className = 'snippet-card-title';
     title.textContent = snippet.title;
     body.appendChild(title);

     if (snippet.description) {
       const desc = document.createElement('p');
       desc.className = 'snippet-card-description';
       desc.textContent = snippet.description;
       body.appendChild(desc);
     }

     const meta = document.createElement('div');
     meta.className = 'snippet-card-meta';
     if (snippet.createdAt instanceof Date && !Number.isNaN(snippet.createdAt.valueOf())) {
       meta.textContent = `Uloženo ${snippet.createdAt.toLocaleString('cs-CZ')}`;
     } else if (typeof snippet.createdAt === 'string' && snippet.createdAt) {
       meta.textContent = `Uloženo ${snippet.createdAt}`;
     } else {
       meta.textContent = 'Uloženo —';
     }
     body.appendChild(meta);

     const code = document.createElement('pre');
     code.className = 'snippet-code';
     code.textContent = snippet.code;
     body.appendChild(code);

     const actions = document.createElement('div');
     actions.className = 'snippet-card-actions';

     const copyBtn = document.createElement('button');
     copyBtn.type = 'button';
     copyBtn.className = 'snippet-button-copy';
     copyBtn.dataset.snippetAction = 'copy';
     copyBtn.textContent = 'Kopírovat kód';
     actions.appendChild(copyBtn);

     const deleteBtn = document.createElement('button');
     deleteBtn.type = 'button';
     deleteBtn.className = 'snippet-button-delete';
     deleteBtn.dataset.snippetAction = 'delete';
     deleteBtn.textContent = 'Smazat';
     actions.appendChild(deleteBtn);

     body.appendChild(actions);
     card.appendChild(body);

     listEl.appendChild(card);
   });
 }

 function attachSnippetRealtimeListener() {
   const collectionRef = getUserSnippetCollection();
   if (!collectionRef) {
     detachSnippetLibraryListener();
     snippetLibraryData = [];
     snippetLibraryLoading = false;
     snippetLibraryError = null;
     renderSnippetLibrary();
     return;
   }

   const { query, orderBy, onSnapshot } = window.firebase;
   detachSnippetLibraryListener();
   snippetLibraryLoading = true;
   snippetLibraryError = null;
   renderSnippetLibrary();

   try {
     const q = query(collectionRef, orderBy('createdAt', 'desc'));
     snippetLibraryUnsubscribe = onSnapshot(q, (snapshot) => {
       snippetLibraryLoading = false;
       snippetLibraryError = null;
       snippetLibraryData = snapshot.docs.map((docSnap) => {
         const data = docSnap.data() || {};
         let createdAt = null;
         const rawCreated = data.createdAt;
         if (rawCreated && typeof rawCreated.toDate === 'function') {
           createdAt = rawCreated.toDate();
         } else if (rawCreated) {
           createdAt = new Date(rawCreated);
         }
         return {
           id: docSnap.id,
           title: data.title || '',
           description: data.description || '',
           code: data.code || '',
           thumbnailUrl: data.thumbnailUrl || '',
           thumbnailStoragePath: data.thumbnailStoragePath || '',
           createdAt,
           authorId: data.authorId || currentUser?.uid || ''
         };
       });
       if (snippetLibraryData.length > 1) {
         snippetLibraryData.sort((a, b) => {
           const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
           const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
           return bTime - aTime;
         });
       }
       renderSnippetLibrary();
     }, (error) => {
       console.error('SnippetLibrary: realtime listener error', error);
       snippetLibraryLoading = false;
       snippetLibraryError = error || new Error('Neznámá chyba');
       renderSnippetLibrary();
     });
   } catch (error) {
     console.error('SnippetLibrary: failed to attach listener', error);
     snippetLibraryLoading = false;
     snippetLibraryError = error;
     renderSnippetLibrary();
   }
}

function initSnippetLibrary() {
  if (snippetLibraryInitialized) {
    attachSnippetRealtimeListener();
    renderSnippetLibrary();
    return;
  }

  const form = document.getElementById('snippet-form');
  const resetBtn = document.getElementById('snippet-reset');
  const searchInput = document.getElementById('snippet-search');
  const listEl = document.getElementById('snippet-list');
   const thumbnailUrlInput = document.getElementById('snippet-thumbnail');
   const fileInput = document.getElementById('snippet-thumbnail-file');
   const selectBtn = document.getElementById('snippet-upload-select');
   const clearBtn = document.getElementById('snippet-upload-clear');
   const statusEl = document.getElementById('snippet-upload-status');
   const previewEl = document.getElementById('snippet-upload-preview');

  if (!form || !listEl || !searchInput || !thumbnailUrlInput || !fileInput || !selectBtn || !clearBtn || !statusEl || !previewEl) {
    console.warn('SnippetLibrary: UI elements missing, initialization skipped.');
    return;
  }

  snippetLibraryInitialized = true;

   let snippetThumbnailUploadInfo = null;
   let snippetThumbnailPreviewUrl = null;
   let snippetThumbnailUploading = false;

   const updateStatus = (text, color = '#6b7280') => {
     statusEl.textContent = text;
     statusEl.style.color = color;
   };

   const resetThumbnailPreview = () => {
     snippetThumbnailUploadInfo = null;
     if (snippetThumbnailPreviewUrl) {
       URL.revokeObjectURL(snippetThumbnailPreviewUrl);
       snippetThumbnailPreviewUrl = null;
     }
     previewEl.innerHTML = 'Bez náhledu';
     updateStatus('Soubor nevybrán');
     fileInput.value = '';
   };

   const setPreviewImage = (file) => {
     if (!file) {
       resetThumbnailPreview();
       return;
     }
     if (snippetThumbnailPreviewUrl) {
       URL.revokeObjectURL(snippetThumbnailPreviewUrl);
     }
     snippetThumbnailPreviewUrl = URL.createObjectURL(file);
     previewEl.innerHTML = '';
     const img = document.createElement('img');
     img.src = snippetThumbnailPreviewUrl;
     img.alt = 'Náhled snippetu';
     previewEl.appendChild(img);
   };

   const showPreviewFromUrl = (url) => {
     if (snippetThumbnailPreviewUrl) {
       URL.revokeObjectURL(snippetThumbnailPreviewUrl);
       snippetThumbnailPreviewUrl = null;
     }
     if (!url) {
       resetThumbnailPreview();
       return;
     }
     snippetThumbnailUploadInfo = null;
     previewEl.innerHTML = '';
     const img = document.createElement('img');
     img.alt = 'Náhled snippetu';
     img.src = url;
     img.onload = () => updateStatus('Náhled z URL', '#6b7280');
     img.onerror = () => {
       updateStatus('URL náhledu se nepodařilo načíst.', '#dc2626');
       previewEl.innerHTML = 'Bez náhledu';
     };
     previewEl.appendChild(img);
   };

   const handleThumbnailFile = async (file) => {
     if (!file) {
       return;
     }
     if (!isFirebaseReady || !currentUser) {
       updateStatus('Přihlas se pro nahrání náhledu.', '#dc2626');
       showBanner('Pro nahrání printscreenů je nutné být přihlášen.', 'error');
       return;
     }

     setPreviewImage(file);
     snippetThumbnailUploading = true;
     selectBtn.disabled = true;
     clearBtn.disabled = true;
     updateStatus('Nahrávání... 0%', '#2563eb');

     try {
       const result = await uploadSnippetThumbnailFile(file, (progress) => {
         updateStatus(`Nahrávání... ${progress}%`, '#2563eb');
       });
       snippetThumbnailUploadInfo = result;
       thumbnailUrlInput.value = result.url;
       updateStatus('Náhled úspěšně nahrán ✓', '#047857');
     } catch (error) {
       console.error('SnippetLibrary: upload failed', error);
       updateStatus('Chyba při nahrávání.', '#dc2626');
       showBanner('Nahrání obrázku se nezdařilo.', 'error');
       resetThumbnailPreview();
     } finally {
       snippetThumbnailUploading = false;
       selectBtn.disabled = false;
       clearBtn.disabled = false;
     }
   };

   selectBtn.addEventListener('click', () => {
     if (snippetThumbnailUploading) return;
     fileInput.click();
   });

   clearBtn.addEventListener('click', () => {
     resetThumbnailPreview();
     thumbnailUrlInput.value = '';
   });

   fileInput.addEventListener('change', () => {
     const file = fileInput.files && fileInput.files[0];
     if (file) {
       handleThumbnailFile(file);
     } else {
       resetThumbnailPreview();
     }
   });

   const handleThumbnailUrlChange = () => {
     if (snippetThumbnailUploading) return;
     const url = thumbnailUrlInput.value.trim();
     if (!url) {
       resetThumbnailPreview();
       return;
     }
     showPreviewFromUrl(url);
   };

   thumbnailUrlInput.addEventListener('change', handleThumbnailUrlChange);
   thumbnailUrlInput.addEventListener('blur', handleThumbnailUrlChange);

   resetThumbnailPreview();

   const submitBtn = form.querySelector('button[type="submit"]');

   form.addEventListener('submit', async (event) => {
     event.preventDefault();
     const title = form.elements.title?.value?.trim() || '';
     const description = form.elements.description?.value?.trim() || '';
     const code = form.elements.code?.value?.trim() || '';
     const thumbnailUrl = form.elements.thumbnailUrl?.value?.trim() || '';

     if (!title || !code) {
       alert('Vyplň název i kód.');
       return;
     }
     if (snippetThumbnailUploading) {
       alert('Počkej, než se dokončí nahrávání náhledu.');
       return;
     }
     if (!isFirebaseReady || !currentUser) {
       showBanner('Pro ukládání kódů se nejprve přihlaste.', 'error');
       return;
     }

     const collectionRef = getUserSnippetCollection();
     if (!collectionRef) {
       showBanner('Databáze není připravena. Zkuste to prosím znovu.', 'error');
       return;
     }

     const { addDoc, serverTimestamp } = window.firebase;
     const payload = {
       title,
       description,
       code,
       thumbnailUrl,
       thumbnailStoragePath: snippetThumbnailUploadInfo?.storagePath || '',
       authorId: currentUser.uid,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
     };

     snippetFilterQuery = '';
     searchInput.value = '';

     let prevText = null;
     if (submitBtn) {
       prevText = submitBtn.textContent;
       submitBtn.disabled = true;
       submitBtn.textContent = 'Ukládám...';
     }

     try {
       await addDoc(collectionRef, payload);
       form.reset();
       resetThumbnailPreview();
       showBanner('Kód byl uložen.', 'info');
     } catch (error) {
       console.error('SnippetLibrary: save failed', error);
       showBanner('Kód se nepodařilo uložit.', 'error');
     } finally {
       if (submitBtn) {
         submitBtn.disabled = false;
         submitBtn.textContent = prevText || 'Uložit kód';
       }
     }
   });

   if (resetBtn) {
     resetBtn.addEventListener('click', () => {
       form.reset();
       const titleInput = document.getElementById('snippet-title');
       if (titleInput) titleInput.focus();
       resetThumbnailPreview();
     });
   }

   searchInput.addEventListener('input', (event) => {
     snippetFilterQuery = event.target.value || '';
     renderSnippetLibrary();
   });

   listEl.addEventListener('click', async (event) => {
     const actionBtn = event.target.closest('[data-snippet-action]');
     if (!actionBtn) return;
     const card = actionBtn.closest('[data-snippet-id]');
     if (!card) return;
     const snippetId = card.dataset.snippetId;
     const snippet = snippetLibraryData.find((item) => item.id === snippetId);
     if (!snippet) return;

     const action = actionBtn.dataset.snippetAction;
     if (action === 'copy') {
       try {
         await navigator.clipboard.writeText(snippet.code);
         const original = actionBtn.textContent;
         actionBtn.textContent = '✓ Zkopírováno';
         actionBtn.disabled = true;
         setTimeout(() => {
           if (!actionBtn.isConnected) return;
           actionBtn.textContent = original;
           actionBtn.disabled = false;
         }, 2000);
       } catch (error) {
         console.error('SnippetLibrary: copy failed', error);
         alert('Nepodařilo se zkopírovat kód.');
       }
     }

     if (action === 'delete') {
       if (!isFirebaseReady || !currentUser) {
         showBanner('Pro mazání kódů se nejprve přihlaste.', 'error');
         return;
       }
       const confirmed = confirm('Opravdu odstranit tento kód?');
       if (!confirmed) return;
       try {
         const { db, doc, deleteDoc, ref, deleteObject } = window.firebase;
         const docRef = doc(db, SNIPPET_COLLECTION_ROOT, currentUser.uid, SNIPPET_SUBCOLLECTION, snippetId);
         await deleteDoc(docRef);
         if (snippet.thumbnailStoragePath) {
           try {
             await deleteObject(ref(window.firebase.storage, snippet.thumbnailStoragePath));
           } catch (storageErr) {
             console.debug('SnippetLibrary: storage delete skipped', storageErr);
           }
         }
         showBanner('Kód byl odebrán.', 'info');
       } catch (error) {
         console.error('SnippetLibrary: delete failed', error);
         showBanner('Kód se nepodařilo odstranit.', 'error');
       }
     }
   });
   // ================================================
   // Clipboard Paste (image -> dataURL preview + storage)
   // ================================================
   const pasteAllowedTags = new Set(['INPUT','TEXTAREA']);
   document.addEventListener('paste', async (e) => {
     const wrapper = document.getElementById('snippet-library-view');
     if (!wrapper) return;
     // Viditelnost: kontrolujeme display / offsetParent místo pouze class.
     const isVisible = wrapper.offsetParent !== null || document.body.classList.contains('view-snippets');
     if (!isVisible) return;
     if (!e.clipboardData) return;
     console.debug('[PasteHandler] Paste event detected, analyzing clipboard items...');
     // Informativní status, pokud ještě nic neprobíhá
     if (!snippetThumbnailUploading) {
       updateStatus('Analyzuji clipboard…', '#6b7280');
     }
     const active = document.activeElement;
     // Pokud fokus není ve formuláři ani inputu, ale jsme ve viditelné sekci, dovolíme vložení.
     if (active && active !== document.body) {
       // pass – neblokujeme, jen info
     } else {
       // Auto-focus title field for convenience
       const titleInput = document.getElementById('snippet-title');
       if (titleInput) titleInput.focus();
     }
     const items = Array.from(e.clipboardData.items || []);
     let imgItem = items.find(i => i.type && i.type.startsWith('image/'));
     // Fallback: některé aplikace vkládají image jako image/png; to už pokrývá startsWith
     // Pokud nic nenalezeno, zkusíme asynchronous clipboard API (Chromium-based)
     if (!imgItem && navigator.clipboard && navigator.clipboard.read) {
       try {
         console.debug('[PasteHandler] Trying navigator.clipboard.read() fallback');
         const clipboardItems = await navigator.clipboard.read();
         for (const ci of clipboardItems) {
           for (const type of ci.types) {
             if (type.startsWith('image/')) {
               const blob = await ci.getType(type);
               imgItem = { getAsFile: () => blob, type };
               break;
             }
           }
           if (imgItem) break;
         }
       } catch (err) {
         console.debug('[PasteHandler] navigator.clipboard.read() failed', err);
       }
     }
     if (!imgItem) {
       updateStatus('Clipboard neobsahuje obrázek. (Použij PrintScreen nebo zkopíruj obrázek)', '#dc2626');
       const zoneNF = document.getElementById('snippet-paste-drop-zone');
       if (zoneNF){
         zoneNF.classList.add('active');
         setTimeout(()=> zoneNF.classList.remove('active'), 800);
       }
       return;
     }
     const file = imgItem.getAsFile();
     if (!file) return;
     // Pokud už probíhá upload do cloudu, nechceme zasahovat
     if (snippetThumbnailUploading) return;
     // Pokud je uživatel přihlášen a Firebase připravené -> rovnou upload jako u file inputu
     if (isFirebaseReady && currentUser) {
       updateStatus('Uploaduji vložený printscreen...', '#2563eb');
       handleThumbnailFile(file); // využije existující workflow (progress, preview, URL)
     } else {
       const reader = new FileReader();
       updateStatus('Zpracovávám vložený obrázek (lokálně)...', '#2563eb');
       reader.onload = () => {
         snippetThumbnailUploadInfo = null; // dataURL lokální
         const dataUrl = reader.result;
         thumbnailUrlInput.value = dataUrl;
         if (snippetThumbnailPreviewUrl) {
           URL.revokeObjectURL(snippetThumbnailPreviewUrl);
           snippetThumbnailPreviewUrl = null;
         }
         previewEl.innerHTML = '';
         const img = document.createElement('img');
         img.alt = 'Náhled (vložený)';
         img.src = dataUrl;
         previewEl.appendChild(img);
         updateStatus('Náhled vložen lokálně ✓ (přihlas se pro upload)', '#047857');
         console.debug('[PasteHandler] Image pasted (local), data URL length:', (dataUrl||'').length);
         const zone = document.getElementById('snippet-paste-drop-zone');
         if (zone){
           zone.classList.add('active');
           setTimeout(()=> zone.classList.remove('active'), 1200);
         }
       };
       reader.onerror = () => updateStatus('Chyba při čtení vloženého obrázku.', '#dc2626');
       reader.readAsDataURL(file);
     }
   });

   // Drag & Drop support for paste/drop zone
   const pasteZone = document.getElementById('snippet-paste-drop-zone');
   if (pasteZone){
     ['dragenter','dragover'].forEach(evt => pasteZone.addEventListener(evt, (e)=>{
       e.preventDefault(); e.stopPropagation();
       pasteZone.classList.add('active');
     }));
     ['dragleave','dragend','drop'].forEach(evt => pasteZone.addEventListener(evt, (e)=>{
       if (evt !== 'drop'){ pasteZone.classList.remove('active'); }
     }));
     pasteZone.addEventListener('drop',(e)=>{
       e.preventDefault();
       pasteZone.classList.remove('active');
       const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
       if (file && file.type.startsWith('image/')){
         handleThumbnailFile(file); // využijeme stávající upload + preview logiku
       }
     });
     pasteZone.addEventListener('click', () => {
       const titleInput = document.getElementById('snippet-title');
       if (titleInput) titleInput.focus();
     });
   }

  attachSnippetRealtimeListener();
 renderSnippetLibrary();
}

function setupNavIconActions(){
 initDetailColorControls();
 const navIconsEl = document.getElementById('nav-icons');
 if (!navIconsEl) return;

 navColorPanelEl = document.getElementById('nav-color-panel');
 navColorSwatchesEl = document.getElementById('nav-color-swatches');
 navColorTitleInput = document.getElementById('nav-color-title-input');
 navColorApplyBtn = document.getElementById('nav-color-apply');
 navColorClearBtn = document.getElementById('nav-color-clear');

 if (navColorSwatchesEl) {
   navColorSwatchesEl.innerHTML = Object.entries(BOX_COLOR_PRESETS)
     .map(([key, style]) => `<button type="button" class="nav-color-swatch" data-color-option="${key}" style="background:${style};"></button>`)
     .join('');
 }

 navIconsEl.addEventListener('click', (event) => {
   const icon = event.target.closest('.nav-icon');
   if (!icon) return;
   const action = icon.dataset.action;
   if (!action) return;

   const navPosition = navIconsEl.dataset.position;
   const fallbackPosition = activeBox?.dataset?.position;
   const position = navPosition || fallbackPosition;
   if (!position) {
     showBanner('Vyber box v mřížce.', 'error');
     return;
   }

   if (action === 'color') {
     openNavColorPanel(position);
     return;
   }

   closeNavColorPanel();
   handleNavAction(action, position);
 });

 navIconsEl.addEventListener('mouseenter', cancelNavIconsAutohide);
 navIconsEl.addEventListener('mouseleave', startNavIconsAutohide);

 navColorPanelEl?.addEventListener('click', (event) => {
   const swatch = event.target.closest('[data-color-option]');
   if (swatch) {
     const selectedKey = swatch.dataset.colorOption;
     selectNavColorOption(selectedKey);
     const position = navColorPanelEl?.dataset.position;
     if (position) {
       applyColorToPosition(position, navColorSelectedKey, navColorTitleInput?.value || '');
     }
     return;
   }
 });

 navColorTitleInput?.addEventListener('keydown', (event) => {
   if (event.key === 'Enter') {
     event.preventDefault();
     triggerNavColorApply();
   }
 });

 navColorApplyBtn?.addEventListener('click', triggerNavColorApply);
 navColorClearBtn?.addEventListener('click', () => {
   const position = navColorPanelEl?.dataset.position;
   if (!position) return;
   selectNavColorOption(null);
   applyColorToPosition(position, null, navColorTitleInput?.value || '');
 });

 document.addEventListener('click', (event) => {
   if (!navColorPanelEl || navColorPanelEl.hidden) return;
   if (navColorPanelEl.contains(event.target)) return;
   if (event.target.closest('[data-action="color"]')) return;
   closeNavColorPanel();
 });
}

function triggerNavColorApply(){
 const position = navColorPanelEl?.dataset.position;
 if (!position) return;
 applyColorToPosition(position, navColorSelectedKey, navColorTitleInput?.value || '');
}

function openNavColorPanel(position){
 const navIconsEl = document.getElementById('nav-icons');
 if (!navIconsEl || !navColorPanelEl) return;
 const box = document.querySelector(`[data-position="${position}"]`);
 if (!box) {
   showBanner('Box se nepodařilo najít.', 'error');
   return;
 }

 cancelNavIconsAutohide();
 navIconsEl.dataset.position = position;
 navColorPanelEl.dataset.position = position;

 const existingData = gridDataCache[position] || {};
 const badgeEl = box.querySelector('.box-title-badge');
 const currentTitle = existingData.text || box.dataset.title || (badgeEl?.textContent || '');
 if (navColorTitleInput) navColorTitleInput.value = currentTitle;

 const currentColorKey = getColorKeyFromStyle(existingData.colorStyle);
 selectNavColorOption(currentColorKey);

 navColorPanelEl.hidden = false;
 navColorPanelEl.classList.add('active');
}

function closeNavColorPanel(){
 if (!navColorPanelEl) return;
 navColorPanelEl.hidden = true;
 navColorPanelEl.classList.remove('active');
 navColorPanelEl.dataset.position = '';
 navColorSelectedKey = null;
 if (navColorSwatchesEl) {
   navColorSwatchesEl.querySelectorAll('.nav-color-swatch.active').forEach((swatch) => swatch.classList.remove('active'));
 }
}

function selectNavColorOption(colorKey){
 navColorSelectedKey = colorKey || null;
 if (!navColorSwatchesEl) return;
 navColorSwatchesEl.querySelectorAll('.nav-color-swatch').forEach((swatch) => {
   swatch.classList.toggle('active', swatch.dataset.colorOption === navColorSelectedKey);
 });
}

function getColorKeyFromStyle(style){
 if (!style) return null;
 const normalized = style.replace(/\s+/g, ' ');
 for (const [key, preset] of Object.entries(BOX_COLOR_PRESETS)) {
   if (preset.replace(/\s+/g, ' ') === normalized) return key;
 }
 return null;
}

function parseBulkLinkLine(line){
  if (!line) return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  const separatorMatch = trimmed.match(/^(.+?)\s*(?:\||:)\s*(https?:\/\/\S+)\s*$/i);
  if (separatorMatch) {
    return {
      label: separatorMatch[1].trim(),
      url: separatorMatch[2].trim()
    };
  }

  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (!urlMatch) return null;
  const url = urlMatch[0].trim();
  const labelPart = trimmed.slice(0, urlMatch.index).replace(/[|:]+$/, '').trim();
  return {
    label: labelPart,
    url
  };
}

function parseBulkLinksInput(rawText){
  const lines = rawText.split(/\r?\n/);
  const entries = [];
  let invalid = 0;
  lines.forEach((line) => {
    const parsed = parseBulkLinkLine(line);
    if (parsed) {
      entries.push(parsed);
    } else if (line.trim()) {
      invalid += 1;
    }
  });
  return { entries, invalid };
}

function initDetailColorControls(){
  detailColorGridEl = document.getElementById('detail-color-grid');
  detailColorClearBtn = document.getElementById('detail-color-clear');
  if (!detailColorGridEl || detailColorGridEl.dataset.ready === '1') return;

  detailColorGridEl.innerHTML = '';
  Object.entries(BOX_COLOR_PRESETS).forEach(([key, style]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'detail-color-swatch';
    btn.dataset.colorOption = key;
    btn.style.background = style;
    detailColorGridEl.appendChild(btn);
  });

  detailColorGridEl.addEventListener('click', handleDetailColorClick);
  if (detailColorClearBtn) {
    detailColorClearBtn.addEventListener('click', handleDetailColorClear);
  }

  detailColorGridEl.dataset.ready = '1';
}

function handleDetailColorClick(event){
  const target = event.target.closest('[data-color-option]');
  if (!target || !currentBoxDetails?.position) return;
  event.preventDefault();
  const titleInput = document.getElementById('box-title-input');
  const rawTitle = titleInput ? titleInput.value : '';
  applyColorToPosition(currentBoxDetails.position, target.dataset.colorOption, rawTitle);
}

function handleDetailColorClear(event){
  if (!currentBoxDetails?.position) return;
  event.preventDefault();
  const titleInput = document.getElementById('box-title-input');
  const rawTitle = titleInput ? titleInput.value : '';
  applyColorToPosition(currentBoxDetails.position, null, rawTitle);
}

function updateDetailColorUI(position, boxData = {}){
  if (!detailColorGridEl || !currentBoxDetails || currentBoxDetails.position !== position) return;
  const activeKey = boxData && boxData.hasColor ? getColorKeyFromStyle(boxData.colorStyle) : null;
  detailColorGridEl.querySelectorAll('[data-color-option]').forEach((swatch) => {
    swatch.classList.toggle('is-active', swatch.dataset.colorOption === activeKey);
  });
  if (detailColorClearBtn) {
    detailColorClearBtn.classList.toggle('is-active', !activeKey);
  }
}

async function applyColorToPosition(position, colorKey, rawTitle){
 if (!isFirebaseReady || !gridDocRef || !currentUser) {
   showBanner('Počkej, než se připojí Firebase a přihlášení.', 'error');
   return;
 }

 const box = document.querySelector(`[data-position="${position}"]`);
 if (!box) {
   showBanner('Box se nepodařilo najít.', 'error');
   return;
 }

 navColorSelectedKey = colorKey || null;

 const existingData = gridDataCache[position] ? { ...gridDataCache[position] } : {};
 const colorStyle = colorKey ? BOX_COLOR_PRESETS[colorKey] : '';
 const hasColor = !!colorStyle;

 const currentBgImage = box.style.backgroundImage || '';
 const hasCssImage = currentBgImage && currentBgImage !== 'none' && !currentBgImage.includes('gradient(');
 const hasImageContent = (existingData.hasImage && existingData.imageUrl) || hasCssImage;
 if (hasColor && hasImageContent) {
   showBanner('Nejdřív odeber obrázek, potom můžeš použít barevné pozadí.', 'error');
   return;
 }

 const trimmedTitle = (rawTitle || '').trim();
 const hasText = trimmedTitle.length > 0;

 const updatePayload = {
   hasColor,
   colorStyle: colorStyle || '',
   hasImage: false,
   imageUrl: '',
   hasText,
   text: hasText ? trimmedTitle : ''
 };

 try {
   await updateBoxDataInFirestore(position, updatePayload);
   const mergedData = { ...existingData, ...updatePayload };
   if (!hasColor) {
     mergedData.hasColor = false;
     mergedData.colorStyle = '';
   }
   if (!hasText) {
     mergedData.hasText = false;
     mergedData.text = '';
   }
  mergedData.hasImage = false;
  mergedData.imageUrl = '';
 applySingleBoxData(box, mergedData);
 gridDataCache[position] = mergedData;
 if (currentBoxDetails && currentBoxDetails.position === position) {
   currentBoxDetails.data = { ...currentBoxDetails.data, ...mergedData };
   updateDetailTitleUI(position, mergedData);
    updateDetailColorUI(position, mergedData);
 }
  showBanner(hasColor ? 'Barva boxu aktualizována.' : 'Barva byla odstraněna.', 'info');
  selectNavColorOption(navColorSelectedKey);
  updateDetailColorUI(position, mergedData);
} catch (error) {
  console.error('applyColorToPosition error', error);
  showBanner('Barvu se nepodařilo uložit.', 'error');
 }
}

function ensureGoalCanvasModule(autoListen = false){
 if (goalCanvasInitialized) {
   if (autoListen) attachGoalCanvasListener();
   return;
 }
 goalCanvasSurfaceEl = document.getElementById('goal-canvas-surface');
 goalCanvasEmptyEl = document.getElementById('goal-canvas-empty');
 goalCanvasAddBtn = document.getElementById('goal-canvas-add');
 goalCanvasScrollEl = document.querySelector('#goal-canvas-view .goal-canvas-scroll');
 goalCanvasZoomLabelEl = document.getElementById('goal-canvas-zoom-label');
 goalCanvasZoomOutBtn = document.getElementById('goal-canvas-zoom-out');
 goalCanvasZoomInBtn = document.getElementById('goal-canvas-zoom-in');
 if (!goalCanvasSurfaceEl || !goalCanvasAddBtn) return;

 goalCanvasSurfaceEl.style.minWidth = `${GOAL_CANVAS_BASE_WIDTH}px`;
 goalCanvasSurfaceEl.style.minHeight = `${GOAL_CANVAS_BASE_HEIGHT}px`;
 goalCanvasSurfaceEl.style.padding = `${GOAL_CANVAS_PADDING_PX}px`;

 goalCanvasAddBtn.addEventListener('click', () => handleGoalCanvasAdd());

 if (goalCanvasZoomOutBtn) {
   goalCanvasZoomOutBtn.addEventListener('click', () => adjustGoalCanvasZoom(-1));
 }
 if (goalCanvasZoomInBtn) {
   goalCanvasZoomInBtn.addEventListener('click', () => adjustGoalCanvasZoom(1));
 }

 applyGoalCanvasZoom(goalCanvasZoomIndex, { persist: false });

 goalCanvasSurfaceEl.addEventListener('pointerdown', handleGoalCanvasPointerDown);

 goalCanvasSurfaceEl.addEventListener('click', (event) => {
   const actionBtn = event.target.closest('[data-goal-action]');
   if (!actionBtn) return;
   const cardEl = actionBtn.closest('[data-goal-id]');
   if (!cardEl) return;
   const goalId = cardEl.dataset.goalId;
   if (!goalId) return;
   const action = actionBtn.dataset.goalAction;
   if (action === 'delete') {
     if (!confirm('Opravdu odstranit tento cíl?')) return;
     deleteGoalCanvasItem(goalId);
   }
 });

 goalCanvasSurfaceEl.addEventListener('dblclick', (event) => {
   const cardEl = event.target.closest('[data-goal-id]');
   if (cardEl) {
     const goal = goalCanvasItems.find((item) => item.id === cardEl.dataset.goalId);
     if (goal) handleGoalCanvasEdit(goal);
     return;
   }
   if (event.target === goalCanvasSurfaceEl) {
     const scale = getGoalCanvasScale();
     handleGoalCanvasAdd({ x: event.offsetX / scale, y: event.offsetY / scale });
   }
 });

 refreshGoalCanvasAvailability();
 updateGoalCanvasSurfaceSize();

 goalCanvasInitialized = true;
 if (autoListen) attachGoalCanvasListener();
}

function getGoalCanvasCollection(){
 if (!window.firebase || !window.firebase.db || !currentUser) return null;
 const { db, collection } = window.firebase;
 return collection(db, GOAL_CANVAS_ROOT, currentUser.uid, GOAL_CANVAS_SUBCOLLECTION);
}

function detachGoalCanvasListener(){
 if (typeof goalCanvasUnsubscribe === 'function') {
   try { goalCanvasUnsubscribe(); } catch (_) {}
 }
 goalCanvasUnsubscribe = null;
}

function attachGoalCanvasListener(){
 const collectionRef = getGoalCanvasCollection();
 if (!collectionRef || !goalCanvasSurfaceEl) return;
 detachGoalCanvasListener();
 const { query, orderBy, onSnapshot } = window.firebase;
 try {
   const q = query(collectionRef, orderBy('createdAt', 'asc'));
   goalCanvasUnsubscribe = onSnapshot(q, (snapshot) => {
     goalCanvasItems = snapshot.docs.map((docSnap) => {
       const data = docSnap.data() || {};
       return {
         id: docSnap.id,
         title: data.title || 'Nový cíl',
         description: data.description || '',
         size: data.size || 'medium',
         posX: typeof data.posX === 'number' ? data.posX : 160,
         posY: typeof data.posY === 'number' ? data.posY : 160,
         badgeEmoji: data.badgeEmoji || '🎯',
         badgeLabel: data.badgeLabel || 'Cíl',
         badgeBg: data.badgeBg || '#e0f2fe',
         badgeColor: data.badgeColor || '#1d4ed8',
         createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
         updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null
       };
     });
     renderGoalCanvas();
   }, (error) => {
     console.error('GoalCanvas listener error', error);
     showBanner('Cíle se nepodařilo načíst.', 'error');
   });
 } catch (error) {
  console.error('GoalCanvas attach listener failed', error);
 }
}

function refreshGoalCanvasAvailability(){
 if (!goalCanvasAddBtn) return;
 const canInteract = !!(currentUser && window.firebase && window.firebase.db);
 goalCanvasAddBtn.disabled = !canInteract;
 goalCanvasAddBtn.setAttribute('aria-disabled', String(!canInteract));
}

function readGoalCanvasDimension(value, fallback){
 const parsed = parseFloat(value);
 return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureGoalCanvasBoundsForCard(x, y, size){
 if (!goalCanvasSurfaceEl) return;
 const dims = GOAL_CARD_DIMENSIONS[size] || GOAL_CARD_DIMENSIONS.medium;
 const margin = GOAL_CANVAS_MARGIN;
 const requiredWidth = Math.max(GOAL_CANVAS_BASE_WIDTH, x + dims.width + margin);
 const requiredHeight = Math.max(GOAL_CANVAS_BASE_HEIGHT, y + dims.height + margin);
 const currentWidth = readGoalCanvasDimension(goalCanvasSurfaceEl.style.minWidth, GOAL_CANVAS_BASE_WIDTH);
 const currentHeight = readGoalCanvasDimension(goalCanvasSurfaceEl.style.minHeight, GOAL_CANVAS_BASE_HEIGHT);
 if (requiredWidth > currentWidth) {
   goalCanvasSurfaceEl.style.minWidth = `${Math.ceil(requiredWidth)}px`;
 }
 if (requiredHeight > currentHeight) {
   goalCanvasSurfaceEl.style.minHeight = `${Math.ceil(requiredHeight)}px`;
 }
}

function updateGoalCanvasSurfaceSize(){
 if (!goalCanvasSurfaceEl) return;
 let width = GOAL_CANVAS_BASE_WIDTH;
 let height = GOAL_CANVAS_BASE_HEIGHT;
 const margin = GOAL_CANVAS_MARGIN;
 goalCanvasItems.forEach((goal) => {
   const x = typeof goal.posX === 'number' ? goal.posX : GOAL_CANVAS_PADDING_PX;
   const y = typeof goal.posY === 'number' ? goal.posY : GOAL_CANVAS_PADDING_PX;
   const dims = GOAL_CARD_DIMENSIONS[goal.size] || GOAL_CARD_DIMENSIONS.medium;
   width = Math.max(width, x + dims.width + margin);
   height = Math.max(height, y + dims.height + margin);
 });
 goalCanvasSurfaceEl.style.minWidth = `${Math.ceil(width)}px`;
 goalCanvasSurfaceEl.style.minHeight = `${Math.ceil(height)}px`;
}

async function ensureGoalCanvasBadgeCallable(){
 if (goalCanvasBadgeCallable !== null) return goalCanvasBadgeCallable;
 if (!window.firebase || !window.firebase.functions || !window.firebase.httpsCallable) {
   goalCanvasBadgeCallable = null;
   return goalCanvasBadgeCallable;
 }
 try {
   goalCanvasBadgeCallable = window.firebase.httpsCallable(window.firebase.functions, 'goalCanvasSuggestBadge');
 } catch (error) {
   console.warn('GoalCanvas: nelze inicializovat ML callable.', error);
   goalCanvasBadgeCallable = null;
 }
 return goalCanvasBadgeCallable;
}

async function maybeFetchGoalBadgeSuggestion(title, size){
 if (!title || typeof title !== 'string') return null;
 const callable = await ensureGoalCanvasBadgeCallable();
 if (!callable) return null;
 try {
   const response = await Promise.race([
     callable({ title, size }),
     new Promise((resolve) => setTimeout(() => resolve(null), 1400))
   ]);
   const data = response?.data;
   if (!data) return null;
   return {
     badgeEmoji: data.badgeEmoji || data.emoji || null,
     badgeLabel: data.badgeLabel || data.label || null,
     badgeBg: data.badgeBg || data.background || null,
     badgeColor: data.badgeColor || data.color || null
   };
 } catch (error) {
   console.warn('GoalCanvas: ML badge suggestion failed.', error);
   return null;
 }
}

function getGoalCanvasScale(){
 const level = GOAL_CANVAS_ZOOM_LEVELS[goalCanvasZoomIndex] || GOAL_CANVAS_ZOOM_LEVELS[1];
 return level?.scale || 1;
}

function applyGoalCanvasZoom(index, { persist = true } = {}){
 const clampedIndex = Math.min(Math.max(index, 0), GOAL_CANVAS_ZOOM_LEVELS.length - 1);
 goalCanvasZoomIndex = clampedIndex;
 const level = GOAL_CANVAS_ZOOM_LEVELS[clampedIndex] || GOAL_CANVAS_ZOOM_LEVELS[1];
 const scale = level?.scale || 1;
 if (goalCanvasSurfaceEl) {
   goalCanvasSurfaceEl.style.transform = `scale(${scale})`;
 }
 if (goalCanvasZoomLabelEl) {
   goalCanvasZoomLabelEl.textContent = level?.label || '100%';
 }
 if (goalCanvasZoomOutBtn) goalCanvasZoomOutBtn.disabled = clampedIndex === 0;
 if (goalCanvasZoomInBtn) goalCanvasZoomInBtn.disabled = clampedIndex === GOAL_CANVAS_ZOOM_LEVELS.length - 1;
 if (persist) {
   try { localStorage.setItem(GOAL_CANVAS_ZOOM_STORAGE_KEY, String(clampedIndex)); } catch (_) {}
 }
}

function adjustGoalCanvasZoom(delta){
 applyGoalCanvasZoom(goalCanvasZoomIndex + delta);
}

function renderGoalCanvas(){
 if (!goalCanvasSurfaceEl) return;
 goalCanvasSurfaceEl.innerHTML = '';
 goalCanvasItems.forEach((goal) => {
   const card = createGoalCanvasCard(goal);
   goalCanvasSurfaceEl.appendChild(card);
 });
 if (goalCanvasEmptyEl) {
   goalCanvasEmptyEl.style.display = goalCanvasItems.length ? 'none' : 'flex';
 }
 updateGoalCanvasSurfaceSize();
}

function createGoalCanvasCard(goal){
 const card = document.createElement('article');
 card.className = 'goal-card';
 card.dataset.goalId = goal.id;
 card.dataset.size = goal.size || 'medium';
 card.style.left = `${Math.max(goal.posX, 40)}px`;
 card.style.top = `${Math.max(goal.posY, 40)}px`;

 const badge = document.createElement('span');
 badge.className = 'goal-card-badge';
 badge.style.background = goal.badgeBg || '#eef2ff';
 badge.style.color = goal.badgeColor || '#3730a3';
 badge.textContent = `${goal.badgeEmoji || '🎯'} ${goal.badgeLabel || ''}`.trim();
 card.appendChild(badge);

 const titleEl = document.createElement('h3');
 titleEl.className = 'goal-card-title';
 titleEl.textContent = goal.title || 'Nový cíl';
 card.appendChild(titleEl);

 if (goal.description) {
   const bodyEl = document.createElement('div');
   bodyEl.className = 'goal-card-body';
   bodyEl.textContent = goal.description;
   card.appendChild(bodyEl);
 }

 const footer = document.createElement('div');
 footer.className = 'goal-card-actions';
 const handle = document.createElement('span');
 handle.className = 'goal-card-handle';
 handle.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM3 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM3 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="currentColor"/></svg> DRAG';
 footer.appendChild(handle);

 const deleteBtn = document.createElement('button');
 deleteBtn.type = 'button';
 deleteBtn.className = 'goal-card-delete';
 deleteBtn.dataset.goalAction = 'delete';
 deleteBtn.textContent = 'Smazat';
 footer.appendChild(deleteBtn);

 card.appendChild(footer);
 return card;
}

function generateGoalBadgePayload(title = '', size = 'medium'){
 const base = (title || 'Cíl').trim().split(/\s+/)[0] || 'Cíl';
 const label = base.slice(0, 14);
 const palette = [
   { bg:'#eef2ff', color:'#3730a3' },
   { bg:'#e0f2fe', color:'#0f172a' },
   { bg:'#dcfce7', color:'#14532d' },
   { bg:'#fee2e2', color:'#991b1b' },
   { bg:'#fde68a', color:'#92400e' }
 ];
 const emojiMap = {
   small: '🌱',
   medium: '🚀',
   large: '🪐'
 };
 const paletteIndex = Math.abs(label.charCodeAt(0) + label.length) % palette.length;
 const chosen = palette[paletteIndex];
 return {
   badgeEmoji: emojiMap[size] || '🎯',
   badgeLabel: label,
   badgeBg: chosen.bg,
   badgeColor: chosen.color
 };
}

async function createGoalCanvasItem({ title, description = '', size = 'medium', position } = {}){
 const collectionRef = getGoalCanvasCollection();
 if (!collectionRef) {
   showBanner('Cíle se nepodařilo uložit (Firebase není připraven).', 'error');
   return;
 }
 const normalizedSize = ['small','medium','large'].includes(size) ? size : 'medium';
 const baseBadge = generateGoalBadgePayload(title, normalizedSize);
 let badge = baseBadge;
 const remoteSuggestion = await maybeFetchGoalBadgeSuggestion(title, normalizedSize);
 if (remoteSuggestion) {
   badge = {
     ...badge,
     badgeEmoji: remoteSuggestion.badgeEmoji || badge.badgeEmoji,
     badgeLabel: remoteSuggestion.badgeLabel || badge.badgeLabel,
     badgeBg: remoteSuggestion.badgeBg || badge.badgeBg,
     badgeColor: remoteSuggestion.badgeColor || badge.badgeColor
   };
 }
 const placement = position || computeGoalCanvasPlacement();
 ensureGoalCanvasBoundsForCard(placement.x, placement.y, normalizedSize);
 const payload = {
   title: (title || 'Nový cíl').trim(),
   description: (description || '').trim(),
   size: normalizedSize,
   posX: placement.x,
  posY: placement.y,
   badgeEmoji: badge.badgeEmoji,
   badgeLabel: badge.badgeLabel,
   badgeBg: badge.badgeBg,
   badgeColor: badge.badgeColor,
   ownerId: currentUser.uid,
   createdAt: window.firebase.serverTimestamp(),
   updatedAt: window.firebase.serverTimestamp()
 };
 try {
   const { addDoc } = window.firebase;
   await addDoc(collectionRef, payload);
   showBanner('Cíl přidán na plátno.', 'info');
 } catch (error) {
   console.error('GoalCanvas create error', error);
   showBanner('Cíl se nepodařilo uložit.', 'error');
 }
}

function computeGoalCanvasPlacement(){
 const columns = 4;
 const spacingX = 320;
 const spacingY = 260;
 const baseX = GOAL_CANVAS_PADDING_PX;
 const baseY = GOAL_CANVAS_PADDING_PX;
 const index = goalCanvasItems.length;
 const col = index % columns;
 const row = Math.floor(index / columns);
 return { x: baseX + col * spacingX, y: baseY + row * spacingY };
}

function handleGoalCanvasAdd(position){
 const collectionRef = getGoalCanvasCollection();
 if (!collectionRef) {
   const message = currentUser
     ? 'Goal Canvas se ještě inicializuje, zkuste to znovu za okamžik.'
     : 'Přihlaste se pro práci s Goal Canvas.';
   showBanner(message, 'error');
   refreshGoalCanvasAvailability();
   return;
 }
 const titleInput = prompt('Jaký cíl chceš přidat?', 'Nový cíl');
 if (titleInput === null) return;
 const title = titleInput.trim();
 if (!title) {
   showBanner('Název cíle nesmí být prázdný.', 'error');
   return;
 }
 const descInput = prompt('Popis cíle (volitelné):', '');
 let sizeInput = prompt('Velikost (malý / střední / velký):', 'střední') || 'střední';
 sizeInput = sizeInput.trim().toLowerCase();
 const sizeMap = {
   'malý': 'small',
   'maly': 'small',
   'small': 'small',
   'střední': 'medium',
   'stredni': 'medium',
   'medium': 'medium',
   'velký': 'large',
   'velky': 'large',
   'large': 'large'
 };
 const size = sizeMap[sizeInput] || 'medium';

 const placement = position ? { x: Math.max(position.x - 40, 80), y: Math.max(position.y - 40, 80) } : undefined;
 createGoalCanvasItem({ title, description: descInput || '', size, position: placement });
}

async function deleteGoalCanvasItem(goalId){
 const collectionRef = getGoalCanvasCollection();
 if (!collectionRef) return;
 try {
   const { db, doc, deleteDoc } = window.firebase;
   const ref = doc(db, GOAL_CANVAS_ROOT, currentUser.uid, GOAL_CANVAS_SUBCOLLECTION, goalId);
   await deleteDoc(ref);
   showBanner('Cíl odstraněn.', 'info');
 } catch (error) {
   console.error('GoalCanvas delete error', error);
   showBanner('Cíl se nepodařilo odstranit.', 'error');
 }
}

async function handleGoalCanvasEdit(goal){
 if (!goal) return;
 if (!isFirebaseReady || !currentUser) {
   showBanner('Přihlaste se pro úpravu cíle.', 'error');
   return;
 }
 const newTitleInput = prompt('Upravit název cíle:', goal.title || '');
 if (newTitleInput === null) return;
 const newTitle = newTitleInput.trim();
 if (!newTitle) {
   showBanner('Název cíle nesmí být prázdný.', 'error');
   return;
 }
 const newDescInput = prompt('Popis cíle:', goal.description || '');
 let sizeInput = prompt('Velikost (malý / střední / velký):', goal.size === 'small' ? 'malý' : goal.size === 'large' ? 'velký' : 'střední') || goal.size || 'medium';
 sizeInput = sizeInput.trim().toLowerCase();
 const sizeMap = {
   'malý': 'small',
   'maly': 'small',
   'small': 'small',
   'střední': 'medium',
   'stredni': 'medium',
   'medium': 'medium',
   'velký': 'large',
   'velky': 'large',
   'large': 'large'
 };
 const size = sizeMap[sizeInput] || goal.size || 'medium';

 const collectionRef = getGoalCanvasCollection();
 if (!collectionRef) return;
 try {
   const { db, doc, updateDoc, serverTimestamp } = window.firebase;
   const ref = doc(db, GOAL_CANVAS_ROOT, currentUser.uid, GOAL_CANVAS_SUBCOLLECTION, goal.id);
   const baseBadge = generateGoalBadgePayload(newTitle, size);
   let badge = baseBadge;
   const remoteSuggestion = await maybeFetchGoalBadgeSuggestion(newTitle, size);
   if (remoteSuggestion) {
     badge = {
       ...badge,
       badgeEmoji: remoteSuggestion.badgeEmoji || badge.badgeEmoji,
       badgeLabel: remoteSuggestion.badgeLabel || badge.badgeLabel,
       badgeBg: remoteSuggestion.badgeBg || badge.badgeBg,
       badgeColor: remoteSuggestion.badgeColor || badge.badgeColor
     };
   }
   await updateDoc(ref, {
     title: newTitle,
     description: (newDescInput || '').trim(),
     size,
     badgeEmoji: badge.badgeEmoji,
     badgeLabel: badge.badgeLabel,
     badgeBg: badge.badgeBg,
     badgeColor: badge.badgeColor,
     updatedAt: serverTimestamp()
   });
   showBanner('Cíl byl upraven.', 'info');
 } catch (error) {
   console.error('GoalCanvas edit error', error);
  showBanner('Cíl se nepodařilo upravit.', 'error');
 }
}

function handleGoalCanvasPointerDown(event){
 if (!goalCanvasSurfaceEl || goalCanvasDragState) return;
 if (event.pointerType === 'mouse' && event.button !== 0) return;
 const cardEl = event.target.closest('[data-goal-id]');
 if (!cardEl) return;
 if (event.target.closest('button')) return;
 event.preventDefault();
 const goalId = cardEl.dataset.goalId;
 if (!goalId) return;
 const surfaceRect = goalCanvasSurfaceEl.getBoundingClientRect();
 const cardRect = cardEl.getBoundingClientRect();
 const scale = getGoalCanvasScale();
 const offsetX = (event.clientX - cardRect.left) / scale;
 const offsetY = (event.clientY - cardRect.top) / scale;
 const leftStyle = parseFloat(cardEl.style.left);
 const topStyle = parseFloat(cardEl.style.top);
 const computedLeft = Number.isFinite(leftStyle) ? leftStyle : (cardRect.left - surfaceRect.left) / scale;
 const computedTop = Number.isFinite(topStyle) ? topStyle : (cardRect.top - surfaceRect.top) / scale;
 goalCanvasDragState = {
   id: goalId,
   cardEl,
   pointerId: event.pointerId,
   offsetX,
   offsetY,
   latestX: computedLeft,
   latestY: computedTop,
   moved: false
 };
 try { cardEl.setPointerCapture(event.pointerId); } catch (_) {}
 cardEl.classList.add('dragging');
 document.body.classList.add('goal-canvas-dragging');
 window.addEventListener('pointermove', handleGoalCanvasPointerMove);
 window.addEventListener('pointerup', handleGoalCanvasPointerUp);
 window.addEventListener('pointercancel', handleGoalCanvasPointerUp);
}

function handleGoalCanvasPointerMove(event){
 if (!goalCanvasDragState || event.pointerId !== goalCanvasDragState.pointerId) return;
 const surfaceRect = goalCanvasSurfaceEl.getBoundingClientRect();
 const scale = getGoalCanvasScale();
 let newLeft = (event.clientX - surfaceRect.left) / scale - goalCanvasDragState.offsetX;
 let newTop = (event.clientY - surfaceRect.top) / scale - goalCanvasDragState.offsetY;
 const minBound = 24;
 newLeft = Math.max(newLeft, minBound);
 newTop = Math.max(newTop, minBound);

 if (goalCanvasScrollEl) {
   const scrollRect = goalCanvasScrollEl.getBoundingClientRect();
   const threshold = 60;
   const delta = 18;
   if (event.clientY - scrollRect.top < threshold) {
     goalCanvasScrollEl.scrollTop -= delta;
   } else if (scrollRect.bottom - event.clientY < threshold) {
     goalCanvasScrollEl.scrollTop += delta;
   }
   if (event.clientX - scrollRect.left < threshold) {
     goalCanvasScrollEl.scrollLeft -= delta;
   } else if (scrollRect.right - event.clientX < threshold) {
     goalCanvasScrollEl.scrollLeft += delta;
   }
 }

 goalCanvasDragState.cardEl.style.left = `${newLeft}px`;
 goalCanvasDragState.cardEl.style.top = `${newTop}px`;
 ensureGoalCanvasBoundsForCard(newLeft, newTop, goalCanvasDragState.cardEl.dataset.size);
 goalCanvasDragState.latestX = newLeft;
 goalCanvasDragState.latestY = newTop;
 goalCanvasDragState.moved = true;
}

function handleGoalCanvasPointerUp(event){
 if (!goalCanvasDragState || event.pointerId !== goalCanvasDragState.pointerId) return;
 const { cardEl, id, moved, latestX, latestY } = goalCanvasDragState;
 try { cardEl.releasePointerCapture(event.pointerId); } catch (_) {}
 cardEl.classList.remove('dragging');
 document.body.classList.remove('goal-canvas-dragging');
 window.removeEventListener('pointermove', handleGoalCanvasPointerMove);
 window.removeEventListener('pointerup', handleGoalCanvasPointerUp);
 window.removeEventListener('pointercancel', handleGoalCanvasPointerUp);

 if (moved) {
   const x = Math.round(latestX);
   const y = Math.round(latestY);
   const item = goalCanvasItems.find((entry) => entry.id === id);
   if (item) {
     item.posX = x;
     item.posY = y;
   }
   updateGoalCanvasPosition(id, x, y);
 }

 goalCanvasDragState = null;
}

async function updateGoalCanvasPosition(goalId, x, y){
 if (!isFirebaseReady || !currentUser) return;
 try {
   const { db, doc, updateDoc, serverTimestamp } = window.firebase;
   const ref = doc(db, GOAL_CANVAS_ROOT, currentUser.uid, GOAL_CANVAS_SUBCOLLECTION, goalId);
   await updateDoc(ref, {
     posX: x,
     posY: y,
     updatedAt: serverTimestamp()
   });
 } catch (error) {
   console.error('GoalCanvas position update error', error);
 }
}

// =================================================================================
// --- 1. KONFIGURACE A GLOBÁLNÍ STAV ---
 // =================================================================================
 let activeBox = null;
 let currentUser = null;
 let isEditingText = false;
 let isFirebaseReady = false;
let uploadQueue = [];
let currentBoxDetails = null;
let unsubscribeListener = null; 
let dragSource = null;
let lastDragOverEl = null; // pro čištění .dragover
let lastDragSwapPositions = null; // uchování posledních swapovaných pozic pro integritu
// Cache aktuálního stavu gridu pro diff rendering
let gridDataCache = {}; // { 'r-c': { ..boxData } }
let googleAuthProviderInstance = null;
let workspaceSetupsDrawerOpen = false;
const ARCHITEKT_WORKSPACE_ID = 'architekt';
let architektCopyInitialized = false;
let architektCopyPanelOpen = false;
let architektCopyBusy = false;
let architektCopyItems = [];
const architektCopySelection = new Set();
const WORKSPACE_ALIAS_MAP = {
  workspace1: ['grid'],
  elektrocz: ['elektrocz.com'],
  pokus: ['pokus', 'elektrocz-pokus'],
  pokus2: ['pokus2'],
  pokus3: ['pokus3'],
  pokus4: ['pokus4'],
  pokus5: ['pokus5'],
  pokus6: ['pokus6'],
  architekt: ['architekt']
};

let authGateEl = null;
let authSignInBtn = null;
let authErrorEl = null;
let authSignInBusy = false;
let authGateInitialized = false;
let authSignOutInProgress = false;

function showAuthGate() {
  if (authGateEl) {
    authGateEl.classList.remove('hidden');
  }
  document.body.classList.add('auth-locked');
  clearAuthError();
  setAuthButtonBusy(false);
  scheduleAuthButtonFocus();
}

function hideAuthGate() {
  if (authGateEl) {
    authGateEl.classList.add('hidden');
  }
  document.body.classList.remove('auth-locked');
  clearAuthError();
  setAuthButtonBusy(false);
}

function scheduleAuthButtonFocus() {
  if (!authSignInBtn) return;
  requestAnimationFrame(() => authSignInBtn?.focus());
}

function setAuthButtonBusy(isBusy) {
  if (!authSignInBtn) return;
  authSignInBusy = isBusy;
  authSignInBtn.disabled = isBusy;
  if (!authSignInBtn.dataset.label) {
    authSignInBtn.dataset.label = authSignInBtn.textContent?.trim() || 'Pokračovat přes Google';
  }
  authSignInBtn.textContent = isBusy ? 'Přihlašuji…' : authSignInBtn.dataset.label;
}

function setAuthError(message) {
  if (authErrorEl) {
    authErrorEl.textContent = message || '';
  }
}

function clearAuthError() {
  setAuthError('');
}

function formatAuthError(error) {
  if (!error) return 'Přihlášení selhalo. Zkus to prosím znovu.';
  const code = error.code || '';
  switch (code) {
    case 'auth/network-request-failed':
      return 'Nepodařilo se připojit. Zkontroluj internetové připojení a zkus to znovu.';
    case 'auth/popup-blocked':
      return 'Prohlížeč zablokoval přihlašovací okno. Povolit vyskakovací okna a zkus to znovu.';
    case 'auth/popup-closed-by-user':
      return 'Okno pro přihlášení bylo zavřeno. Zkus to prosím znovu.';
    case 'auth/cancelled-popup-request':
      return 'Přihlašovací okno bylo zavřeno jinou akcí. Zkus přihlášení spustit znovu.';
    default:
      return error.message || 'Přihlášení selhalo. Zkus to prosím znovu.';
  }
}

function handleAuthError(error) {
  if (error?.code === 'auth/no-auth-event') return;
  console.warn('[P73] Google sign-in error:', error);
  setAuthButtonBusy(false);
  setAuthError(formatAuthError(error));
  showAuthGate();
}

async function startGoogleSignIn(event) {
  if (event) event.preventDefault();
  if (authSignInBusy) return;

  const firebase = window.firebase || {};
  const { auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = firebase;
  if (!auth || !GoogleAuthProvider || !signInWithPopup) {
    handleAuthError(new Error('Firebase Auth není připraveno.'));
    return;
  }

  clearAuthError();
  setAuthButtonBusy(true);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' && typeof signInWithRedirect === 'function') {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        handleAuthError(redirectError);
        return;
      }
    }
    handleAuthError(error);
  } finally {
    setAuthButtonBusy(false);
  }
}

function initAuthGate() {
  if (authGateInitialized) return;
  authGateInitialized = true;

  authGateEl = document.getElementById('auth-gate');
  authSignInBtn = document.getElementById('auth-signin-btn');
  authErrorEl = document.getElementById('auth-error');

  if (authSignInBtn) {
    authSignInBtn.dataset.label = authSignInBtn.textContent?.trim() || 'Pokračovat přes Google';
    authSignInBtn.addEventListener('click', startGoogleSignIn);
  }

  const firebase = window.firebase || {};
  if (firebase.auth && typeof firebase.getRedirectResult === 'function') {
    firebase.getRedirectResult(firebase.auth).catch(handleAuthError);
  }
}

function isGoogleAuthenticatedUser(user) {
  return !!(user && !user.isAnonymous && Array.isArray(user.providerData)
    && user.providerData.some((profile) => profile?.providerId === 'google.com'));
}

const POKUS_MULTI_DEMO_SLOT = '2-3';
const POKUS_MULTI_DEMO_ITEMS = [
  { title: 'SEO plán' },
  { title: 'Blog posty' },
  { title: 'CTA testy' },
  { title: 'Newsletter' },
  { title: 'Reporting' }
];
const POKUS5_SINGLE_ROW_SLOT = '2-3';
const POKUS5_SINGLE_ROW_ITEMS = [
  { title: 'Řádek 1' },
  { title: 'Řádek 2' },
  { title: 'Řádek 3' },
  { title: 'Řádek 4' }
];
const workspaceLegacyMigrationAttempts = new Set();
const WORKSPACE_AUTOSAVE_LABEL = 'no name';
const workspaceFirstContentAutosaveState = {}; // { workspaceId: 'pending' | 'done' }
const workspaceDefaultResolutionState = {}; // { workspaceId: 'idle' | 'running' | 'failed' | 'cooldown' }
const workspaceDefaultResolutionAttempts = {}; // { workspaceId: number }
const workspaceDefaultResolutionTimers = {}; // { workspaceId: timeoutId }
const DEFAULT_RESOLUTION_COOLDOWN_MS = 1500;
const workspaceSetupsRenderCache = {}; // { workspaceId: signature }
let workspaceSetupsCurrentDomWorkspace = null;

function normalizeWorkspaceKey(value) {
  return (value ?? '').toString().trim();
}

function normalizeWorkspaceKeyLower(value) {
  return normalizeWorkspaceKey(value).toLowerCase();
}

function getWorkspaceAliasList(workspaceId) {
  const canonical = normalizeWorkspaceKey(workspaceId);
  if (!canonical) return [];
  const aliasSet = new Set([canonical]);
  const aliasExtras = WORKSPACE_ALIAS_MAP[canonical] || WORKSPACE_ALIAS_MAP[canonical.toLowerCase()] || [];
  aliasExtras.forEach((alias) => {
    const cleaned = normalizeWorkspaceKey(alias);
    if (cleaned) aliasSet.add(cleaned);
  });
  return Array.from(aliasSet);
}

function matchesWorkspaceAlias(candidate, workspaceId) {
  const normalizedCandidate = normalizeWorkspaceKey(candidate).toLowerCase();
  if (!normalizedCandidate) return false;
  return getWorkspaceAliasList(workspaceId).some(
    (alias) => normalizeWorkspaceKeyLower(alias) === normalizedCandidate
  );
}

function getWorkspaceSessionPrefixes(workspaceId) {
  const aliases = getWorkspaceAliasList(workspaceId);
  if (!aliases.length) return [];
  const prefixSet = new Set();
  aliases.forEach((alias) => {
    const lowered = normalizeWorkspaceKeyLower(alias);
    if (!lowered) return;
    prefixSet.add(`${lowered}_`);
    prefixSet.add(`${lowered}-`);
  });
  return Array.from(prefixSet);
}

function scheduleWorkspaceDefaultCooldown(workspaceId) {
  if (!workspaceId) return;
  if (workspaceDefaultResolutionTimers[workspaceId]) {
    clearTimeout(workspaceDefaultResolutionTimers[workspaceId]);
  }
  workspaceDefaultResolutionState[workspaceId] = 'cooldown';
  workspaceDefaultResolutionTimers[workspaceId] = setTimeout(() => {
    if (workspaceDefaultResolutionState[workspaceId] === 'cooldown') {
      workspaceDefaultResolutionState[workspaceId] = 'idle';
    }
    delete workspaceDefaultResolutionTimers[workspaceId];
  }, DEFAULT_RESOLUTION_COOLDOWN_MS);
}

function belongsToWorkspaceSetup(setup, workspaceId) {
  if (!workspaceId || !setup) return false;
  if (setup.workspaceId && matchesWorkspaceAlias(setup.workspaceId, workspaceId)) {
    return true;
  }
  const sessionKey = normalizeWorkspaceKeyLower(setup.sessionId);
  if (sessionKey) {
    const prefixes = getWorkspaceSessionPrefixes(workspaceId);
    if (prefixes.some((prefix) => sessionKey.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

function setWorkspaceAutosaveStatus(workspaceId, status) {
  if (!workspaceId) return;
  if (status) workspaceFirstContentAutosaveState[workspaceId] = status;
  else delete workspaceFirstContentAutosaveState[workspaceId];
}

function getWorkspaceAutosaveStatus(workspaceId) {
  if (!workspaceId) return null;
  return workspaceFirstContentAutosaveState[workspaceId] || null;
}

function boxDataHasMeaningfulContent(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.hasImage && data.imageUrl) return true;
  const text = (data.text || '').trim();
  if (data.hasText && text) return true;
  if (data.hasColor && data.colorStyle) return true;
  const links = Array.isArray(data.links) ? data.links : [];
  if (links.length) return true;
  return false;
}

function maybeTriggerFirstContentAutosave({ hadContentBefore, mergedData }) {
  const workspaceId = currentWorkspace;
  if (!workspaceId || hadContentBefore) return;
  if (!workspaceAllowsSetups(workspaceId)) return;
  if (!boxDataHasMeaningfulContent(mergedData)) return;
  const setups = workspaceSetupsState[workspaceId] || [];
  if (setups.length > 1) {
    setWorkspaceAutosaveStatus(workspaceId, 'done');
    return;
  }
  const status = getWorkspaceAutosaveStatus(workspaceId);
  if (status === 'pending' || status === 'done') return;
  setWorkspaceAutosaveStatus(workspaceId, 'pending');

  setTimeout(async () => {
    try {
      if (currentWorkspace !== workspaceId) {
        setWorkspaceAutosaveStatus(workspaceId, null);
        return;
      }
      await saveCurrentWorkspaceSetup({ label: WORKSPACE_AUTOSAVE_LABEL, setAsDefault: true });
      setWorkspaceAutosaveStatus(workspaceId, 'done');
    } catch (error) {
      console.error('Auto-save workspace setup failed', error);
      setWorkspaceAutosaveStatus(workspaceId, null);
    }
  }, 300);
}
 // (Removed duplicate immediate resets that nulled freshly declared state.)
function escapeHtml(unsafe) {
 return unsafe
   .replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;")
   .replace(/'/g, "&#039;");
}

function workspaceAllowsSetups(workspaceId = currentWorkspace) {
  if (!workspaceId) return false;
  try {
    if (typeof workspaceSupportsSetups === 'function') {
      return workspaceSupportsSetups(workspaceId);
    }
  } catch (_) {}
  const cfg = workspaceConfigs[workspaceId];
  return !!(cfg && cfg.supportsSetups);
}
function renderAuthTopbar(user){
 const statusEl = document.getElementById('p73-topbar-status');
 if (!statusEl) return;
 if (user){
   hideAuthGate();
   const name = user.displayName || user.email || 'Přihlášený uživatel';
   const email = user.email || '';
   const safeName = escapeHtml(name);
   const safeEmail = escapeHtml(email);
   statusEl.innerHTML = `
     <div class="auth-user-chip">
       <span class="auth-user-name">${safeName}</span>
       ${safeEmail ? `<span class="auth-user-email">${safeEmail}</span>` : ''}
     </div>
     <button id="auth-signout-btn" class="auth-signout-btn" type="button">Odhlásit se</button>
   `;
   const btn = document.getElementById('auth-signout-btn');
   if (btn){
     const { auth, signOut } = window.firebase;
     btn.addEventListener('click', () => {
       btn.disabled = true;
       btn.textContent = 'Odhlášení...';
     signOut(auth).catch(err => {
        console.error('❌ Sign-out failed:', err);
        showBanner('Odhlášení se nezdařilo.', 'error');
        btn.disabled = false;
        btn.textContent = 'Odhlásit se';
      });
    }, { once: true });
  }
 } else {
   statusEl.innerHTML = `
     <div class="auth-user-chip auth-user-chip--signedout">
       <span>Přihlaste se Google účtem</span>
       <button id="auth-open-btn" class="auth-signout-btn" type="button">Přihlásit</button>
     </div>
   `;
   const openBtn = document.getElementById('auth-open-btn');
   if (openBtn) {
     openBtn.addEventListener('click', () => {
       showAuthGate();
     });
   }
 }
}
// Debug přepínač pro logování diff operací
const DEBUG_DIFF = false;
let _rtUnsub = null; // realtime subscription reference (pauza během drag)
let assetsLoading = false;
let assetsLoadedOnce = false;
let assetsSummaryCache = null;
let galleryLoading = false;
let galleryLoadedOnce = false;
let galleryCache = null;
let galleryFilterPrefix = 'all';
let gallerySortOrder = 'desc';
// Guarded global root label for gallery filtering (moved from inside updateGalleryFilterOptions)
if (!('GALLERY_ROOT_LABEL' in window)) {
 window.GALLERY_ROOT_LABEL = '[root]';
}
const GALLERY_ROOT_LABEL = window.GALLERY_ROOT_LABEL;

// --- Debug instrumentation (can be removed after issue fixed) ---
window.__P73_DEBUG = window.__P73_DEBUG || { marks: [] };
function p73Mark(label, extra){
 try {
   const entry = { t: Date.now(), label, extra };
   window.__P73_DEBUG.marks.push(entry);
   if (window.location.hash.includes('debugLog')) console.log('[P73]', label, extra||'');
 } catch(e) { /* swallow */ }
}
p73Mark('script:start');

let currentWorkspace = 'workspace1';
let sessionId = null;
let gridDocRef = null;
let userWorkspacesDocRef = null;

let workspaceConfigs = {};

function cloneWorkspaceConfig(source) {
  if (!source || typeof source !== 'object') return null;
  return {
    name: source.name || '',
    collection: source.collection || '',
    supportsSetups: !!source.supportsSetups
  };
}

function listWorkspaceSummaries() {
  return Object.entries(workspaceConfigs || {}).map(([id, cfg]) => ({
    id,
    ...cloneWorkspaceConfig(cfg)
  }));
}

function dispatchWorkspaceEvent(name, detail = {}) {
  try {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  } catch (error) {
    console.warn('[P73] Event dispatch failed', name, error);
  }
}

window.P73Workspaces = {
  getCurrentId: () => currentWorkspace,
  getSessionId: () => sessionId,
  getGridDocPath: () => gridDocRef?.path || null,
  getCurrentConfig: () => cloneWorkspaceConfig(workspaceConfigs[currentWorkspace]),
  getConfig: (workspaceId) => cloneWorkspaceConfig(workspaceConfigs[workspaceId]),
  list: () => listWorkspaceSummaries()
};

function resolveWorkspaceIdFromView(view) {
  const normalizedView = normalizeWorkspaceKey(view);
  if (!normalizedView) return null;

  if (workspaceConfigs && Object.prototype.hasOwnProperty.call(workspaceConfigs, normalizedView)) {
    return normalizedView;
  }

  for (const workspaceId of Object.keys(workspaceConfigs || {})) {
    if (matchesWorkspaceAlias(normalizedView, workspaceId)) {
      return workspaceId;
    }
  }

  return null;
}

window.__P73_handleViewWorkspace = function(view) {
  const targetWorkspace = resolveWorkspaceIdFromView(view);
  if (!targetWorkspace) return;

  if (!isFirebaseReady) {
    if (currentWorkspace !== targetWorkspace) {
      currentWorkspace = targetWorkspace;
    }
    return;
  }

  if (currentWorkspace === targetWorkspace) return;

  switchWorkspace(targetWorkspace).catch((error) => {
    console.error('[P73] switchWorkspace failed for view', view, error);
  });
};

// --- Auto-hide konfigurace pro plovoucí lištu nástrojů (nav-icons) ---
const NAV_ICONS_AUTOHIDE_MS = 2000; // rychlejší reakce při opuštění boxu
let navIconsHideTimer = null;

// --- Archivace (soft-delete) konfigurace ---
const ARCHIVE_COLLECTION = 'project73_archives';
const ARCHIVE_RETENTION_DAYS = 3; // Počet dní pro obnovu (změněno z 7)

const WORKSPACE_SETUPS_COLLECTION = 'project73_workspace_setups';
let workspaceSetupsState = {};
let workspaceSetupsLoading = false;
let workspaceSetupsError = null;
let workspaceSetupsUnsubscribe = null;
let workspaceActiveSetup = {};
let workspacePendingActiveSetup = {};
let workspaceEnsureDefaultInProgress = false;
let workspaceSetDefaultInProgress = false;
let workspaceToolbarState = { label: 'New', isDefault: false };
const workspaceToolbarOverrides = {};
let workspaceNameEditActive = false;
let workspaceModuleEditActive = false;

const GRID_ZOOM_LEVELS = [
  { id: 'overview', label: '50%', cellMin: 72, boxHeight: 90, boxHeightLg: 108 },
  { id: 'default', label: '100%', cellMin: 133, boxHeight: 170, boxHeightLg: 190 },
  { id: 'focus', label: '160%', cellMin: 212, boxHeight: 272, boxHeightLg: 300 }
];
const GRID_ZOOM_STORAGE_KEY = 'p73:gridZoomIndex';
let gridZoomIndex = 1;


 function cancelNavIconsAutohide(){
   if (navIconsHideTimer){
     clearTimeout(navIconsHideTimer);
     navIconsHideTimer = null;
   }
 }

function startNavIconsAutohide(){
  cancelNavIconsAutohide();
  const el = document.getElementById('nav-icons');
  if (!el || !el.classList.contains('active')) return;
  navIconsHideTimer = setTimeout(() => {
    el.classList.remove('active');
    closeNavColorPanel();
    el.dataset.position = '';
    navIconsHideTimer = null;
  }, NAV_ICONS_AUTOHIDE_MS);
}

function getNavIconsElement(){
  return document.getElementById('nav-icons');
}

function showNavIcons(box){
  const nav = getNavIconsElement();
  if (!nav || !box) return;
  if (nav.parentElement !== box) {
    box.appendChild(nav);
  }
  nav.dataset.position = box.dataset.position || '';
  nav.classList.add('active');
  cancelNavIconsAutohide();
}

function hideNavIcons(){
  const nav = getNavIconsElement();
  if (!nav) return;
  nav.classList.remove('active');
  nav.dataset.position = '';
  closeNavColorPanel();
}
 // Pomocná funkce: zjištění zda box má nějaký obsah (obrázek, text, barvu, odkaz)
 function boxHasContent(box){
   if(!box) return false;
  const hasBgImage = box.style.backgroundImage && box.style.backgroundImage !== 'none';
  const hasTitleBadge = !!box.querySelector('.box-title-badge');
  const hasLink = Number(box.dataset.linkCount || '0') > 0;
  const hasColorBg = box.style.background && box.style.background !== '' && !box.style.background.includes('rgba(0, 0, 0, 0)');
  return hasBgImage || hasTitleBadge || hasLink || hasColorBg;
}

 // =================================================================================
 // --- 2. DATOVÉ OPERACE (FIREBASE & STORAGE) ---
 // =================================================================================
 function getDefaultWorkspaces() {
   return {
     workspace1: { collection: 'project73-sessions', name: "Plocha 1", supportsSetups: true },
     workspace2: { collection: 'project73-workspace2', name: "Plocha 2", supportsSetups: true },
     workspace3: { collection: 'project73-workspace3', name: "Plocha 3", supportsSetups: true },
     workspace4: { collection: 'project73-workspace4', name: "Plocha 4", supportsSetups: true },
    workspace5: { collection: 'project73-workspace5', name: "Vlastní plocha", supportsSetups: true },
    elektrocz: { collection: 'project73-elektrocz', name: "elektrocz.com", supportsSetups: true },
    pokus: { collection: 'project73-elektrocz-pokus', name: "POKUS", supportsSetups: true },
    pokus2: { collection: 'project73-pokus2', name: "POKUS 2", supportsSetups: true },
    pokus3: { collection: 'project73-pokus3', name: "POKUS 3", supportsSetups: true },
    pokus4: { collection: 'project73-pokus4', name: "POKUS 4", supportsSetups: true },
    pokus5: { collection: 'project73-pokus5', name: "POKUS 5", supportsSetups: true },
    pokus6: { collection: 'project73-pokus6', name: "POKUS 6", supportsSetups: true },
    architekt: { collection: 'project73-architekt', name: "Architekt", supportsSetups: true }
  };
}

 function normalizeWorkspaceConfigs(rawConfigs = {}) {
   const defaults = getDefaultWorkspaces();
   const normalized = {};

   const addEntry = (id, source) => {
     const base = defaults[id] || {};
     const src = source && typeof source === 'object' ? source : {};
     const collection = src.collection || base.collection;
     if (!collection) return;
     normalized[id] = {
       name: src.name || base.name || id,
       collection,
       supportsSetups: typeof src.supportsSetups === 'boolean'
         ? src.supportsSetups
         : !!base.supportsSetups,
       sessionId: null,
       gridDocRef: null
     };
   };

   for (const [id, defaultCfg] of Object.entries(defaults)) {
     addEntry(id, rawConfigs[id] || defaultCfg);
   }

   for (const [id, sourceCfg] of Object.entries(rawConfigs)) {
     if (!normalized[id]) {
       addEntry(id, sourceCfg);
     }
   }

   return normalized;
 }

 function prepareWorkspacePayload(configs = {}) {
   const payload = {};
   for (const [id, cfg] of Object.entries(configs)) {
     if (!cfg || typeof cfg !== 'object') continue;
     const entry = {};
     for (const [key, value] of Object.entries(cfg)) {
       if (key === 'sessionId' || key === 'gridDocRef') continue;
       if (value === undefined) continue;
       const valType = typeof value;
       if (valType === 'string' || valType === 'number' || valType === 'boolean' || value === null) {
         entry[key] = value;
       }
     }
     if (!entry.collection) continue;
     if (!entry.name) entry.name = id;
     payload[id] = entry;
   }
   return payload;
 }

 function workspaceConfigNeedsMigration(rawConfigs = {}) {
   for (const cfg of Object.values(rawConfigs || {})) {
     if (!cfg || typeof cfg !== 'object') return true;
     if (!cfg.collection || typeof cfg.collection !== 'string') return true;
     if (Object.prototype.hasOwnProperty.call(cfg, 'gridDocRef')) return true;
     if (Object.prototype.hasOwnProperty.call(cfg, 'sessionId')) return true;
   }
   return false;
 }

 async function loadUserWorkspaceConfig(user) {
   const { db, doc, getDoc, setDoc, updateDoc } = window.firebase;
   userWorkspacesDocRef = doc(db, 'project73_users', user.uid);
   try {
     const snap = await getDoc(userWorkspacesDocRef);
     if (snap.exists()) {
       const raw = snap.data()?.workspaces || {};
       workspaceConfigs = normalizeWorkspaceConfigs(raw);
       if (workspaceConfigNeedsMigration(raw)) {
         await updateDoc(userWorkspacesDocRef, { workspaces: prepareWorkspacePayload(workspaceConfigs) });
       }
     } else {
       workspaceConfigs = normalizeWorkspaceConfigs(getDefaultWorkspaces());
       await setDoc(userWorkspacesDocRef, { workspaces: prepareWorkspacePayload(workspaceConfigs) });
     }
   } catch (error) {
     console.error('❌ loadUserWorkspaceConfig error', error);
     workspaceConfigs = normalizeWorkspaceConfigs(getDefaultWorkspaces());
     try {
       await setDoc(userWorkspacesDocRef, { workspaces: prepareWorkspacePayload(workspaceConfigs) });
     } catch (_) {}
   }

   renderWorkspacePanels();
   dispatchWorkspaceEvent('p73:workspace-configs-ready', { configs: listWorkspaceSummaries() });
   Promise.allSettled(Object.keys(workspaceConfigs).map((id) => ensureWorkspaceCollectionExists(id))).catch(() => {});
 }

 // Zajistí že kolekce pro workspace existuje tím, že vytvoří placeholder dokument pokud je kolekce prázdná
 async function ensureWorkspaceCollectionExists(workspaceId) {
   try {
     const cfg = workspaceConfigs[workspaceId];
     if(!cfg || !cfg.collection) return;
     const { db, collection, query, limit, getDocs, doc, setDoc } = window.firebase;
     const q = query(collection(db, cfg.collection), limit(1));
     const snap = await getDocs(q);
     if (snap.empty) {
       const placeholderRef = doc(collection(db, cfg.collection));
         await setDoc(placeholderRef, {
           _init: true,
           createdAt: Date.now(),
           info: 'Placeholder dokument automaticky vytvořen pro inicializaci kolekce.'
         });
         console.log(`📁 Kolekce ${cfg.collection} inicializována placeholder dokumentem.`);
     }
   } catch (e) {
     console.warn('Nepodařilo se inicializovat kolekci pro workspace', workspaceId, e);
   }
 }

 function getBrowserFingerprint() {
   const canvas = document.createElement('canvas');
   const ctx = canvas.getContext('2d');
   ctx.textBaseline = 'top';
   ctx.font = '14px Arial';
   ctx.fillText('Browser fingerprint', 2, 2);

   const components = [
     navigator.userAgent || '', navigator.language || '',
     screen.width + 'x' + screen.height, screen.colorDepth || '',
     new Date().getTimezoneOffset(), canvas.toDataURL(),
     navigator.platform || '', navigator.cookieEnabled,
     typeof window.localStorage !== 'undefined', typeof window.sessionStorage !== 'undefined'
   ];

   const fingerprint = btoa(components.join('|')).replace(/[+=\/]/g, '').substring(0, 16);
   return fingerprint;
 }

 async function findSessionByFingerprint(fingerprint, collectionName) {
   const { db, collection, query, where, limit, getDocs } = window.firebase;
   try {
     const q = query(collection(db, collectionName), where('browserFingerprint', '==', fingerprint), limit(5));
     const querySnapshot = await getDocs(q);
     if (querySnapshot.empty) return null;

     const sessions = querySnapshot.docs.map(d => ({ id: d.id, data: d.data() }));
     let bestSession = null;
     let maxData = -1;

     for (const session of sessions) {
       const dataCount = session.data.gridData ? Object.keys(session.data.gridData).length : 0;
       if (dataCount > maxData) {
         maxData = dataCount;
         bestSession = session;
       }
     }
     return bestSession;
   } catch (error) {
     console.error(`❌ Error finding session by fingerprint in ${collectionName}:`, error);
     return null;
   }
 }

 async function findMostRecentSession(collectionName) {
   const { db, collection, query, limit, getDocs } = window.firebase;
   try {
     const colRef = collection(db, collectionName);
     const snap = await getDocs(query(colRef, limit(25)));
     if (snap.empty) return null;
     let best = null;
     let bestScore = -1;
     snap.forEach((docSnap) => {
       const data = docSnap.data() || {};
       const gridData = data.gridData || {};
       const count = Object.keys(gridData).length;
       const lastModified = data.lastModified?.toMillis ? data.lastModified.toMillis() : 0;
       const score = count * 1e9 + lastModified;
       if (score > bestScore) {
         bestScore = score;
         best = { id: docSnap.id, data };
       }
     });
     return best;
   } catch (error) {
     console.error(`❌ Error finding most recent session in ${collectionName}:`, error);
     return null;
   }
 }

async function createNewSession(workspaceId) {
    const config = workspaceConfigs[workspaceId];
    const { db, doc, setDoc, serverTimestamp } = window.firebase;
    const fingerprint = getBrowserFingerprint();
    const userId = currentUser.uid;

     const newSessionId = `${workspaceId}_${Date.now()}_${userId.slice(0, 8)}`;
     config.sessionId = newSessionId;
     config.gridDocRef = doc(db, config.collection, config.sessionId);

     const sessionData = {
         userId, sessionId: newSessionId, workspaceId, browserFingerprint: fingerprint,
         gridData: {},
         stats: { totalBoxes: 105, filledBoxes: 0, emptyBoxes: 105, isActive: true },
         metadata: { version: "2.0", project: "Project_73", workspace: workspaceId, gridSize: "15x7" },
         created: serverTimestamp(),
         lastModified: serverTimestamp(),
         lastAccessed: serverTimestamp()
     };

    await setDoc(config.gridDocRef, sessionData);
    console.log(`✅ Created new session for ${workspaceId}:`, newSessionId);
    return { sessionId: newSessionId, gridDocRef: config.gridDocRef };
}

async function cloneWorkspaceDataFrom(sourceWorkspaceId, targetWorkspaceId, { force = false } = {}) {
  const sourceConfig = workspaceConfigs[sourceWorkspaceId];
  const targetConfig = workspaceConfigs[targetWorkspaceId];
  if (!sourceConfig?.collection || !targetConfig?.gridDocRef) return false;

  try {
    const { getDoc, updateDoc, serverTimestamp } = window.firebase;
    const targetSnap = await getDoc(targetConfig.gridDocRef);
    const existingData = targetSnap.exists() ? targetSnap.data()?.gridData || {} : {};
    if (!force && existingData && Object.keys(existingData).length > 0) {
      return false;
    }

    const sourceSession = await findMostRecentSession(sourceConfig.collection);
    if (!sourceSession || !sourceSession.data) {
      console.warn(`[P73] cloneWorkspaceDataFrom: žádná zdrojová session pro ${sourceWorkspaceId}`);
      return false;
    }

    const sourceGrid = sourceSession.data.gridData || {};
    if (!force && Object.keys(existingData).length === Object.keys(sourceGrid).length && Object.keys(existingData).length > 0) {
      return false;
    }

    const totalBoxes = 105;
    const filledBoxes = Object.keys(sourceGrid).length;
    const stats = {
      totalBoxes,
      filledBoxes,
      emptyBoxes: Math.max(totalBoxes - filledBoxes, 0),
      isActive: true
    };

    const metadata = {
      ...(sourceSession.data.metadata || {}),
      workspace: targetWorkspaceId
    };

    await updateDoc(targetConfig.gridDocRef, {
      gridData: sourceGrid,
      stats,
      metadata,
      clonedFrom: {
        workspaceId: sourceWorkspaceId,
        sessionId: sourceSession.id,
        clonedAt: serverTimestamp()
      },
      lastModified: serverTimestamp(),
      lastAccessed: serverTimestamp()
    });

    dispatchWorkspaceEvent('p73:workspace-cloned', {
      sourceWorkspaceId,
      targetWorkspaceId,
      sourceSessionId: sourceSession.id,
      targetDocPath: targetConfig.gridDocRef.path
    });

    console.log(`[P73] Workspace ${targetWorkspaceId} inicializován z ${sourceWorkspaceId} (session ${sourceSession.id}).`);
    if (typeof showBanner === 'function') {
      showBanner(`POKUS načten z ${sourceWorkspaceId}.`, 'info', 2600);
    }
    return true;
  } catch (error) {
    console.error('[P73] cloneWorkspaceDataFrom selhalo:', error);
    return false;
  }
}

function ensureWorkspaceBaseline(workspaceId, options) {
  if (workspaceId !== 'pokus') return Promise.resolve(false);
  return cloneWorkspaceDataFrom('elektrocz', workspaceId, options);
}

 async function updateBoxDataInFirestore(position, dataToSave) {
     if (!gridDocRef) return;
     const { updateDoc, getDoc, serverTimestamp, doc: fbDoc } = window.firebase;

     if (dataToSave === null) {
         const docSnap = await getDoc(gridDocRef);
         if (docSnap.exists()) {
             const updatedGridData = { ...docSnap.data().gridData };
             delete updatedGridData[position];
             await updateDoc(gridDocRef, {
                 gridData: updatedGridData,
                 'lastModified': serverTimestamp()
             });
            if (workspaceAllowsSetups()) {
              workspaceActiveSetup[currentWorkspace] = null;
              renderWorkspaceSetups();
            }
         }
         return;
     }

     const docSnap = await getDoc(gridDocRef);
     if (!docSnap.exists()) return;

    const gridData = docSnap.data().gridData || {};
    const hadContentBefore = Object.keys(gridData).length > 0;
    const existingData = gridData[position] || {};
    const mergedData = { ...existingData, ...dataToSave, updatedAt: serverTimestamp() };

    await updateDoc(gridDocRef, {
        [`gridData.${position}`]: mergedData,
        'lastModified': serverTimestamp()
    });
    maybeTriggerFirstContentAutosave({ hadContentBefore, mergedData });
    if (workspaceAllowsSetups()) {
      workspaceActiveSetup[currentWorkspace] = null;
      renderWorkspaceSetups();
    }
}

 async function swapBoxDataInFirestore(pos1, pos2) {
     if (!gridDocRef) return false;
     const { getDoc, updateDoc, serverTimestamp } = window.firebase;
     const docSnap = await getDoc(gridDocRef);
     if (!docSnap.exists()) return false;

     const gridData = docSnap.data().gridData || {};
     const data1 = gridData[pos1] ? { ...gridData[pos1] } : null;
     const data2 = gridData[pos2] ? { ...gridData[pos2] } : null;

     const updates = {};
     updates[`gridData.${pos1}`] = data2;
     updates[`gridData.${pos2}`] = data1;
     if(updates[`gridData.${pos1}`]) updates[`gridData.${pos1}`].updatedAt = serverTimestamp();
     if(updates[`gridData.${pos2}`]) updates[`gridData.${pos2}`].updatedAt = serverTimestamp();
     updates.lastModified = serverTimestamp();

     await updateDoc(gridDocRef, updates);
     if (workspaceAllowsSetups()) {
       workspaceActiveSetup[currentWorkspace] = null;
       renderWorkspaceSetups();
     }
     console.log(`✅ Swapped data in Firestore: ${pos1} ↔ ${pos2}`);
     return true;
 }

async function archiveAndDeleteBox(position){
 if(!gridDocRef) return;
 const { getDoc, addDoc, collection, serverTimestamp } = window.firebase;
 try {
   const snap = await getDoc(gridDocRef);
   if(!snap.exists()) return;
   const gridData = snap.data().gridData || {};
   const boxData = gridData[position];
   // Pokud není co archivovat, jen smažeme (bude řešit updateBoxDataInFirestore)
   if(!boxData){
     await updateBoxDataInFirestore(position, null);
     return;
   }
   const retentionMs = ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
   try {
     await addDoc(collection(window.firebase.db, ARCHIVE_COLLECTION), {
       userId: currentUser?.uid || null,
       workspaceId: currentWorkspace,
       sessionId,
       position,
       deletedAt: serverTimestamp(),
       expiresAt: new Date(Date.now() + retentionMs), // Pro Firestore TTL (nutno povolit)
       data: boxData,
       version: '2.0'
     });
   } catch(archiveErr){
     console.error('❌ Archivace selhala (proběhne jen přímé smazání):', archiveErr);
   }
   await updateBoxDataInFirestore(position, null);
   console.log(`🗑️ Box ${position} archivován a odstraněn.`);
 } catch(e){
   console.error('❌ archiveAndDeleteBox error:', e);
 }
}

// DUPLICATE BLOCK REMOVED ABOVE (archive list, deferred tasks, calendar, formatBytes duplicate)

async function fetchStorageTopLevelSummary(){
 const { storage, ref, listAll, getMetadata, getDownloadURL } = window.firebase;
 const rootRef = ref(storage);
 const rootList = await listAll(rootRef);

 const folders = await Promise.all(rootList.prefixes.map(async (prefix) => {
   let childList;
   try {
     childList = await listAll(prefix);
   } catch (err) {
     console.warn('⚠️ listAll failed for', prefix.fullPath, err);
     childList = { prefixes: [], items: [] };
   }
   const sampleItems = await Promise.all(childList.items.slice(0, 6).map(async (itemRef) => {
     let size = null;
     let contentType = null;
     let previewUrl = null;
     try {
       const metadata = await getMetadata(itemRef);
       size = metadata?.size ?? null;
       contentType = metadata?.contentType ?? null;
       if (contentType && contentType.startsWith('image/')) {
         try {
           previewUrl = await getDownloadURL(itemRef);
         } catch (previewErr) {
           console.warn('⚠️ getDownloadURL failed for', itemRef.fullPath, previewErr);
         }
       }
     } catch (metaErr) {
       console.warn('⚠️ getMetadata failed for', itemRef.fullPath, metaErr);
     }
     return {
       name: itemRef.name,
       path: itemRef.fullPath,
       size,
       contentType,
       previewUrl
     };
   }));
   let approxSize = 0;
   await Promise.all(childList.items.slice(0, 25).map(async (itemRef) => {
     try {
       const metadata = await getMetadata(itemRef);
       approxSize += metadata?.size || 0;
     } catch (metaErr) {
       console.warn('⚠️ getMetadata failed for', itemRef.fullPath, metaErr);
     }
   }));
   return {
     name: prefix.name,
     path: prefix.fullPath,
     folderCount: childList.prefixes.length,
     fileCount: childList.items.length,
     sampleItems,
     approxSize
   };
 }));

 const files = await Promise.all(rootList.items.map(async (itemRef) => {
   let size = null;
   let contentType = null;
   try {
     const metadata = await getMetadata(itemRef);
     size = metadata?.size ?? null;
     contentType = metadata?.contentType ?? null;
   } catch (err) {
     console.warn('⚠️ getMetadata failed for', itemRef.fullPath, err);
   }
   return {
     name: itemRef.name,
     path: itemRef.fullPath,
     size,
     contentType
   };
 }));

 return { folders, files };
}

function renderAssetsOverview(summary){
 const contentEl = document.getElementById('assets-view-content');
 const emptyEl = document.getElementById('assets-view-empty');
 if (!contentEl || !emptyEl) return;

 if (!summary || (!summary.folders.length && !summary.files.length)) {
   contentEl.innerHTML = '';
   emptyEl.textContent = 'V kořenovém adresáři Firebase Storage nejsou žádná data.';
   return;
 }

 emptyEl.textContent = '';
 contentEl.innerHTML = '';

 summary.folders.forEach(folder => {
   const card = document.createElement('div');
   card.className = 'assets-view-card';
   card.dataset.assetPath = folder.path;
   card.dataset.assetType = 'folder';
   card.innerHTML = `
     <h4>📁 ${folder.name}</h4>
     <dl>
       <dt>Cesta</dt><dd>${folder.path}</dd>
       <dt>Složky</dt><dd>${folder.folderCount}</dd>
       <dt>Soubory</dt><dd>${folder.fileCount}</dd>
       <dt>Velikost (≈)</dt><dd>${folder.approxSize ? formatBytes(folder.approxSize) : '—'}</dd>
     </dl>
     <div class='assets-view-preview'></div>
   `;
   contentEl.appendChild(card);
   const previewEl = card.querySelector('.assets-view-preview');
   if (previewEl && folder.sampleItems.length){
     folder.sampleItems.forEach(sample => {
       const item = document.createElement('div');
       item.className = 'assets-preview-item';
       const nameEl = document.createElement('div');
       nameEl.className = 'assets-preview-name';
       nameEl.textContent = sample.name;
       const sizeEl = document.createElement('div');
       sizeEl.textContent = sample.size ? formatBytes(sample.size) : '';
       if (sample.previewUrl){
         const thumb = document.createElement('img');
         thumb.className = 'assets-preview-thumb';
         thumb.alt = sample.name;
         thumb.loading = 'lazy';
         thumb.src = sample.previewUrl;
         item.appendChild(thumb);
       }
       item.appendChild(nameEl);
       if (sizeEl.textContent) item.appendChild(sizeEl);
       previewEl.appendChild(item);
     });
   }
 });

 summary.files.forEach(file => {
   const card = document.createElement('div');
   card.className = 'assets-view-card';
   card.dataset.assetPath = file.path;
   card.dataset.assetType = 'file';
   card.innerHTML = `
     <h4>📄 ${file.name}</h4>
     <dl>
       <dt>Cesta</dt><dd>${file.path}</dd>
       <dt>Typ</dt><dd>${file.contentType || '—'}</dd>
       <dt>Velikost</dt><dd>${file.size ? formatBytes(file.size) : '—'}</dd>
     </dl>
   `;
   contentEl.appendChild(card);
 });
}

async function loadAssetsOverview(force = false){
 const contentEl = document.getElementById('assets-view-content');
 const emptyEl = document.getElementById('assets-view-empty');
 if (!contentEl || !emptyEl) return;

 if (!isFirebaseReady || !currentUser) {
   contentEl.innerHTML = '';
   emptyEl.textContent = 'Pro zobrazení obsahu Storage se přihlaste.';
   return;
 }

 if (assetsLoading) return;
 if (assetsLoadedOnce && !force) return;

 assetsLoading = true;
 emptyEl.textContent = '';
 contentEl.innerHTML = '<div class="text-sm text-gray-500">Načítám obsah Firebase Storage...</div>';

 try {
 const summary = await fetchStorageTopLevelSummary();
 renderAssetsOverview(summary);
 assetsSummaryCache = summary;
 assetsLoadedOnce = true;
} catch (err) {
   console.error('❌ loadAssetsOverview error', err);
   contentEl.innerHTML = '';
   emptyEl.textContent = 'Obsah se nepodařilo načíst. Zkuste to prosím znovu.';
 } finally {
   assetsLoading = false;
 }
}

function renderGalleryView(files){
 const gridEl = document.getElementById('gallery-view-grid');
 const emptyEl = document.getElementById('gallery-view-empty');
 if (!gridEl || !emptyEl) return;
 if (!files || !files.length){
   gridEl.innerHTML = '';
   emptyEl.textContent = 'Žádné obrázky se nepodařilo najít.';
   return;
 }
 emptyEl.textContent = '';
 gridEl.innerHTML = '';
 files.forEach(file => {
   const card = document.createElement('div');
   card.className = 'gallery-item';
   const img = document.createElement('img');
   img.loading = 'lazy';
   img.alt = file.name;
   img.src = file.url || '';
   if (!file.url) img.style.display = 'none';
   card.appendChild(img);
   const meta = document.createElement('div');
   meta.className = 'meta';
   meta.innerHTML = `
     <strong>${file.name}</strong>
     <span>${file.contentType || '—'}</span>
     <span>${file.size ? formatBytes(file.size) : '—'}</span>
     <span>${file.path}</span>
   `;
   const deleteBtn = document.createElement('button');
   deleteBtn.className = 'gallery-delete-btn';
   deleteBtn.textContent = 'Smazat';
   deleteBtn.addEventListener('click', (event) => {
     event.stopPropagation();
     deleteGalleryFile(file);
   });
   meta.appendChild(deleteBtn);
   card.appendChild(meta);
   gridEl.appendChild(card);
 });
}

function updateGalleryFilterOptions(files){
 const filterSelect = document.getElementById('gallery-filter');
 if (!filterSelect) return;
 const options = new Set(['all']);
 (files || []).forEach(file => {
   const key = file.topLevel || GALLERY_ROOT_LABEL;
   options.add(key);
 });
 const previous = galleryFilterPrefix;
 filterSelect.innerHTML = '';
 options.forEach(value => {
   const option = document.createElement('option');
   option.value = value;
   option.textContent = value === 'all' ? 'Všechny složky' : (value === GALLERY_ROOT_LABEL ? 'Kořen (root)' : value);
   filterSelect.appendChild(option);
 });
 if (!options.has(previous)) {
   galleryFilterPrefix = 'all';
 }
 filterSelect.value = galleryFilterPrefix;
}

function applyGalleryFilters(){
 if (!galleryCache) return [];
 let filtered = galleryCache;
 if (galleryFilterPrefix !== 'all'){
   filtered = filtered.filter(file => (file.topLevel || GALLERY_ROOT_LABEL) === galleryFilterPrefix);
 }
 filtered = [...filtered].sort((a, b) => {
   const sizeA = a.size || 0;
   const sizeB = b.size || 0;
   return gallerySortOrder === 'asc' ? sizeA - sizeB : sizeB - sizeA;
 });
 return filtered;
}

async function loadGalleryOverview(force = false){
 const gridEl = document.getElementById('gallery-view-grid');
 const emptyEl = document.getElementById('gallery-view-empty');
 if (!gridEl || !emptyEl) return;

 if (!isFirebaseReady || !currentUser) {
   gridEl.innerHTML = '';
   emptyEl.textContent = 'Pro zobrazení galerie se přihlaste.';
   return;
 }

 if (galleryLoading) return;
 if (galleryLoadedOnce && !force && galleryCache) {
   updateGalleryFilterOptions(galleryCache);
   renderGalleryView(applyGalleryFilters());
   return;
 }

 galleryLoading = true;
 emptyEl.textContent = 'Načítám obrázky z Firebase Storage...';
 gridEl.innerHTML = '';

 try {
   const { storage, ref } = window.firebase;
   const rootRef = ref(storage);
   const files = await collectFilesRecursively(rootRef, { limit: 300, imagesOnly: true });
   galleryCache = files;
   galleryLoadedOnce = true;
   updateGalleryFilterOptions(files);
   renderGalleryView(applyGalleryFilters());
 } catch (err) {
   console.error('❌ loadGalleryOverview error', err);
   gridEl.innerHTML = '';
   emptyEl.textContent = 'Galerii se nepodařilo načíst. Zkuste to prosím znovu.';
 } finally {
   galleryLoading = false;
 }
}

// Duplicate gallery & restoreArchivedBox block removed

 async function uploadImageToStorage(fileOrBlob, position) {
     const { storage, ref, uploadBytesResumable, getDownloadURL } = window.firebase;

     const mime = (fileOrBlob.type && fileOrBlob.type.startsWith('image/')) ? fileOrBlob.type : 'image/png';
     const imageId = `img_${Date.now()}_${position}`;
     const fileExtension = mime.split('/')[1] || 'png';
     const fileName = `${imageId}.${fileExtension}`;
     const storagePath = `project73-images/${sessionId}/${fileName}`;
     const storageRef = ref(storage, storagePath);
     const metadata = { contentType: mime };

     const uploadTask = uploadBytesResumable(storageRef, fileOrBlob, metadata);

     return new Promise((resolve, reject) => {
         let progressStarted = false;
         const timeoutDuration = 15000; 

         const timeoutId = setTimeout(() => {
             if (!progressStarted) {
                 uploadTask.cancel(); 
                 console.error(`❌ Upload pro ${position} vypršel po ${timeoutDuration}ms.`);
                 reject(new Error('Upload timed out'));
             }
         }, timeoutDuration);

         uploadTask.on('state_changed',
             (snapshot) => {
               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
               if (snapshot.bytesTransferred > 0 && !progressStarted) {
                   progressStarted = true;
                   clearTimeout(timeoutId); 
               }
             }, 
             (error) => { 
                 clearTimeout(timeoutId); 
                 console.error(`❌ Upload pro ${position} selhal:`, error.code, error.message);

                 switch (error.code) {
                     case 'storage/unauthorized':
                         showBanner("Chyba: Nedostatečná oprávnění pro nahrání souboru.", "error");
                         break;
                     case 'storage/canceled':
                         if (!progressStarted) showBanner("Nahrávání trvá příliš dlouho.", "error");
                         break;
                     default:
                         showBanner("Neznámá chyba při nahrávání.", "error");
                         break;
                 }
                 reject(error); 
             },
             async () => {
                 clearTimeout(timeoutId); 
                 try {
                     const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                     console.log(`✅ Soubor pro ${position} nahrán:`, downloadURL);
                     resolve({ url: downloadURL, id: imageId, fileName });
                 } catch(e) {
                     console.error(`❌ Chyba při získávání URL pro ${position}:`, e);
                     reject(e);
                 }
             }
         );
     });
 }

 async function processUploadQueue() {
     if (!isFirebaseReady || uploadQueue.length === 0) return;

     while (uploadQueue.length > 0) {
         const { blob, position, localUrl } = uploadQueue.shift();
         try {
             const imageData = await uploadImageToStorage(blob, position);

             const box = document.querySelector(`[data-position="${position}"]`);
             if (box && box.style.backgroundImage.includes(localUrl)) {
                 box.style.backgroundImage = `url(${imageData.url})`;
             }

             await updateBoxDataInFirestore(position, {
                 hasImage: true, imageUrl: imageData.url, imageId: imageData.id,
                 hasText: false, text: '', hasColor: false
             });
             console.log(`✅ Queued image uploaded and saved for ${position}`);
         } catch (error) {
             console.error(`❌ Failed to process upload queue for ${position}:`, error);
             const box = document.querySelector(`[data-position="${position}"]`);
             if (box) box.style.outline = '2px solid red';
         }
     }
 }

// ================================================================
// Helper: Komprese / resize obrázku na klientu před uploadem
// - Zachová typ JPEG/PNG, ale větší PNG převádí na JPEG kvůli úspoře
// - maxWidth / maxHeight: omezení delší hrany
// - quality: 0..1 (použito jen pro JPEG/WebP)
// Vrací Promise<Blob>
async function compressImageIfNeeded(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = {}) {
 if (!(file instanceof Blob)) return file;
 // Pokud je soubor menší než ~600KB, neřešíme (rychlejší)
 if (file.size < 600 * 1024) return file;
 const originalType = file.type || 'image/jpeg';
 const convertToJpeg = !/\b(jpeg|jpg|webp)\b/i.test(originalType);

 const arrayBuf = await file.arrayBuffer();
 const blobUrl = URL.createObjectURL(new Blob([arrayBuf]));
 const img = await new Promise((res, rej) => {
   const i = new Image();
   i.onload = () => res(i);
   i.onerror = rej;
   i.src = blobUrl;
 });
 URL.revokeObjectURL(blobUrl);

 let { width, height } = img;
 const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
 if (ratio < 1) { width = Math.round(width * ratio); height = Math.round(height * ratio); }

 const canvas = document.createElement('canvas');
 canvas.width = width; canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, width, height);

 const mime = convertToJpeg ? 'image/jpeg' : (originalType === 'image/png' && file.size > 2*1024*1024 ? 'image/jpeg' : originalType);

 const blobCompressed = await new Promise(resolve => canvas.toBlob(b => resolve(b || file), mime, quality));
 // Pokud komprese nepomohla (větší než originál), vrať originál
 if (blobCompressed.size >= file.size) return file;
 return blobCompressed;
}

function refreshWorkspaceToolbar(){
  const toolbar = document.getElementById('workspace-toolbar');
  if (!toolbar) return;

  const moduleEl = document.getElementById('workspace-toolbar-module');
  let nameEl = document.getElementById('workspace-toolbar-name');
  if (!nameEl) {
    const nameInput = document.getElementById('workspace-toolbar-name-input');
    if (nameInput) {
      const fallbackSpan = document.createElement('span');
      fallbackSpan.id = 'workspace-toolbar-name';
      fallbackSpan.className = 'workspace-toolbar-name';
      nameInput.replaceWith(fallbackSpan);
      nameEl = fallbackSpan;
    }
  }
  const badgeEl = document.getElementById('workspace-toolbar-badge');
  const saveBtn = document.getElementById('workspace-toolbar-save');
  const newBtn = document.getElementById('workspace-toolbar-new');
  const zoomLabelEl = document.getElementById('workspace-zoom-label');
  const zoomOutBtn = document.getElementById('workspace-zoom-out');
  const zoomInBtn = document.getElementById('workspace-zoom-in');

  if (!isFirebaseReady || !currentWorkspace || !workspaceConfigs[currentWorkspace]) {
    toolbar.hidden = true;
    updateArchitektCopyToolbarButton();
    return;
  }

  const moduleName = workspaceConfigs[currentWorkspace]?.name || currentWorkspace;
  if (moduleEl) moduleEl.textContent = moduleName;

  let label = 'New';
  let isDefault = false;

  const supportsSetups = workspaceAllowsSetups();
  if (supportsSetups) {
    const setups = getActiveWorkspaceSetups();
    const activeId = workspaceActiveSetup[currentWorkspace];
    if (activeId) {
      const activeSetup = setups.find((item) => item.id === activeId);
      if (activeSetup) {
        label = activeSetup.label || 'Bez názvu';
        isDefault = !!activeSetup.isDefault;
        delete workspaceToolbarOverrides[currentWorkspace];
      }
    } else {
      label = workspaceToolbarOverrides[currentWorkspace] || label;
    }
  } else {
    label = workspaceToolbarOverrides[currentWorkspace] || label;
    isDefault = false;
  }

  workspaceToolbarState = { label, isDefault };

  if (nameEl) nameEl.textContent = label || 'New';
  if (badgeEl) {
    if (isDefault) {
      badgeEl.textContent = 'Výchozí';
      badgeEl.hidden = false;
    } else {
      badgeEl.hidden = true;
    }
  }

  if (saveBtn) {
    const enabled = supportsSetups;
    saveBtn.hidden = !enabled;
    saveBtn.disabled = !enabled || workspaceSetupsLoading || !gridDocRef;
  }

  if (newBtn) {
    newBtn.disabled = !gridDocRef;
  }

  const toggleBtn = document.getElementById('workspace-setups-toggle');
  if (toggleBtn) {
    const shouldShowToggle = supportsSetups && isFirebaseReady && !!currentUser;
    toggleBtn.hidden = !shouldShowToggle;
    toggleBtn.setAttribute('aria-expanded', shouldShowToggle && workspaceSetupsDrawerOpen ? 'true' : 'false');
  }

  if (zoomLabelEl) {
    const level = GRID_ZOOM_LEVELS[gridZoomIndex] || GRID_ZOOM_LEVELS[1];
    zoomLabelEl.textContent = level.label;
  }
  if (zoomOutBtn) zoomOutBtn.disabled = gridZoomIndex === 0;
  if (zoomInBtn) zoomInBtn.disabled = gridZoomIndex === GRID_ZOOM_LEVELS.length - 1;

  setupWorkspaceModuleEditing();
  setupWorkspaceToolbarNameEditing();
  renderWorkspaceSetups();
  updateArchitektCopyToolbarButton();
  if (!isArchitektWorkspace() && architektCopyPanelOpen) {
    closeArchitektCopyPanel();
  }

  toolbar.hidden = false;
}

function isArchitektWorkspace(workspaceId = currentWorkspace) {
  return workspaceId === ARCHITEKT_WORKSPACE_ID;
}

function updateArchitektCopyToolbarButton() {
  const button = document.getElementById('architekt-copy-open');
  if (!button) return;
  const isArchitekt = isArchitektWorkspace();
  button.hidden = !isArchitekt;
  button.disabled = !isArchitekt || !gridDocRef;
}

function setupArchitektCopyFeature() {
  if (architektCopyInitialized) return;
  const openBtn = document.getElementById('architekt-copy-open');
  const closeBtn = document.getElementById('architekt-copy-close');
  const cancelBtn = document.getElementById('architekt-copy-cancel');
  const panelEl = document.getElementById('architekt-copy-panel');
  const gridEl = document.getElementById('architekt-copy-grid');
  const selectAllEl = document.getElementById('architekt-copy-select-all');
  const copyBtn = document.getElementById('architekt-copy-copy');
  const emptyEl = document.getElementById('architekt-copy-empty');
  const feedbackEl = document.getElementById('architekt-copy-feedback');

  if (!openBtn || !closeBtn || !cancelBtn || !panelEl || !gridEl || !selectAllEl || !copyBtn || !emptyEl || !feedbackEl) {
    return;
  }

  architektCopyInitialized = true;

  openBtn.addEventListener('click', () => {
    if (!isArchitektWorkspace() || architektCopyBusy) return;
    openArchitektCopyPanel();
  });

  closeBtn.addEventListener('click', () => closeArchitektCopyPanel());
  cancelBtn.addEventListener('click', () => closeArchitektCopyPanel());

  panelEl.addEventListener('click', (event) => {
    if (event.target === panelEl) {
      closeArchitektCopyPanel();
    }
  });

  selectAllEl.addEventListener('change', (event) => {
    toggleArchitektSelectAll(!!event.target.checked);
  });

  copyBtn.addEventListener('click', () => handleArchitektCopy());

  gridEl.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-architekt-copy-index]');
    if (!tile) return;
    event.preventDefault();
    const index = Number(tile.dataset.architektCopyIndex);
    if (!Number.isNaN(index)) {
      toggleArchitektCopySelection(index);
    }
  });

  document.addEventListener('keydown', handleArchitektCopyKeydown);

  updateArchitektCopyToolbarButton();
}

function openArchitektCopyPanel() {
  const panelEl = document.getElementById('architekt-copy-panel');
  if (!panelEl) return;
  if (!isArchitektWorkspace()) return;
  if (!architektCopyPanelOpen) {
    architektCopyPanelOpen = true;
    panelEl.hidden = false;
  }
  architektCopySelection.clear();
  updateArchitektCopyFeedback('');
  renderArchitektCopyPanel({ preserveSelection: false });
  const focusTarget = document.getElementById('architekt-copy-copy');
  if (focusTarget && !focusTarget.disabled) {
    focusTarget.focus();
  } else {
    panelEl.querySelector('[data-architekt-copy-index]')?.focus();
  }
}

function closeArchitektCopyPanel() {
  if (!architektCopyPanelOpen) return;
  const panelEl = document.getElementById('architekt-copy-panel');
  if (panelEl) {
    panelEl.hidden = true;
  }
  architektCopyPanelOpen = false;
  architektCopyBusy = false;
  architektCopySelection.clear();
  updateArchitektCopyFeedback('');
  updateArchitektCopyControls();
  const selectAllEl = document.getElementById('architekt-copy-select-all');
  if (selectAllEl) {
    selectAllEl.checked = false;
  }
  document.getElementById('architekt-copy-open')?.focus();
}

function renderArchitektCopyPanel({ preserveSelection = true } = {}) {
  const gridEl = document.getElementById('architekt-copy-grid');
  const emptyEl = document.getElementById('architekt-copy-empty');
  if (!gridEl || !emptyEl) return;

  const previouslySelectedPositions = preserveSelection
    ? Array.from(architektCopySelection).map((index) => architektCopyItems[index]?.position).filter(Boolean)
    : [];
  const previousSelectionSet = new Set(previouslySelectedPositions);

  architektCopyItems = collectArchitektImageItems();
  architektCopySelection.clear();

  const fragments = [];
  architektCopyItems.forEach((item, index) => {
    const selected = previousSelectionSet.has(item.position);
    if (selected) architektCopySelection.add(index);
    const safePos = escapeHtml(item.position);
    const safeTitle = item.title ? escapeHtml(item.title) : '';
    const safeSrc = escapeHtml(item.imageUrl);
    fragments.push(
      `<button type="button" class="architekt-copy-item${selected ? ' selected' : ''}" data-architekt-copy-index="${index}" aria-pressed="${selected ? 'true' : 'false'}" role="listitem">`
      + `<span class="architekt-copy-check">✓</span>`
      + `<span class="architekt-copy-thumb"><img src="${safeSrc}" alt="${safeTitle || safePos}" loading="lazy"></span>`
      + `<span class="architekt-copy-meta"><strong>${safePos}</strong>${safeTitle ? `<span>${safeTitle}</span>` : ''}</span>`
      + `</button>`
    );
  });

  gridEl.innerHTML = fragments.join('');
  emptyEl.hidden = architektCopyItems.length > 0;
  updateArchitektCopyControls();
}

function collectArchitektImageItems() {
  const items = [];
  const source = gridDataCache || {};
  for (const [position, data] of Object.entries(source)) {
    if (!data || typeof data !== 'object') continue;
    const imageUrl = (data.imageUrl || '').toString();
    if (data.hasImage && imageUrl) {
      const titleCandidate = (data.text || data.title || data.label || '').toString().trim();
      items.push({
        position,
        imageUrl,
        title: titleCandidate
      });
    }
  }
  return items.sort((a, b) => a.position.localeCompare(b.position, undefined, { numeric: true }));
}

function toggleArchitektCopySelection(index) {
  if (Number.isNaN(index) || index < 0 || index >= architektCopyItems.length) return;
  if (architektCopySelection.has(index)) {
    architektCopySelection.delete(index);
  } else {
    architektCopySelection.add(index);
  }
  syncArchitektCopySelectionDom();
  updateArchitektCopyControls();
  updateArchitektCopyFeedback('');
}

function toggleArchitektSelectAll(checked) {
  architektCopySelection.clear();
  if (checked) {
    for (let i = 0; i < architektCopyItems.length; i += 1) {
      architektCopySelection.add(i);
    }
  }
  syncArchitektCopySelectionDom();
  updateArchitektCopyControls();
  updateArchitektCopyFeedback('');
}

function syncArchitektCopySelectionDom() {
  document.querySelectorAll('[data-architekt-copy-index]').forEach((el) => {
    const idx = Number(el.dataset.architektCopyIndex);
    const selected = architektCopySelection.has(idx);
    el.classList.toggle('selected', selected);
    el.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function updateArchitektCopyControls() {
  const copyBtn = document.getElementById('architekt-copy-copy');
  const selectAllEl = document.getElementById('architekt-copy-select-all');
  if (!copyBtn || !selectAllEl) return;
  const selectedCount = architektCopySelection.size;
  const total = architektCopyItems.length;
  copyBtn.disabled = architektCopyBusy || selectedCount === 0;
  copyBtn.textContent = selectedCount ? `Kopírovat (${selectedCount})` : 'Kopírovat';
  selectAllEl.disabled = total === 0;
  if (total === 0) {
    selectAllEl.checked = false;
  } else {
    selectAllEl.checked = selectedCount > 0 && selectedCount === total;
  }
}

function updateArchitektCopyFeedback(message = '', type = '') {
  const feedbackEl = document.getElementById('architekt-copy-feedback');
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  feedbackEl.classList.remove('error', 'success');
  if (!message) return;
  if (type === 'error') feedbackEl.classList.add('error');
  if (type === 'success') feedbackEl.classList.add('success');
}

function setArchitektCopyBusy(flag) {
  architektCopyBusy = !!flag;
  updateArchitektCopyControls();
}

async function handleArchitektCopy() {
  if (architektCopyBusy || !architektCopySelection.size) return;
  const indexes = Array.from(architektCopySelection).sort((a, b) => a - b);
  const selectedItems = indexes.map((idx) => architektCopyItems[idx]).filter(Boolean);
  if (!selectedItems.length) return;

  setArchitektCopyBusy(true);
  updateArchitektCopyFeedback('Kopíruji vybrané obrázky do schránky...', '');

  try {
    const result = await copyArchitektImages(selectedItems);
    if (result.mode === 'binary') {
      updateArchitektCopyFeedback('Obrázky jsou ve schránce. Vlož pomocí Ctrl/⌘+V.', 'success');
    } else if (result.mode === 'html-dataurl') {
      updateArchitektCopyFeedback('Obrázky jsou ve schránce jako vložené data (HTML).', 'success');
    } else if (result.mode === 'html-url') {
      updateArchitektCopyFeedback('HTML s odkazy na obrázky je ve schránce (vkládá vzdálené URL).', 'success');
    } else {
      updateArchitektCopyFeedback('Kopírování dokončeno.', 'success');
    }
  } catch (error) {
    console.error('Architekt copy failed', error);
    updateArchitektCopyFeedback(error?.message || 'Kopírování se nepodařilo.', 'error');
  } finally {
    setArchitektCopyBusy(false);
  }
}

async function copyArchitektImages(selection) {
  if (!selection.length) {
    throw new Error('Nevybrali jste žádný obrázek.');
  }
  if (!navigator.clipboard) {
    throw new Error('Clipboard API není v tomto prohlížeči dostupné.');
  }

  const supportsClipboardItem = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function';

  if (supportsClipboardItem) {
    let fetched = [];
    try {
      fetched = await Promise.all(selection.map(async (item) => {
        const blob = await fetchImageAsBlob(item.imageUrl);
        return { blob, item };
      }));

      const clipboardItems = fetched.map(({ blob }) => new ClipboardItem({ [blob.type || 'image/png']: blob }));

      if (clipboardItems.length === 1) {
        await navigator.clipboard.write(clipboardItems);
        return { mode: 'binary' };
      }

      if (navigator.clipboard.writeMany) {
        await navigator.clipboard.writeMany(clipboardItems);
        return { mode: 'binary' };
      }

      // Browser neumí multi-ClipboardItem – pokračuj do fallbacku s vloženým HTML.
      throw new Error('browser-requires-html-fallback');
    } catch (err) {
      if (err?.message !== 'browser-requires-html-fallback') {
        console.warn('Clipboard binary write failed', err);
      }

      if (fetched.length) {
        const htmlParts = await Promise.all(fetched.map(async ({ blob, item }) => {
          const dataUrl = await blobToDataUrl(blob);
          const altText = escapeHtml(item.title || item.position);
          return `<img src="${dataUrl}" alt="${altText}" style="max-width:100%;height:auto;">`;
        }));
        const textParts = selection.map((item) => item.imageUrl).join('\n');

        try {
          const payload = new ClipboardItem({
            'text/html': new Blob([htmlParts.join('<br>')], { type: 'text/html' }),
            'text/plain': new Blob([textParts], { type: 'text/plain' })
          });
          await navigator.clipboard.write([payload]);
          return { mode: 'html-dataurl' };
        } catch (htmlErr) {
          console.warn('Clipboard HTML dataURL fallback failed', htmlErr);
        }
      }
    }
  }

  const directHtmlParts = await Promise.all(selection.map(async (item) => {
    const blob = await fetchImageAsBlob(item.imageUrl);
    const dataUrl = await blobToDataUrl(blob);
    const altText = escapeHtml(item.title || item.position);
    return `<img src="${dataUrl}" alt="${altText}" style="max-width:100%;height:auto;">`;
  }));

  if (supportsClipboardItem) {
    try {
      const payload = new ClipboardItem({
        'text/html': new Blob([directHtmlParts.join('<br>')], { type: 'text/html' })
      });
      await navigator.clipboard.write([payload]);
      return { mode: 'html-dataurl' };
    } catch (err) {
      console.warn('Clipboard HTML fallback failed', err);
    }
  }

  throw new Error('Prohlížeč nepovolil kopírování do schránky.');
}

async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error();
    return await response.blob();
  } catch (error) {
    console.warn('fetchImageAsBlob failed for', url, error);
    throw new Error('Nepodařilo se načíst obrázek ze Storage.');
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Chyba při čtení souboru.'));
    reader.readAsDataURL(blob);
  });
}

function handleArchitektCopyKeydown(event) {
  if (!architektCopyPanelOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeArchitektCopyPanel();
  }
}

function setupWorkspaceModuleEditing(){
  const moduleEl = document.getElementById('workspace-toolbar-module');
  if (!moduleEl || moduleEl.dataset.editModuleBinding === '1') return;
  moduleEl.dataset.editModuleBinding = '1';
  moduleEl.tabIndex = 0;
  moduleEl.setAttribute('role', 'button');
  moduleEl.setAttribute('aria-label', 'Přejmenovat pracovní plochu');
  const handler = (event) => {
    if (event.type === 'click' || (event.type === 'keydown' && (event.key === 'Enter' || event.key === ' '))) {
      event.preventDefault();
      startWorkspaceModuleEdit();
    }
  };
  moduleEl.addEventListener('click', handler);
  moduleEl.addEventListener('keydown', handler);
}

function startWorkspaceModuleEdit(){
  if (workspaceModuleEditActive) return;
  const displayEl = document.getElementById('workspace-toolbar-module');
  if (!displayEl) return;

  workspaceModuleEditActive = true;
  const currentValue = (displayEl.textContent || '').trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'workspace-toolbar-module-input';
  input.className = 'workspace-toolbar-name-input';
  input.value = currentValue;
  displayEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = async (commit) => {
    if (!workspaceModuleEditActive) return;
    workspaceModuleEditActive = false;
    const tentativeValue = commit ? (input.value || '').trim() : currentValue;
    const span = document.createElement('span');
    span.id = 'workspace-toolbar-module';
    span.className = 'workspace-toolbar-module';
    span.textContent = tentativeValue || currentValue || 'Workspace';
    input.replaceWith(span);

    if (commit && tentativeValue && tentativeValue !== currentValue) {
      await applyWorkspaceModuleNameChange(tentativeValue, currentValue);
    } else {
      refreshWorkspaceToolbar();
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => finish(true));
}

async function applyWorkspaceModuleNameChange(newName, previousValue){
  const trimmed = (newName || '').trim();
  const fallback = (previousValue || '').trim() || 'Bez názvu';
  const finalName = trimmed || fallback;
  if (!currentWorkspace) return;
  const config = workspaceConfigs[currentWorkspace];
  if (!config) return;

  const constrained = finalName.length > 80 ? finalName.slice(0, 80) : finalName;
  if (config.name === constrained) {
    refreshWorkspaceToolbar();
    return;
  }

  const oldName = config.name;
  config.name = constrained;

  try {
    if (!userWorkspacesDocRef) {
      throw new Error('userWorkspacesDocRef missing');
    }
    const updatePayload = {};
    updatePayload[`workspaces.${currentWorkspace}.name`] = constrained;
    await window.firebase.updateDoc(userWorkspacesDocRef, updatePayload);
    renderWorkspacePanels();
    refreshWorkspaceToolbar();
    showBanner('Název plochy uložen.', 'info');
  } catch (error) {
    console.error('applyWorkspaceModuleNameChange error', error);
    config.name = oldName;
    refreshWorkspaceToolbar();
    showBanner('Název plochy se nepodařilo uložit.', 'error');
  }
}

function setupWorkspaceToolbarNameEditing(){
  const nameEl = document.getElementById('workspace-toolbar-name');
  if (!nameEl || nameEl.dataset.editBinding === '1') return;
  nameEl.dataset.editBinding = '1';
  nameEl.tabIndex = 0;
  nameEl.setAttribute('role', 'button');
  nameEl.setAttribute('aria-label', 'Přejmenovat sestavu');
  const handler = (event) => {
    if (event.type === 'click' || (event.type === 'keydown' && (event.key === 'Enter' || event.key === ' '))) {
      event.preventDefault();
      startWorkspaceNameEdit();
    }
  };
  nameEl.addEventListener('click', handler);
  nameEl.addEventListener('keydown', handler);
}

function startWorkspaceNameEdit(){
  if (workspaceNameEditActive) return;
  const currentDisplay = document.getElementById('workspace-toolbar-name');
  if (!currentDisplay) return;

  workspaceNameEditActive = true;
  const currentValue = (currentDisplay.textContent || '').trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'workspace-toolbar-name-input';
  input.className = 'workspace-toolbar-name-input';
  input.value = currentValue;
  currentDisplay.replaceWith(input);
  input.focus();
  input.select();

  const finish = async (commit) => {
    if (!workspaceNameEditActive) return;
    workspaceNameEditActive = false;
    const finalValue = commit ? (input.value || '').trim() : currentValue;
    if (commit) {
      await applyWorkspaceNameChange(finalValue || 'New', currentValue);
    } else {
      refreshWorkspaceToolbar();
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => finish(true));
}

async function applyWorkspaceNameChange(newLabel, previousValue){
  const trimmed = (newLabel || '').trim();
  const finalLabel = trimmed || 'New';
  if (!currentWorkspace) return;

  workspaceToolbarOverrides[currentWorkspace] = finalLabel;
  workspaceToolbarState.label = finalLabel;

  if (workspaceAllowsSetups()) {
    const activeId = workspaceActiveSetup[currentWorkspace];
    if (activeId) {
      try {
        const { db, doc, updateDoc, serverTimestamp } = window.firebase;
        await updateDoc(doc(db, WORKSPACE_SETUPS_COLLECTION, activeId), {
          label: finalLabel,
          updatedAt: serverTimestamp()
        });
        delete workspaceToolbarOverrides[currentWorkspace];
        showBanner('Název sestavy upraven.', 'info');
        refreshWorkspaceToolbar();
        return;
      } catch (error) {
        console.error('renameWorkspaceSetup error', error);
        showBanner('Název se nepodařilo změnit.', 'error');
      }
    }
  }

  refreshWorkspaceToolbar();
}

function applyGridZoom(index){
  if (!Array.isArray(GRID_ZOOM_LEVELS) || GRID_ZOOM_LEVELS.length === 0) return;
  gridZoomIndex = Math.min(Math.max(index, 0), GRID_ZOOM_LEVELS.length - 1);
  const level = GRID_ZOOM_LEVELS[gridZoomIndex];
  const root = document.documentElement;
  root.style.setProperty('--cell-min', `${level.cellMin}px`);
  root.style.setProperty('--box-height', `${level.boxHeight}px`);
  root.style.setProperty('--box-height-lg', `${level.boxHeightLg}px`);
  const zoomLabelEl = document.getElementById('workspace-zoom-label');
  if (zoomLabelEl) zoomLabelEl.textContent = level.label;
  const zoomOutBtn = document.getElementById('workspace-zoom-out');
  const zoomInBtn = document.getElementById('workspace-zoom-in');
  if (zoomOutBtn) zoomOutBtn.disabled = gridZoomIndex === 0;
  if (zoomInBtn) zoomInBtn.disabled = gridZoomIndex === GRID_ZOOM_LEVELS.length - 1;
  try { localStorage.setItem(GRID_ZOOM_STORAGE_KEY, String(gridZoomIndex)); } catch (_) {}
  refreshWorkspaceToolbar();
}

function promptSaveCurrentWorkspace(){
  if (!isFirebaseReady || !gridDocRef) {
    showBanner('Firebase ještě není připraven.', 'error');
    return;
  }
  if (!workspaceAllowsSetups()) {
    showBanner('Ukládání sestavy není pro tuto plochu povolené.', 'error');
    return;
  }
  const todaySuggestion = `Sestava ${new Date().toLocaleDateString('cs-CZ')}`;
  const suggested = workspaceToolbarOverrides[currentWorkspace] || workspaceToolbarState.label || todaySuggestion;
  const label = prompt('Zadej název uložené sestavy:', suggested);
  if (label === null) return;
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    showBanner('Název sestavy nesmí být prázdný.', 'error');
    return;
  }
  const setAsDefault = confirm('Nastavit tuto sestavu jako výchozí?');
  saveCurrentWorkspaceSetup({ label: trimmedLabel, setAsDefault });
}

 // =================================================================================
// --- Workspace setups ---
 // =================================================================================
 function detachWorkspaceSetupsListener(){
   if (typeof workspaceSetupsUnsubscribe === 'function') {
     try { workspaceSetupsUnsubscribe(); } catch (_) {}
   }
   workspaceSetupsUnsubscribe = null;
 }

function getActiveWorkspaceSetups(){
  return workspaceSetupsState[currentWorkspace] || [];
}

function normalizeWorkspaceSetupDoc(docSnap) {
  const data = docSnap.data() || {};
  let createdAt = null;
  let updatedAt = null;
  if (data.createdAt?.toDate) createdAt = data.createdAt.toDate();
  else if (data.createdAt) createdAt = new Date(data.createdAt);
  if (data.updatedAt?.toDate) updatedAt = data.updatedAt.toDate();
  else if (data.updatedAt) updatedAt = new Date(data.updatedAt);
  return {
    id: docSnap.id,
    workspaceId: data.workspaceId || '',
    ownerId: data.ownerId || null,
    sessionId: data.sessionId || null,
    label: data.label || 'Bez názvu',
    isDefault: !!data.isDefault,
    gridData: data.gridData || {},
    createdAt,
    updatedAt
  };
}

function syncWorkspaceSetupsForCurrent(workspaceId, setups){
  if (!workspaceId) return;
  workspaceSetupsState[workspaceId] = Array.isArray(setups) ? setups : [];
  if (workspaceId !== currentWorkspace) {
    return;
  }

  refreshWorkspaceToolbar();

  if (
    workspaceSetupsState[workspaceId].length > 1 ||
    workspaceSetupsState[workspaceId].some((item) => (item.label || '').toLowerCase() === WORKSPACE_AUTOSAVE_LABEL)
  ) {
    setWorkspaceAutosaveStatus(workspaceId, 'done');
  }

  if (!workspaceSetupsState[workspaceId].length) {
    ensureDefaultWorkspaceSetup();
  } else if (
    !workspaceSetupsState[workspaceId].some((item) => item.isDefault) &&
    !workspaceSetDefaultInProgress
  ) {
    const fallback = workspaceSetupsState[workspaceId][0];
    if (fallback) setWorkspaceSetupAsDefault(fallback.id);
  } else {
    const defaults = workspaceSetupsState[workspaceId].filter((item) => item.isDefault);
    if (defaults.length > 1) {
      const status = workspaceDefaultResolutionState[workspaceId] || 'idle';
      const attempts = workspaceDefaultResolutionAttempts[workspaceId] || 0;
      if (status === 'failed' || attempts >= 3) {
        workspaceDefaultResolutionState[workspaceId] = 'failed';
      } else if (status !== 'running' && status !== 'cooldown' && !workspaceSetDefaultInProgress) {
        const preferred = defaults.find((item) => item.id === workspaceActiveSetup[workspaceId]) || defaults[0];
        if (preferred) {
          workspaceDefaultResolutionState[workspaceId] = 'running';
          workspaceDefaultResolutionAttempts[workspaceId] = attempts + 1;
          setWorkspaceSetupAsDefault(preferred.id, { silent: true })
            .catch((error) => {
              console.warn('workspace default auto-resolution failed', error);
              workspaceDefaultResolutionState[workspaceId] = 'failed';
            });
        }
      }
    } else {
      workspaceDefaultResolutionState[workspaceId] = 'idle';
      if (workspaceDefaultResolutionTimers[workspaceId]) {
        clearTimeout(workspaceDefaultResolutionTimers[workspaceId]);
        delete workspaceDefaultResolutionTimers[workspaceId];
      }
      delete workspaceDefaultResolutionAttempts[workspaceId];
    }
  }

  const pendingId = workspacePendingActiveSetup[workspaceId];
  if (pendingId) {
    workspaceActiveSetup[workspaceId] = pendingId;
    workspacePendingActiveSetup[workspaceId] = null;
  } else if (!workspaceActiveSetup[workspaceId] && workspaceSetupsState[workspaceId].length) {
    const defaultSetup = workspaceSetupsState[workspaceId].find((item) => item.isDefault);
    if (defaultSetup) workspaceActiveSetup[workspaceId] = defaultSetup.id;
  }

  if (workspaceSetDefaultInProgress || workspaceDefaultResolutionState[workspaceId] === 'running' || workspaceDefaultResolutionState[workspaceId] === 'cooldown') {
    return;
  }

  renderWorkspaceSetups();
  refreshWorkspaceToolbar();
}

function maybeMigrateLegacySetup(docId, setup, targetWorkspaceId){
  if (!isFirebaseReady || !targetWorkspaceId || !setup) return;
  if (workspaceLegacyMigrationAttempts.has(docId)) return;
  const ownerAllowed = !setup.ownerId || setup.ownerId === currentUser?.uid;
  if (!ownerAllowed) return;

  const hasAliasMatch = setup.workspaceId
    ? matchesWorkspaceAlias(setup.workspaceId, targetWorkspaceId)
    : belongsToWorkspaceSetup(setup, targetWorkspaceId);

  const needsUpdate = (!setup.workspaceId && hasAliasMatch) || (
    setup.workspaceId && hasAliasMatch && setup.workspaceId !== targetWorkspaceId
  );
  if (!needsUpdate) return;

  try {
    const { db, doc, updateDoc, serverTimestamp } = window.firebase;
    workspaceLegacyMigrationAttempts.add(docId);
    updateDoc(doc(db, WORKSPACE_SETUPS_COLLECTION, docId), {
      workspaceId: targetWorkspaceId,
      updatedAt: serverTimestamp()
    }).catch((err) => {
      console.warn('workspace legacy migration failed', err);
    }).finally(() => {
      workspaceLegacyMigrationAttempts.delete(docId);
    });
  } catch (error) {
    console.warn('workspace legacy migration error', error);
    workspaceLegacyMigrationAttempts.delete(docId);
  }
}

function openWorkspaceSetupsDrawer(updateState = true){
  const drawer = document.getElementById('workspace-setups-drawer');
  const toggleBtn = document.getElementById('workspace-setups-toggle');
  if (!drawer) return;
  if (!workspaceAllowsSetups() || !isFirebaseReady || !currentUser) {
    closeWorkspaceSetupsDrawer();
    return;
  }
  drawer.hidden = false;
  if (updateState) workspaceSetupsDrawerOpen = true;
  toggleBtn?.setAttribute('aria-expanded', 'true');
}

function closeWorkspaceSetupsDrawer(updateState = true){
  const drawer = document.getElementById('workspace-setups-drawer');
  const toggleBtn = document.getElementById('workspace-setups-toggle');
  if (drawer) drawer.hidden = true;
  if (updateState) workspaceSetupsDrawerOpen = false;
  toggleBtn?.setAttribute('aria-expanded', 'false');
}

function toggleWorkspaceSetupsDrawer(){
  if (!workspaceAllowsSetups() || !isFirebaseReady || !currentUser) return;
  if (workspaceSetupsDrawerOpen) {
    closeWorkspaceSetupsDrawer();
  } else {
    openWorkspaceSetupsDrawer();
  }
  renderWorkspaceSetups();
}

function renderWorkspaceSetups(){
 const wrapper = document.getElementById('workspace-toolbar-setups');
 const selectEl = document.getElementById('workspace-setup-select');
 const loadBtn = document.getElementById('workspace-setup-load');
 const defaultBtn = document.getElementById('workspace-setup-default');
 const deleteBtn = document.getElementById('workspace-setup-delete');
 const toggleBtn = document.getElementById('workspace-setups-toggle');
 const listEl = document.getElementById('workspace-setups-list');
 const emptyEl = document.getElementById('workspace-setups-empty');
 if (!wrapper || !selectEl || !loadBtn || !defaultBtn || !deleteBtn) return;

const supportsSetups = workspaceAllowsSetups();
const ready = isFirebaseReady && !!currentUser && supportsSetups;
const setups = supportsSetups ? getActiveWorkspaceSetups() : [];
const activeSetupId = workspaceActiveSetup[currentWorkspace] || workspacePendingActiveSetup[currentWorkspace] || null;

const renderSignature = JSON.stringify({
  workspace: currentWorkspace,
  ready,
  loading: workspaceSetupsLoading,
  error: !!workspaceSetupsError,
  drawerOpen: workspaceSetupsDrawerOpen,
  toggleHidden: !ready,
  activeId: activeSetupId,
  pendingId: workspacePendingActiveSetup[currentWorkspace] || null,
  setups: setups.map((item) => ({ id: item.id, isDefault: !!item.isDefault, label: item.label || '' })),
  setDefaultInProgress: workspaceSetDefaultInProgress,
  attempts: workspaceDefaultResolutionAttempts[currentWorkspace] || 0,
  state: workspaceDefaultResolutionState[currentWorkspace] || 'idle'
});

const cacheMatch = workspaceSetupsRenderCache[currentWorkspace] === renderSignature;
if (cacheMatch && workspaceSetupsCurrentDomWorkspace === currentWorkspace) {
  return;
}
workspaceSetupsRenderCache[currentWorkspace] = renderSignature;
workspaceSetupsCurrentDomWorkspace = currentWorkspace;
wrapper.hidden = !ready;
if (toggleBtn) toggleBtn.hidden = !ready;

  if (!ready) {
    selectEl.innerHTML = '';
    selectEl.disabled = true;
    loadBtn.disabled = true;
    defaultBtn.disabled = true;
    deleteBtn.disabled = true;
    if (emptyEl) {
      emptyEl.textContent = '';
      emptyEl.hidden = true;
    }
    if (listEl) listEl.innerHTML = '';
    closeWorkspaceSetupsDrawer();
    return;
  }

 if (workspaceSetupsDrawerOpen) {
   openWorkspaceSetupsDrawer(false);
 } else {
   closeWorkspaceSetupsDrawer(false);
 }

if (workspaceSetupsLoading) {
  selectEl.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = 'Načítám sestavy…';
  selectEl.appendChild(option);
  selectEl.disabled = true;
  loadBtn.disabled = true;
  defaultBtn.disabled = true;
  deleteBtn.disabled = true;
  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'Načítám uložené plochy…';
  }
  if (listEl) listEl.innerHTML = '';
  if (toggleBtn) {
    const labelEl = toggleBtn.querySelector('.workspace-setups-toggle-label');
    if (labelEl) labelEl.textContent = 'Uložené plochy';
  }
  return;
}

if (workspaceSetupsError) {
  selectEl.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = 'Chyba při načítání';
  selectEl.appendChild(option);
  selectEl.disabled = true;
  loadBtn.disabled = true;
  defaultBtn.disabled = true;
  deleteBtn.disabled = true;
  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'Chyba při načítání uložených ploch.';
  }
  if (listEl) listEl.innerHTML = '';
  if (toggleBtn) {
    const labelEl = toggleBtn.querySelector('.workspace-setups-toggle-label');
    if (labelEl) labelEl.textContent = 'Uložené plochy';
  }
  return;
}

 if (toggleBtn) {
   const labelEl = toggleBtn.querySelector('.workspace-setups-toggle-label');
   if (labelEl) {
     labelEl.textContent = setups.length
       ? `Uložené plochy (${setups.length})`
       : 'Uložené plochy';
   }
 }
 selectEl.innerHTML = '';

 if (!setups.length) {
   const option = document.createElement('option');
   option.value = '';
   option.textContent = 'Žádné uložené sestavy';
  selectEl.appendChild(option);
  selectEl.disabled = true;
  loadBtn.disabled = true;
  defaultBtn.disabled = true;
  deleteBtn.disabled = true;
  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'Zatím nemáš žádné uložené plochy.';
  }
  if (listEl) listEl.innerHTML = '';
  return;
}

 selectEl.disabled = false;
const activeId = activeSetupId || '';
let hasActive = false;

setups.forEach((setup) => {
  const option = document.createElement('option');
   option.value = setup.id;
   option.textContent = setup.label ? setup.label : 'Bez názvu';
   if (setup.isDefault) {
     option.textContent += ' • výchozí';
   }
   option.dataset.isDefault = setup.isDefault ? '1' : '0';
   selectEl.appendChild(option);
   if (setup.id === activeId) {
     hasActive = true;
   }
 });

 if (hasActive) {
   selectEl.value = activeId;
 } else {
   selectEl.value = setups[0].id;
 }

 updateWorkspaceSetupToolbarState();

 if (listEl && emptyEl) {
   emptyEl.hidden = true;
  listEl.innerHTML = '';
  setups.forEach((setup) => {
     const card = document.createElement('article');
     card.className = 'workspace-setup-card';
     if (activeSetupId === setup.id) card.classList.add('is-active');
     if (setup.isDefault) card.classList.add('is-default');
     card.dataset.setupId = setup.id;

     const title = document.createElement('div');
     title.className = 'workspace-setup-card-title';
     title.textContent = setup.label || 'Bez názvu';

     if (setup.isDefault) {
       const defaultBadge = document.createElement('span');
       defaultBadge.className = 'workspace-setup-badge';
       defaultBadge.textContent = 'Výchozí';
       title.appendChild(defaultBadge);
     }

     if (activeSetupId === setup.id) {
       const activeBadge = document.createElement('span');
       activeBadge.className = 'workspace-setup-badge';
       activeBadge.textContent = 'Aktivní';
       title.appendChild(activeBadge);
     }

     card.appendChild(title);

     if (setup.createdAt instanceof Date || setup.updatedAt instanceof Date) {
       const meta = document.createElement('div');
       meta.className = 'workspace-setup-meta';
       if (setup.createdAt instanceof Date) {
         const createdSpan = document.createElement('span');
         createdSpan.textContent = `Vytvořeno ${setup.createdAt.toLocaleDateString('cs-CZ')}`;
         meta.appendChild(createdSpan);
       }
       if (setup.updatedAt instanceof Date) {
         const updatedSpan = document.createElement('span');
         updatedSpan.textContent = `Aktualizováno ${setup.updatedAt.toLocaleDateString('cs-CZ')}`;
         meta.appendChild(updatedSpan);
       }
       if (meta.childNodes.length) card.appendChild(meta);
     }

     const actions = document.createElement('div');
     actions.className = 'workspace-setup-card-actions';

     const loadAction = document.createElement('button');
     loadAction.type = 'button';
     loadAction.className = 'workspace-setup-action';
     loadAction.dataset.setupAction = 'load';
     loadAction.dataset.setupId = setup.id;
     loadAction.textContent = activeSetupId === setup.id ? 'Aktivní' : 'Načíst';
     loadAction.disabled = activeSetupId === setup.id;
     actions.appendChild(loadAction);

     const defaultAction = document.createElement('button');
     defaultAction.type = 'button';
     defaultAction.className = 'workspace-setup-action';
     defaultAction.dataset.setupAction = 'default';
     defaultAction.dataset.setupId = setup.id;
     defaultAction.textContent = setup.isDefault ? 'Výchozí' : 'Nastavit jako výchozí';
     defaultAction.disabled = !!setup.isDefault;
     actions.appendChild(defaultAction);

     const deleteAction = document.createElement('button');
     deleteAction.type = 'button';
     deleteAction.className = 'workspace-setup-action workspace-setup-action--danger';
     deleteAction.dataset.setupAction = 'delete';
     deleteAction.dataset.setupId = setup.id;
     deleteAction.textContent = 'Smazat';
     actions.appendChild(deleteAction);

     card.appendChild(actions);
     listEl.appendChild(card);
   });
 }
}

function handleWorkspaceSetupsListClick(event){
  const actionBtn = event.target.closest('[data-setup-action]');
  if (!actionBtn) return;
  const setupId = actionBtn.dataset.setupId;
  const action = actionBtn.dataset.setupAction;
  if (!setupId || !action) return;

  event.preventDefault();

  switch (action) {
    case 'load':
      applyWorkspaceSetup(setupId);
      closeWorkspaceSetupsDrawer();
      break;
    case 'default':
      setWorkspaceSetupAsDefault(setupId);
      break;
    case 'delete':
      deleteWorkspaceSetup(setupId);
      break;
    default:
      break;
  }
}

function updateWorkspaceSetupToolbarState(){
 const wrapper = document.getElementById('workspace-toolbar-setups');
 const selectEl = document.getElementById('workspace-setup-select');
 const loadBtn = document.getElementById('workspace-setup-load');
 const defaultBtn = document.getElementById('workspace-setup-default');
 const deleteBtn = document.getElementById('workspace-setup-delete');
 if (!wrapper || !selectEl || !loadBtn || !defaultBtn || !deleteBtn) return;

 const ready = !wrapper.hidden && !selectEl.disabled;
 if (!ready) return;

 const setups = getActiveWorkspaceSetups();
 const selectedId = selectEl.value;
 const selectedSetup = setups.find((setup) => setup.id === selectedId) || null;
 const activeId = workspaceActiveSetup[currentWorkspace] || null;

 const hasSelection = !!selectedSetup;
 loadBtn.disabled = !hasSelection || (activeId === selectedId);
 defaultBtn.disabled = !hasSelection || selectedSetup.isDefault;
 deleteBtn.disabled = !hasSelection;
}

function initWorkspaceToolbarSetupsControls(){
 const selectEl = document.getElementById('workspace-setup-select');
 const loadBtn = document.getElementById('workspace-setup-load');
 const defaultBtn = document.getElementById('workspace-setup-default');
 const deleteBtn = document.getElementById('workspace-setup-delete');

 if (selectEl) {
   selectEl.addEventListener('change', () => {
     updateWorkspaceSetupToolbarState();
   });
 }

 loadBtn?.addEventListener('click', () => {
   const selectedId = selectEl?.value;
   if (!selectedId) return;
   applyWorkspaceSetup(selectedId);
 });

 defaultBtn?.addEventListener('click', () => {
   const selectedId = selectEl?.value;
   if (!selectedId) return;
   setWorkspaceSetupAsDefault(selectedId);
 });

 deleteBtn?.addEventListener('click', () => {
   const selectedId = selectEl?.value;
  if (!selectedId) return;
   deleteWorkspaceSetup(selectedId);
 });
}

 async function ensureDefaultWorkspaceSetup(){
  if (workspaceEnsureDefaultInProgress) return;
  if (!workspaceAllowsSetups() || !gridDocRef || !currentUser) return;
   const setups = getActiveWorkspaceSetups();
   if (setups.length) return;

   try {
     workspaceEnsureDefaultInProgress = true;
     const snap = await window.firebase.getDoc(gridDocRef);
     if (!snap.exists()) return;
     const data = snap.data() || {};
     const gridData = data.gridData || {};
     const { db, collection, doc, writeBatch, serverTimestamp } = window.firebase;
     const col = collection(db, WORKSPACE_SETUPS_COLLECTION);
     const newDocRef = doc(col);
     const batch = writeBatch(db);
     batch.set(newDocRef, {
       workspaceId: currentWorkspace,
       ownerId: currentUser.uid,
       sessionId,
       label: 'Základní sestava',
       isDefault: true,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
       gridData
     });
     await batch.commit();
     workspacePendingActiveSetup[currentWorkspace] = newDocRef.id;
   } catch (error) {
     console.error('ensureDefaultWorkspaceSetup error', error);
   } finally {
     workspaceEnsureDefaultInProgress = false;
   }
 }

 async function saveCurrentWorkspaceSetup({ label, setAsDefault = false }){
  if (!workspaceAllowsSetups() || !gridDocRef || !currentUser) {
    showBanner('Uložení sestavy není pro tuto plochu dostupné.', 'error');
    return;
  }
   const trimmedLabel = (label || '').trim();
   if (!trimmedLabel) {
     showBanner('Zadejte název sestavy.', 'error');
     return;
   }

   try {
     workspaceSetupsLoading = true;
     renderWorkspaceSetups();
     const snap = await window.firebase.getDoc(gridDocRef);
     if (!snap.exists()) throw new Error('Aktuální data mřížky nejsou dostupná.');
     const gridData = snap.data()?.gridData || {};

     const { db, collection, doc, writeBatch, serverTimestamp } = window.firebase;
     const col = collection(db, WORKSPACE_SETUPS_COLLECTION);
     const newDocRef = doc(col);
     const existingSetups = getActiveWorkspaceSetups();
     const hasDefault = existingSetups.some((s) => s.isDefault);
     const shouldBeDefault = setAsDefault || !hasDefault;

     const batch = writeBatch(db);
     if (shouldBeDefault) {
       existingSetups.forEach((setup) => {
         const ref = doc(col, setup.id);
         batch.update(ref, { isDefault: false, updatedAt: serverTimestamp() });
       });
     }

     batch.set(newDocRef, {
       workspaceId: currentWorkspace,
       ownerId: currentUser.uid,
       sessionId,
       label: trimmedLabel,
       isDefault: shouldBeDefault,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
       gridData
     });

     await batch.commit();
     workspacePendingActiveSetup[currentWorkspace] = newDocRef.id;
    if (shouldBeDefault) workspaceActiveSetup[currentWorkspace] = newDocRef.id;
     showBanner('Sestava byla uložena.', 'info');
   } catch (error) {
     console.error('saveCurrentWorkspaceSetup error', error);
     showBanner('Sestavu se nepodařilo uložit.', 'error');
   } finally {
     workspaceSetupsLoading = false;
     renderWorkspaceSetups();
   refreshWorkspaceToolbar();
 }
 }

async function setWorkspaceSetupAsDefault(setupId, { silent = false } = {}){
  if (!workspaceAllowsSetups() || !currentUser) return;
  const workspaceId = currentWorkspace;
  const setups = getActiveWorkspaceSetups();
  if (!setups.length) return;
  const target = setups.find((item) => item.id === setupId);
  if (!target) return;
  if (workspaceSetDefaultInProgress) return;

   try {
     workspaceSetDefaultInProgress = true;
     const { db, collection, doc, writeBatch, serverTimestamp } = window.firebase;
     const col = collection(db, WORKSPACE_SETUPS_COLLECTION);
     const batch = writeBatch(db);
     setups.forEach((setup) => {
       const ref = doc(col, setup.id);
       batch.update(ref, {
         isDefault: setup.id === setupId,
         updatedAt: serverTimestamp()
       });
     });
    await batch.commit();
    workspaceActiveSetup[currentWorkspace] = setupId;
    workspacePendingActiveSetup[currentWorkspace] = null;
    if (!silent) {
      showBanner(`Sestava „${target.label || 'bez názvu'}“ nastavena jako výchozí.`, 'info');
    }
  } catch (error) {
    console.error('setWorkspaceSetupAsDefault error', error);
    if (!silent) {
      showBanner('Výchozí sestavu se nepodařilo změnit.', 'error');
    }
    if (silent) {
      workspaceDefaultResolutionState[workspaceId] = 'failed';
    }
  } finally {
    workspaceSetDefaultInProgress = false;
    if (silent) {
      if (workspaceDefaultResolutionState[workspaceId] === 'running') {
        scheduleWorkspaceDefaultCooldown(workspaceId);
      } else if (workspaceDefaultResolutionState[workspaceId] === 'cooldown') {
        scheduleWorkspaceDefaultCooldown(workspaceId);
      }
    } else if (workspaceDefaultResolutionState[workspaceId] !== 'failed') {
      workspaceDefaultResolutionState[workspaceId] = 'idle';
      if (workspaceDefaultResolutionTimers[workspaceId]) {
        clearTimeout(workspaceDefaultResolutionTimers[workspaceId]);
        delete workspaceDefaultResolutionTimers[workspaceId];
      }
    }
    renderWorkspaceSetups();
    refreshWorkspaceToolbar();
  }
}

 async function applyWorkspaceSetup(setupId){
   if (!workspaceAllowsSetups() || !gridDocRef) return;
   const target = getActiveWorkspaceSetups().find((item) => item.id === setupId);
   if (!target) return;

   try {
     const gridData = target.gridData || {};
     renderGridData(gridData);
     const filledBoxes = Object.keys(gridData).length;
     const totalBoxes = 105;
     const emptyBoxes = Math.max(totalBoxes - filledBoxes, 0);
     const { updateDoc, serverTimestamp } = window.firebase;
     await updateDoc(gridDocRef, {
       gridData,
       'stats.filledBoxes': filledBoxes,
       'stats.emptyBoxes': emptyBoxes,
       lastModified: serverTimestamp(),
       lastAccessed: serverTimestamp()
     });
     workspaceActiveSetup[currentWorkspace] = setupId;
     workspacePendingActiveSetup[currentWorkspace] = null;
     showBanner(`Sestava „${target.label || 'bez názvu'}“ načtena.`, 'info');
   } catch (error) {
     console.error('applyWorkspaceSetup error', error);
     showBanner('Sestavu se nepodařilo načíst.', 'error');
   } finally {
     renderWorkspaceSetups();
     refreshWorkspaceToolbar();
   }
 }

 async function deleteWorkspaceSetup(setupId){
   if (!workspaceAllowsSetups() || !currentUser) return;
   const target = getActiveWorkspaceSetups().find((item) => item.id === setupId);
   if (!target) return;
   if (!confirm(`Opravdu smazat sestavu „${target.label || 'bez názvu'}“?`)) return;

   try {
     const { db, collection, doc, deleteDoc } = window.firebase;
     const col = collection(db, WORKSPACE_SETUPS_COLLECTION);
    await deleteDoc(doc(col, setupId));
    if (workspaceActiveSetup[currentWorkspace] === setupId) {
      workspaceActiveSetup[currentWorkspace] = null;
    }
    renderWorkspaceSetups();
    refreshWorkspaceToolbar();
    showBanner('Sestava byla odstraněna.', 'info');
  } catch (error) {
     console.error('deleteWorkspaceSetup error', error);
     showBanner('Sestavu se nepodařilo odstranit.', 'error');
   }
 }

function initWorkspaceSetupsListener(){
  if (!isFirebaseReady || !currentUser || !workspaceAllowsSetups() || !gridDocRef) {
    detachWorkspaceSetupsListener();
    workspaceSetupsLoading = false;
    workspaceSetupsError = null;
    renderWorkspaceSetups();
    return;
  }

  const workspaceIdAtInit = currentWorkspace;

  detachWorkspaceSetupsListener();
  workspaceSetupsLoading = true;
  workspaceSetupsError = null;
  renderWorkspaceSetups();

  try {
    const { db, collection, query, where, onSnapshot, limit } = window.firebase;
    const col = collection(db, WORKSPACE_SETUPS_COLLECTION);

    const aliasValuesRaw = getWorkspaceAliasList(workspaceIdAtInit);
    const aliasValues = aliasValuesRaw.length ? aliasValuesRaw.slice(0, 10) : [workspaceIdAtInit];
    const uniqueAliasValues = Array.from(new Set(aliasValues.map((alias) => normalizeWorkspaceKey(alias)))).filter(Boolean);
    if (!uniqueAliasValues.length) {
      const fallbackValue = normalizeWorkspaceKey(workspaceIdAtInit);
      if (fallbackValue) uniqueAliasValues.push(fallbackValue);
    }
    const primaryQuery = uniqueAliasValues.length > 1
      ? query(col, where('workspaceId', 'in', uniqueAliasValues.slice(0, 10)))
      : query(col, where('workspaceId', '==', uniqueAliasValues[0]));

    const ownerQuery = query(col, where('ownerId', '==', currentUser.uid), limit(150));

    let primaryDocs = new Map();
    let fallbackDocs = new Map();

    const applyCombined = () => {
      if (workspaceIdAtInit !== currentWorkspace) return;
      const merged = new Map(primaryDocs);
      fallbackDocs.forEach((value, key) => {
        if (!merged.has(key)) merged.set(key, value);
      });
      const combinedList = Array.from(merged.values());
      combinedList.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      workspaceSetupsLoading = false;
      workspaceSetupsError = null;
      syncWorkspaceSetupsForCurrent(workspaceIdAtInit, combinedList);
    };

    const unsubPrimary = onSnapshot(primaryQuery, (snapshot) => {
      primaryDocs = new Map();
      snapshot.forEach((docSnap) => {
        const record = normalizeWorkspaceSetupDoc(docSnap);
        primaryDocs.set(docSnap.id, record);
      });
      applyCombined();
    }, (error) => {
      console.error('workspaceSetups primary listener error', error);
      workspaceSetupsLoading = false;
      workspaceSetupsError = error;
      renderWorkspaceSetups();
      refreshWorkspaceToolbar();
    });

    let unsubFallback = null;
    try {
      unsubFallback = onSnapshot(ownerQuery, (snapshot) => {
        fallbackDocs = new Map();
        snapshot.forEach((docSnap) => {
          const record = normalizeWorkspaceSetupDoc(docSnap);
          if (!belongsToWorkspaceSetup(record, workspaceIdAtInit)) return;
          fallbackDocs.set(docSnap.id, record);
          if (!matchesWorkspaceAlias(record.workspaceId, workspaceIdAtInit)) {
            maybeMigrateLegacySetup(docSnap.id, record, workspaceIdAtInit);
          }
        });
        applyCombined();
      }, (error) => {
        console.warn('workspaceSetups fallback listener error', error);
      });
    } catch (fallbackError) {
      console.warn('workspaceSetups fallback init failed', fallbackError);
    }

    workspaceSetupsUnsubscribe = () => {
      try { unsubPrimary(); } catch (_) {}
      if (typeof unsubFallback === 'function') {
        try { unsubFallback(); } catch (_) {}
      }
    };
  } catch (error) {
    console.error('initWorkspaceSetupsListener error', error);
    workspaceSetupsLoading = false;
    workspaceSetupsError = error;
    renderWorkspaceSetups();
    refreshWorkspaceToolbar();
  }
}

 // =================================================================================
 // --- 3. MANIPULACE S UI (DOM) ---
 // =================================================================================
 function swapBoxElementsInDOM(box1, box2) {
 const pos1 = box1.dataset.position;
 const pos2 = box2.dataset.position;

 const content1 = {
   innerHTML: box1.innerHTML,
   backgroundImage: box1.style.backgroundImage,
   background: box1.style.background,
   linkUrl: box1.dataset.linkUrl,
   linkText: box1.dataset.linkText
 };
 const content2 = {
   innerHTML: box2.innerHTML,
   backgroundImage: box2.style.backgroundImage,
   background: box2.style.background,
   linkUrl: box2.dataset.linkUrl,
   linkText: box2.dataset.linkText
 };

 // Vyčistit původní obsah (neztrácíme referenci na elementy)
 box1.innerHTML = ''; box1.style.backgroundImage = 'none'; box1.style.background = '';
 box2.innerHTML = ''; box2.style.backgroundImage = 'none'; box2.style.background = '';

 // Aplikace prohozeného obsahu
 box1.innerHTML = content2.innerHTML;
 box1.style.backgroundImage = content2.backgroundImage;
 box2.dataset.linkUrl = content1.linkUrl || '';
 box2.dataset.linkText = content1.linkText || '';

 // Optimistická aktualizace cache (aby diff re-render nesmazal lokální swap)
 const cache1 = gridDataCache[pos1];
 const cache2 = gridDataCache[pos2];
 gridDataCache[pos1] = cache2 ? { ...cache2 } : undefined;
 gridDataCache[pos2] = cache1 ? { ...cache1 } : undefined;
 if (DEBUG_DIFF) console.log('⚡ Optimistický lokální swap (cache)', pos1, '<->', pos2);
 }

 // --- RYCHLÉ LOKÁLNÍ SWAP DAT (bez innerHTML kopírování) ---
 function swapBoxDataLocal(p1, p2, gridData){
   const a = gridData[p1] ? { ...gridData[p1] } : null;
   const b = gridData[p2] ? { ...gridData[p2] } : null;
   gridData[p1] = b; gridData[p2] = a;
 }

 // Bezpečné naplnění jednoho boxu (subset render používá)
function applySingleBoxData(box, data){
  box.innerHTML = '';
  box.style.backgroundImage = 'none';
  box.style.background = '';
  box.dataset.linkUrl = '';
  box.dataset.linkText = '';
  box.dataset.linkCount = '0';
  box.dataset.title = '';
  box.dataset.multi = '0';
  box.classList.remove('has-title');
  box.classList.remove('box-has-multi');

  let multiItemsRaw = Array.isArray(data?.multiItems) ? data.multiItems.slice(0, 4) : null;

  if (multiItemsRaw && multiItemsRaw.length) {
    const normalized = multiItemsRaw
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const value = (item.title || item.label || item.text || '').toString().trim();
          return value || `Položka ${index + 1}`;
        }
        if (typeof item === 'string') {
          const value = item.trim();
          return value || `Položka ${index + 1}`;
        }
        return `Položka ${index + 1}`;
      })
      .filter(Boolean);

    if (normalized.length) {
      const list = document.createElement('div');
      list.className = 'box-multi-stack';
      normalized.forEach((text) => {
        const row = document.createElement('div');
        row.className = 'box-multi-row';
        row.textContent = text;
        list.appendChild(row);
      });
      box.dataset.multi = '1';
      box.classList.add('box-has-multi');
      box.appendChild(list);
      return;
    }
  }

  if (!data) return;
  if (data.hasImage && data.imageUrl){
    box.style.backgroundImage = `url(${data.imageUrl})`;
  } else if (data.hasColor && data.colorStyle){
    box.style.background = data.colorStyle;
  }

  const titleText = (data.hasText && data.text) ? data.text.trim() : '';
  if (titleText){
    const badge = document.createElement('div');
    badge.className = 'box-title-badge';
    badge.textContent = titleText; // Text je sanitizován tím, že není použit innerHTML
    box.appendChild(badge);
    box.classList.add('has-title');
    box.dataset.title = titleText;
    if (!data.hasColor && !(data.hasImage && data.imageUrl)) {
      box.style.background = 'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 100%)';
    }
  }

  const normalizedLinks = normalizeLinksFromData(data);
  if (normalizedLinks.length){
    box.dataset.linkCount = String(normalizedLinks.length);
  }
 }

function renderBoxesSubset(subset){ // subset: { 'r-c': data, ... }
  Object.entries(subset).forEach(([pos, data]) => {
    const box = document.querySelector(`.box[data-position="${pos}"]`);
    if (!box) return;
    applySingleBoxData(box, data);
    if (data) gridDataCache[pos] = { ...data }; else delete gridDataCache[pos];
  });
}

async function seedPokusMultiDemo(docRef) {
  if (currentWorkspace !== 'pokus' || !docRef) return;
  if (!Array.isArray(POKUS_MULTI_DEMO_ITEMS) || !POKUS_MULTI_DEMO_ITEMS.length) return;
  try {
    const { getDoc, updateDoc, serverTimestamp } = window.firebase;
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    await updateDoc(docRef, {
      [`gridData.${POKUS_MULTI_DEMO_SLOT}`]: {
        multiItems: POKUS_MULTI_DEMO_ITEMS,
        hasText: false,
        text: ''
      },
      lastModified: serverTimestamp()
    });
    console.log(`🎛️ Seeded demo multi slot ${POKUS_MULTI_DEMO_SLOT} for workspace pokus`);
  } catch (error) {
    console.warn('seedPokusMultiDemo failed', error);
  }
}

async function seedPokus5SingleRow(docRef) {
  if (currentWorkspace !== 'pokus5' || !docRef) return;
  if (!Array.isArray(POKUS5_SINGLE_ROW_ITEMS) || !POKUS5_SINGLE_ROW_ITEMS.length) return;
  try {
    const { getDoc, updateDoc, serverTimestamp } = window.firebase;
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const gridData = docSnap.data().gridData || {};
    const existing = gridData[POKUS5_SINGLE_ROW_SLOT];
    const hasCustomMultiItems = Array.isArray(existing?.multiItems)
      && existing.multiItems.some(item => (item?.title || item?.label || item?.text || '').trim().length);

    if (hasCustomMultiItems) {
      return;
    }

    await updateDoc(docRef, {
      [`gridData.${POKUS5_SINGLE_ROW_SLOT}`]: {
        multiItems: POKUS5_SINGLE_ROW_ITEMS,
        hasText: false,
        text: ''
      },
      lastModified: serverTimestamp()
    });
    console.log(`🎛️ Seeded single-row demo ${POKUS5_SINGLE_ROW_SLOT} for workspace pokus5`);
  } catch (error) {
    console.warn('seedPokus5SingleRow failed', error);
  }
}

// Post-drag integritní kontrola – ověří, že lokální cache odpovídá serveru (řeší závodní stavy)
function schedulePostDragIntegrityCheck(positions){
   if(!gridDocRef) return;
   // Krátké zpoždění – dá prostor Firestore listeneru dodat případný pending snapshot
   setTimeout(async () => {
     try {
       const snap = await window.firebase.getDoc(gridDocRef);
       if(!snap.exists()) return;
       const serverGrid = snap.data().gridData || {};
       const diffs = {};
       const keys = new Set([...Object.keys(serverGrid), ...Object.keys(gridDataCache)]);
       for (const k of keys){
         const a = gridDataCache[k];
         const b = serverGrid[k];
         const aStr = a ? JSON.stringify(a) : '';
         const bStr = b ? JSON.stringify(b) : '';
         if (aStr !== bStr){
           diffs[k] = b || null;
         }
       }
       const diffCount = Object.keys(diffs).length;
       if(diffCount){
         if (DEBUG_DIFF) console.log(`🛠️ Integrity diff (${diffCount}) – korekce`);
         if (diffCount <= 8){
           renderBoxesSubset(diffs);
         } else {
           renderGridData(serverGrid);
         }
       } else if (DEBUG_DIFF){
         console.log('✅ Integrity OK');
       }
     } catch(e){
       console.warn('⚠️ Integrity check selhala', e);
     }
   }, 120);
 }

 // Throttle dragover pomocí rAF
 // (rAF throttle odstraněn – přechod na dragenter/dragleave)

 function renderWorkspacePanels() {
   const container = document.querySelector('.workspace-panels');
   if (!container) return;
   container.innerHTML = '';
   for (const [id, config] of Object.entries(workspaceConfigs)) {
     const panel = document.createElement('div');
     panel.className = 'workspace-panel';
     panel.dataset.workspace = id;
     const panelName = (config && config.name) ? config.name : id;
     panel.title = panelName;
     panel.innerHTML = `
       <div class="workspace-panel-preview">
         ${Array.from({length: 8}).map(() => `<div class="preview-box"></div>`).join('')}
       </div>
       <div class="workspace-panel-name">${panelName}</div>
     `;
     if (id === currentWorkspace) {
       panel.classList.add('active');
     }
     panel.addEventListener('click', () => switchWorkspace(id));
     container.appendChild(panel);
   }
   refreshWorkspaceToolbar();
 }

 function handleGridInteraction(event) {
   const targetBox = event.target.closest('.box');
   if (!targetBox) return;

  switch (event.type) {
   case 'click': {
      activeBox = targetBox;
      const detailPanel = document.getElementById('detail-panel');
      // Pokud je detail panel otevřen a klikneme na jiný box s obsahem,
      // neuzavírej panel, ale přepni na detail tohoto boxu.
      if (detailPanel && detailPanel.classList.contains('active')) {
        if (boxHasContent(targetBox)) {
          event.stopPropagation();
          showBoxDetails(targetBox);
          return;
        }
      }
      break;
    }
    case 'mouseenter':
      activeBox = targetBox;
      showNavIcons(targetBox);
      break;
    case 'mouseleave':
      startNavIconsAutohide();
      break;
    case 'dblclick':
      showBoxDetails(targetBox);
     break;
    case 'dragstart':
      hideNavIcons();
      document.body.classList.add('dnd-active');
      dragSource = targetBox;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', targetBox.dataset.position);
       // Krátké zpoždění, aby prohlížeč stihl vytvořit "ducha" předtím, než originál zprůhledníme
       setTimeout(() => {
         targetBox.classList.add('dragging');
       }, 0);
       break;

     case 'dragover':
       event.preventDefault();
       if (targetBox !== lastDragOverEl) {
         lastDragOverEl?.classList.remove('dragover');
         targetBox.classList.add('dragover');
         lastDragOverEl = targetBox;
       }
       break;
     case 'dragleave':
       // Neodstraňujeme 'dragover' zde, ale v 'dragover' a 'dragend', abychom předešli blikání
       break;
     case 'drop':
       event.preventDefault();
       if (dragSource && dragSource !== targetBox) {
         swapBoxDataInFirestore(dragSource.dataset.position, targetBox.dataset.position);
       }
       break;
     case 'dragend':
       document.body.classList.remove('dnd-active');
       document.querySelectorAll('.box.dragging, .box.dragover').forEach(box => box.classList.remove('dragging', 'dragover'));
       dragSource = null;
       lastDragOverEl = null;
   }
 }

 function initializeEventListeners() {
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    ['click', 'mouseenter', 'mouseleave', 'dblclick', 'dragstart', 'dragover', 'dragleave', 'drop', 'dragend'].forEach((eventType) => {
      const useCapture = eventType === 'mouseenter' || eventType === 'mouseleave';
      gridContainer.addEventListener(eventType, handleGridInteraction, useCapture);
    });
    console.log('✅ Event delegation for grid initialized.');
  }

  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('active');
      sidebarToggle.classList.toggle('active');
    });
  }

  const addWorkspaceBtn = document.getElementById('add-workspace-btn');
  if (addWorkspaceBtn) {
    addWorkspaceBtn.addEventListener('click', () => {
      if (!isFirebaseReady || !userWorkspacesDocRef) {
        showBanner('Firebase ještě není připraven.', 'error');
        return;
      }
      handleAddNewProject();
    });
  }

  const zoomOutBtn = document.getElementById('workspace-zoom-out');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => applyGridZoom(gridZoomIndex - 1));
  }

  const zoomInBtn = document.getElementById('workspace-zoom-in');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => applyGridZoom(gridZoomIndex + 1));
  }

  const toolbarSaveBtn = document.getElementById('workspace-toolbar-save');
  if (toolbarSaveBtn) {
    toolbarSaveBtn.addEventListener('click', () => {
      promptSaveCurrentWorkspace();
    });
  }

  const toolbarNewBtn = document.getElementById('workspace-toolbar-new');
  if (toolbarNewBtn) {
    toolbarNewBtn.addEventListener('click', async () => {
      if (!isFirebaseReady || !gridDocRef) {
        showBanner('Firebase ještě není připraven.', 'error');
        return;
      }
      if (confirm('Opravdu vyčistit všechny boxy této pracovní plochy?')) {
        await clearCurrentWorkspace();
      }
    });
  }

  const detailCloseBtn = document.querySelector('.detail-panel-close');
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', closeDetailPanel);
  }

  const setupsToggleBtn = document.getElementById('workspace-setups-toggle');
  setupsToggleBtn?.addEventListener('click', toggleWorkspaceSetupsDrawer);

  const setupsCloseBtn = document.getElementById('workspace-setups-close');
  setupsCloseBtn?.addEventListener('click', () => closeWorkspaceSetupsDrawer());

  const setupsList = document.getElementById('workspace-setups-list');
  if (setupsList && setupsList.dataset.listenerBound !== '1') {
    setupsList.dataset.listenerBound = '1';
    setupsList.addEventListener('click', handleWorkspaceSetupsListClick);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetailPanel();
      closeWorkspaceSetupsDrawer();
      return;
    }

    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    if (!document.body.classList.contains('view-grid')) return;

    const activeEl = document.activeElement;
    const isTypingTarget = !!activeEl && (
      activeEl.isContentEditable ||
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA'
    );

    if (isTypingTarget || isEditingText) return;
    if (!activeBox || !activeBox.dataset?.position) return;

    event.preventDefault();
    handleNavAction('delete', activeBox.dataset.position);
  });

  document.addEventListener('click', (event) => {
    const box = event.target.closest('.box');
    if (box) activeBox = box;

    const detailPanel = document.getElementById('detail-panel');
    const clickedNavIcons = !!event.target.closest('.nav-icons');
    if (detailPanel && detailPanel.classList.contains('active') && !detailPanel.contains(event.target) && !clickedNavIcons) {
      closeDetailPanel();
    }

    if (workspaceSetupsDrawerOpen) {
      const drawer = document.getElementById('workspace-setups-drawer');
      const toggleBtn = document.getElementById('workspace-setups-toggle');
      const clickedInsideDrawer = drawer?.contains(event.target);
      const clickedToggle = toggleBtn?.contains(event.target);
      if (!clickedInsideDrawer && !clickedToggle) {
        closeWorkspaceSetupsDrawer();
      }
    }
  });

  document.querySelectorAll('.workspace-panel').forEach((panel) => {
    panel.addEventListener('click', () => switchWorkspace(panel.dataset.workspace));
  });

  const detailClose = document.querySelector('.detail-panel-close');
  if (detailClose) {
    detailClose.addEventListener('click', () => {
      document.getElementById('detail-panel')?.classList.remove('active');
    });
  }

  const saveDescriptionBtn = document.getElementById('save-description');
  if (saveDescriptionBtn) {
    saveDescriptionBtn.addEventListener('click', async () => {
      if (!currentBoxDetails) return;
      const description = document.getElementById('box-description').value;
      await updateBoxDataInFirestore(currentBoxDetails.position, { description });
      showBanner('Popis uložen.', 'info');
    });
  }

  document.addEventListener('paste', async (event) => {
    if (!activeBox) return;
    if (!document.body.classList.contains('view-grid')) return;
    const clipboard = event.clipboardData || window.clipboardData;
    const items = clipboard?.items;
    if (!items || !items.length) return;

    const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    const targetBox = activeBox;
    const position = targetBox?.dataset?.position;
    if (!position) return;

    event.preventDefault();

    let uploadBlob = file;
    try {
      uploadBlob = await compressImageIfNeeded(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
    } catch (compressError) {
      console.warn('compressImageIfNeeded selhala, používám originální soubor', compressError);
      uploadBlob = file;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const localUrl = reader.result;
      if (!localUrl) return;

      targetBox.innerHTML = '';
      targetBox.classList.remove('has-title');
      targetBox.dataset.linkUrl = '';
      targetBox.dataset.linkText = '';
      targetBox.dataset.linkCount = '0';
      targetBox.dataset.title = '';
      targetBox.style.background = '';
      targetBox.style.backgroundImage = `url(${localUrl})`;

      uploadQueue.push({ blob: uploadBlob, position, localUrl });
      processUploadQueue();
    };

    reader.onerror = () => {
      console.error('Paste preview failed', reader.error);
      showBanner('Nepodařilo se načíst obrázek ze schránky.', 'error');
    };

    try {
      reader.readAsDataURL(uploadBlob);
    } catch (readError) {
      console.error('readAsDataURL selhalo', readError);
      showBanner('Vložení obrázku se nepodařilo.', 'error');
    }
  });

  const multiLineSaveBtn = document.getElementById('box-multi-line-save');
  multiLineSaveBtn?.addEventListener('click', () => saveDetailMultiLine());

  const linkSaveBtn = document.getElementById('box-link-save');
  const linkUrlInput = document.getElementById('box-link-url');
  const linkLabelInput = document.getElementById('box-link-label');
  linkSaveBtn?.addEventListener('click', () => addDetailLink());
  linkUrlInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addDetailLink();
    }
  });
  linkLabelInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.metaKey) {
      event.preventDefault();
      addDetailLink();
    }
  });
  const linkBulkInput = document.getElementById('box-link-bulk');
  const linkBulkBtn = document.getElementById('box-link-bulk-save');
  linkBulkBtn?.addEventListener('click', () => addDetailBulkLinks());
  linkBulkInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      addDetailBulkLinks();
    }
  });
  const linksList = document.getElementById('box-links-list');
  if (linksList && !linksList.dataset.listenerBound) {
    linksList.dataset.listenerBound = '1';
    linksList.addEventListener('click', handleDetailLinksClick);
  }

  refreshWorkspaceToolbar();
}

async function switchWorkspace(workspaceId) {
  if (workspaceId === currentWorkspace || !isFirebaseReady) return;

  dispatchWorkspaceEvent('p73:workspace-switching', {
    from: currentWorkspace,
    to: workspaceId
  });

  console.log(`🔄 Switching to workspace ${workspaceId}`);
  document.getElementById('workspace-loading')?.classList.add('active');

  hideNavIcons();
  closeNavColorPanel();
  closeWorkspaceSetupsDrawer();
  if (architektCopyPanelOpen && workspaceId !== ARCHITEKT_WORKSPACE_ID) {
    closeArchitektCopyPanel();
  }

  currentWorkspace = workspaceId;
  setWorkspaceBodyClass(currentWorkspace);
   const config = workspaceConfigs[currentWorkspace];

  dispatchWorkspaceEvent('p73:workspace-selected', {
    workspaceId: currentWorkspace,
    config: cloneWorkspaceConfig(config)
  });

  if (!config?.gridDocRef) {
    await initializeWorkspace(currentWorkspace);
  }

  await seedPokusMultiDemo(config?.gridDocRef);
  await seedPokus5SingleRow(config?.gridDocRef);

  sessionId = config.sessionId;
  gridDocRef = config.gridDocRef;

   const snap = gridDocRef ? await window.firebase.getDoc(gridDocRef) : null;
   if (snap?.exists()) {
     renderGridData(snap.data().gridData);
   }

   document.querySelectorAll('.workspace-panel').forEach((panel) => panel.classList.remove('active'));
   document.querySelector(`.workspace-panel[data-workspace="${workspaceId}"]`)?.classList.add('active');

   setupRealtimeListener();
   initWorkspaceSetupsListener();
   dispatchWorkspaceEvent('p73:workspace-ready', {
     workspaceId: currentWorkspace,
     config: cloneWorkspaceConfig(config),
     sessionId,
     gridDocPath: gridDocRef?.path || null
   });
   refreshWorkspaceToolbar();
   showBanner(`Přepnuto na ${config?.name || workspaceId}`, 'info');
   document.getElementById('workspace-loading')?.classList.remove('active');
 }

function setupRealtimeListener() {
   if (unsubscribeListener) unsubscribeListener();
   if (!gridDocRef) return;

   console.log('[setupRealtimeListener] listening on', gridDocRef.path);
   unsubscribeListener = window.firebase.onSnapshot(
     gridDocRef,
     (snap) => {
       if (snap.exists()) {
         renderGridData(snap.data().gridData);
       }
     },
     (error) => console.error('❌ onSnapshot error:', error)
   );
}

async function onUserSignedIn(user) {
  currentUser = user;
  console.log('✅ User signed in:', user.uid);
  authSignOutInProgress = false;
  hideAuthGate();
  clearAuthError();
  refreshGoalCanvasAvailability();

  await loadUserWorkspaceConfig(user);

   // --- FIX: Determine workspace from URL ---
   const params = new URLSearchParams(window.location.search);
   const viewFromUrl = params.get('view');

   if (viewFromUrl && workspaceConfigs[viewFromUrl]) {
     currentWorkspace = viewFromUrl;
   } else if (!currentWorkspace || !workspaceConfigs[currentWorkspace]) {
     currentWorkspace = Object.keys(workspaceConfigs)[0] || 'workspace1';
   }
   dispatchWorkspaceEvent('p73:workspace-switching', {
     from: null,
     to: currentWorkspace,
     isInitial: true
   });
   dispatchWorkspaceEvent('p73:workspace-selected', {
     workspaceId: currentWorkspace,
     config: cloneWorkspaceConfig(workspaceConfigs[currentWorkspace]),
     isInitial: true
   });
   // --- END FIX ---

   setWorkspaceBodyClass(currentWorkspace);
   await initializeWorkspace(currentWorkspace);

  const config = workspaceConfigs[currentWorkspace];

  await seedPokusMultiDemo(config?.gridDocRef);
  await seedPokus5SingleRow(config?.gridDocRef);

  sessionId = config.sessionId;
  gridDocRef = config.gridDocRef;

   const snap = gridDocRef ? await window.firebase.getDoc(gridDocRef) : null;
   if (snap?.exists()) {
     renderGridData(snap.data().gridData);
   }

  setupRealtimeListener();
  isFirebaseReady = true;
  initWorkspaceSetupsListener();
  updateFirebaseStatus(`Ready (${sessionId?.substring(0, 12) || 'N/A'}...)`);
  processUploadQueue();
  dispatchWorkspaceEvent('p73:workspace-ready', {
    workspaceId: currentWorkspace,
    config: cloneWorkspaceConfig(config),
    sessionId,
    gridDocPath: gridDocRef?.path || null,
    isInitial: true
  });

  if (document.body.classList.contains('view-goal-canvas')) {
    ensureGoalCanvasModule(true);
    updateGoalCanvasSurfaceSize();
  }

  document.querySelector(`.workspace-panel[data-workspace="${currentWorkspace}"]`)?.classList.add('active');
  refreshWorkspaceToolbar();
  scheduleSnippetLibraryInit();
}

function setWorkspaceBodyClass(workspaceId){
  try {
    const body = document.body;
    const classes = body.className.split(/\s+/).filter(c => !c.startsWith('workspace-'));
    body.className = classes.join(' ');
    if (workspaceId) body.classList.add(`workspace-${workspaceId}`);
  } catch (_) {}
}

 document.addEventListener('DOMContentLoaded', () => {
   console.log('🚀 DOM loaded, initializing app...');
   p73Mark('dom:loaded');
   setupArchitektCopyFeature();
   try {
     const storedZoom = localStorage.getItem(GRID_ZOOM_STORAGE_KEY);
     const parsedZoom = storedZoom !== null ? parseInt(storedZoom, 10) : NaN;
   if (!Number.isNaN(parsedZoom) && parsedZoom >= 0 && parsedZoom < GRID_ZOOM_LEVELS.length) {
     gridZoomIndex = parsedZoom;
   }
  } catch (_) {}
  try {
    const storedGoalZoom = localStorage.getItem(GOAL_CANVAS_ZOOM_STORAGE_KEY);
    const parsedGoalZoom = storedGoalZoom !== null ? parseInt(storedGoalZoom, 10) : NaN;
    if (!Number.isNaN(parsedGoalZoom) && parsedGoalZoom >= 0 && parsedGoalZoom < GOAL_CANVAS_ZOOM_LEVELS.length) {
      goalCanvasZoomIndex = parsedGoalZoom;
    }
  } catch (_) {}
  applyGridZoom(gridZoomIndex);
  generateGrid();
  initializeEventListeners();
  setupNavIconActions();
  initWorkspaceToolbarSetupsControls();
  ensureGoalCanvasModule();
  initAuthGate();

  const { auth, onAuthStateChanged, signOut } = window.firebase;
  if (!auth) { console.warn('⚠️ auth object missing'); p73Mark('auth:missing'); }
  // Fail-safe: před získáním user objektu vykresli placeholder / stav bez uživatele
  if (typeof renderAuthTopbar === 'function') {
     try { renderAuthTopbar(null); } catch(e) { console.warn('renderAuthTopbar(null) failed (ignored)', e); }
   }
  onAuthStateChanged(auth, (user) => {
    p73Mark('auth:stateChange', { uid: user?.uid || null });
    const googleUser = isGoogleAuthenticatedUser(user) ? user : null;
    if (typeof renderAuthTopbar === 'function') {
      try { renderAuthTopbar(googleUser); } catch(e) { console.warn('renderAuthTopbar(user) failed', e); }
    }

    if (googleUser) {
      onUserSignedIn(googleUser);
    } else {
      currentUser = null;
      gridDocRef = null;
      sessionId = null;
      if (typeof unsubscribeListener === 'function') {
        try { unsubscribeListener(); } catch (_) {}
      }
      unsubscribeListener = null;
      detachGoalCanvasListener();
      goalCanvasItems = [];
      renderGoalCanvas();
      refreshGoalCanvasAvailability();
      updateGoalCanvasSurfaceSize();
      detachWorkspaceSetupsListener();
      workspaceSetupsState = {};
      workspaceActiveSetup = {};
      workspacePendingActiveSetup = {};
      workspaceSetDefaultInProgress = false;
      workspaceEnsureDefaultInProgress = false;
      workspaceSetupsDrawerOpen = false;
      workspaceToolbarState = { label: 'New', isDefault: false };
      Object.keys(workspaceSetupsRenderCache).forEach((key) => { delete workspaceSetupsRenderCache[key]; });
      Object.keys(workspaceToolbarOverrides).forEach((key) => { delete workspaceToolbarOverrides[key]; });
      workspaceSetupsCurrentDomWorkspace = null;
      closeWorkspaceSetupsDrawer();
      renderWorkspaceSetups();
      refreshWorkspaceToolbar();
      gridDataCache = {};
      renderGridData({});
      updateFirebaseStatus('Nepřihlášen');
      showAuthGate();

      if (user && !authSignOutInProgress && typeof signOut === 'function') {
        authSignOutInProgress = true;
        signOut(auth).catch((err) => {
          console.warn('[P73] signOut cleanup failed', err);
          authSignOutInProgress = false;
        });
      }
    }
    scheduleSnippetLibraryInit();
  });
  scheduleSnippetLibraryInit();
});

 async function clearCurrentWorkspace() {
   if (!gridDocRef) return;
   try {
     const snap = await window.firebase.getDoc(gridDocRef);
     if (!snap.exists()) return;
     const data = snap.data();
     const currentGrid = data.gridData || {};
     if (Object.keys(currentGrid).length === 0) {
       showBanner('Pracovní plocha je už prázdná.', 'info');
       return;
     }
     await window.firebase.updateDoc(gridDocRef, {
       gridData: {},
       'stats.filledBoxes': 0,
       'stats.emptyBoxes': 105,
       lastModified: window.firebase.serverTimestamp()
     });
     renderGridData({});
     workspaceActiveSetup[currentWorkspace] = null;
     workspacePendingActiveSetup[currentWorkspace] = null;
     workspaceToolbarOverrides[currentWorkspace] = 'New';
     refreshWorkspaceToolbar();
     showBanner('Plocha vyčištěna.', 'info');
   } catch (error) {
     console.error('❌ clearCurrentWorkspace error', error);
     showBanner('Chyba při čištění.', 'error');
   }
 }

 const clearWorkspaceBtn = document.getElementById('clear-workspace-btn');
 if (clearWorkspaceBtn) {
   clearWorkspaceBtn.addEventListener('click', async () => {
     if (!isFirebaseReady || !gridDocRef) {
       showBanner('Firebase ještě není připraven.', 'error');
       return;
     }
     if (confirm('Opravdu vyčistit všechny boxy této pracovní plochy?')) {
       await clearCurrentWorkspace();
     }
   });
 }

 function showBanner(message, type = 'info', timeout = 3000) {
     const container = document.getElementById('p73-status-banner');
     if (!container) return;
     const div = document.createElement('div');
     div.className = 'p73-banner' + (type === 'error' ? ' error' : '');
     div.textContent = message;
     container.innerHTML = '';
     container.appendChild(div);
     setTimeout(() => {
         if (container.contains(div)) container.removeChild(div);
     }, timeout);
 }

 function updateFirebaseStatus(status, loadTime = null) {
     const statusEl = document.getElementById('firebase-status');
     if (statusEl) statusEl.textContent = status;
     const loadTimeEl = document.getElementById('load-time-display');
     if(loadTimeEl && loadTime !== null){
         loadTimeEl.textContent = `${loadTime} ms`;
     }
 }

 function sameBox(a, b){
   if (!a && !b) return true;
   if (!a || !b) return false;
   return (
     !!a.hasImage === !!b.hasImage && (a.imageUrl||'') === (b.imageUrl||'') &&
     !!a.hasText  === !!b.hasText  && (a.text||'')     === (b.text||'') &&
     !!a.hasColor === !!b.hasColor && (a.colorStyle||'')=== (b.colorStyle||'') &&
     (a.linkUrl||'') === (b.linkUrl||'') && (a.linkText||'') === (b.linkText||'')
   );
 }
function renderGridData(gridData = {}){
  if (currentWorkspace === 'pokus5') {
    const currentDemoData = gridData[POKUS5_SINGLE_ROW_SLOT];
    const hasCustomMultiItems = Array.isArray(currentDemoData?.multiItems)
      && currentDemoData.multiItems.some(item => (item?.title || item?.label || item?.text || '').trim().length);

    if (!hasCustomMultiItems) {
      gridData = {
        ...gridData,
        [POKUS5_SINGLE_ROW_SLOT]: {
          multiItems: POKUS5_SINGLE_ROW_ITEMS.slice(0, 5),
          hasText: false,
          text: ''
        }
      };
    }
  }
  let changed = 0;
  document.querySelectorAll('.box').forEach(box => {
    const pos = box.dataset.position;
     const newData = gridData[pos];
     const oldData = gridDataCache[pos];
     if (sameBox(oldData, newData)) return;
     applySingleBoxData(box, newData);
     if (newData) gridDataCache[pos] = { ...newData }; else delete gridDataCache[pos];
     changed++;
   });
   if (DEBUG_DIFF) console.log('diff changed:', changed);
  if (architektCopyPanelOpen && isArchitektWorkspace()) {
    renderArchitektCopyPanel({ preserveSelection: true });
  }
}

function closeDetailPanel() {
    const detailPanel = document.getElementById('detail-panel');
    if (detailPanel.classList.contains('active')) {
        detailPanel.classList.remove('active');
        currentBoxDetails = null;
    }
}

function updateDetailMultiLineUI(position, boxData = {}) {
    const editorEl = document.getElementById('box-multi-line-editor');
    if (!editorEl) return;

    editorEl.innerHTML = '';
    editorEl.dataset.position = position || '';

    const items = Array.isArray(boxData.multiItems) ? boxData.multiItems : [];
    // If no multi-items, check for legacy text and put it in the first line
    if (items.length === 0 && boxData.text) {
        items.push({ title: boxData.text });
    }

    for (let i = 0; i < 4; i++) {
        const item = items[i] || { title: '' };
        const value = item.title || item.label || item.text || '';
        const textarea = document.createElement('textarea');
        textarea.className = 'flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
        textarea.rows = 1;
        textarea.placeholder = `Řádek ${i + 1}`;
        textarea.dataset.lineIndex = i;
        textarea.value = value;
        editorEl.appendChild(textarea);
    }
}

async function saveDetailMultiLine() {
    const editorEl = document.getElementById('box-multi-line-editor');
    const saveBtn = document.getElementById('box-multi-line-save');
    const feedbackEl = document.getElementById('box-multi-line-feedback');
    if (!editorEl || !saveBtn) return;

    const position = editorEl.dataset.position;
    if (!position) return;

    const textareas = editorEl.querySelectorAll('textarea');
    const newItems = Array.from(textareas).map(ta => ({ title: ta.value.trim() }));

    // Filter out empty lines from the end to keep data clean
    while (newItems.length > 0 && !newItems[newItems.length - 1].title) {
        newItems.pop();
    }

    const payload = {
        multiItems: newItems,
        hasText: false, // Deprecate old text field
        text: ''
    };

    try {
        saveBtn.classList.add('opacity-60');
        await updateBoxDataInFirestore(position, payload);

        const existingData = gridDataCache[position] ? { ...gridDataCache[position] } : {};
        const merged = { ...existingData, ...payload };
        
        const box = document.querySelector(`.box[data-position="${position}"]`);
        if (box) applySingleBoxData(box, merged);
        
        gridDataCache[position] = merged;
        if (currentBoxDetails && currentBoxDetails.position === position) {
            currentBoxDetails.data = merged;
        }
        
        showBanner('Obsah boxu uložen.', 'info');
        if (feedbackEl) feedbackEl.hidden = true;

    } catch (error) {
        console.error('saveDetailMultiLine error', error);
        showBanner('Obsah se nepodařilo uložit.', 'error');
        if (feedbackEl) {
            feedbackEl.textContent = 'Obsah se nepodařilo uložit.';
            feedbackEl.hidden = false;
        }
    } finally {
        saveBtn.classList.remove('opacity-60');
    }
}

function normalizeLinksFromData(data = {}) {
  const raw = Array.isArray(data.links) ? data.links : [];
  const normalized = raw
    .map((item) => ({
      label: (item?.label || item?.text || item?.title || '').trim(),
      url: ensureUrlHasProtocol(item?.url || item?.href || '')
    }))
    .filter((item) => !!item.url);

  if (!normalized.length && data.linkUrl) {
    const fallbackUrl = ensureUrlHasProtocol(data.linkUrl);
    if (fallbackUrl) {
      normalized.push({
        label: (data.linkText || data.linkUrl).trim(),
        url: fallbackUrl
      });
    }
  }

  return normalized.map((item) => ({
    label: item.label || extractLinkLabel(item.url) || item.url,
    url: item.url
  }));
}

function ensureUrlHasProtocol(rawValue) {
  if (!rawValue) return '';
  let value = String(rawValue).trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.href;
  } catch (_) {
    try {
      const parsed = new URL(`https://${value}`);
      return parsed.href;
    } catch (err) {
      return '';
    }
  }
}

function extractLinkLabel(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

function updateDetailLinksUI(position, boxData = {}) {
  const listEl = document.getElementById('box-links-list');
  if (!listEl) return;
  const links = normalizeLinksFromData(boxData);
  listEl.innerHTML = '';
  listEl.dataset.position = position || '';

  if (!links.length) {
    const empty = document.createElement('div');
    empty.className = 'text-xs text-gray-400 italic';
    empty.textContent = 'Zatím žádné odkazy.';
    listEl.appendChild(empty);
  } else {
    links.forEach((link, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm';
      row.innerHTML = `
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-medium text-gray-800 truncate">${link.label}</span>
          <a class="text-xs text-blue-600 underline truncate" href="${link.url}" target="_blank" rel="noopener">${link.url}</a>
        </div>
        <button type="button" class="rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-rose-50 hover:text-rose-600" data-link-remove="${index}">Smazat</button>
      `;
      listEl.appendChild(row);
    });
  }

  if (typeof boxData === 'object') {
    boxData.links = links;
    if ('linkUrl' in boxData) delete boxData.linkUrl;
    if ('linkText' in boxData) delete boxData.linkText;
  }
  if (currentBoxDetails && currentBoxDetails.position === position) {
    currentBoxDetails.data.links = links;
    delete currentBoxDetails.data.linkUrl;
    delete currentBoxDetails.data.linkText;
  }
}

function showLinkFeedback(message = '', type = 'error') {
  const feedback = document.getElementById('box-link-feedback');
  if (!feedback) return;
  if (!message) {
    feedback.hidden = true;
    feedback.textContent = '';
    feedback.classList.remove('text-rose-500', 'text-green-600');
    feedback.classList.add('text-gray-400');
    return;
  }
  feedback.textContent = message;
  feedback.classList.remove('text-rose-500', 'text-green-600', 'text-gray-400');
  if (type === 'success') {
    feedback.classList.add('text-green-600');
  } else if (type === 'muted') {
    feedback.classList.add('text-gray-400');
  } else {
    feedback.classList.add('text-rose-500');
  }
  feedback.hidden = false;
}

async function persistBoxLinks(position, links, successMessage = 'Odkazy aktualizovány.') {
  if (!position) return false;
  const sanitized = normalizeLinksFromData({ links });
  const payload = { links: sanitized, linkUrl: '', linkText: '' };
  const existing = gridDataCache[position] ? { ...gridDataCache[position] } : {};
  try {
    await updateBoxDataInFirestore(position, payload);
    const merged = { ...existing, ...payload };
    merged.links = sanitized;
    merged.linkUrl = '';
    merged.linkText = '';
    const box = document.querySelector(`.box[data-position="${position}"]`);
    if (box) applySingleBoxData(box, merged);
    gridDataCache[position] = merged;
    if (currentBoxDetails && currentBoxDetails.position === position) {
      currentBoxDetails.data = merged;
    }
    updateDetailLinksUI(position, merged);
    showLinkFeedback('', 'muted');
    showBanner(successMessage, 'info');
    return true;
  } catch (error) {
    console.error('persistBoxLinks error', error);
    showLinkFeedback('Odkaz se nepodařilo uložit.', 'error');
    showBanner('Odkaz se nepodařilo uložit.', 'error');
    return false;
  }
}

async function addDetailLink() {
  if (!currentBoxDetails) {
    showLinkFeedback('Vyber box pro přidání odkazu.', 'error');
    return;
  }
  const labelInput = document.getElementById('box-link-label');
  const urlInput = document.getElementById('box-link-url');
  if (!urlInput) return;
  const normalizedUrl = ensureUrlHasProtocol(urlInput.value);
  if (!normalizedUrl) {
    showLinkFeedback('Zadej platnou URL adresu.', 'error');
    return;
  }
  const label = (labelInput?.value || '').trim() || extractLinkLabel(normalizedUrl) || normalizedUrl;
  const links = normalizeLinksFromData(currentBoxDetails.data);
  links.push({ label, url: normalizedUrl });
  const saved = await persistBoxLinks(currentBoxDetails.position, links, 'Odkaz přidán.');
  if (saved) {
    if (labelInput) labelInput.value = '';
    urlInput.value = '';
  }
}

async function addDetailBulkLinks() {
  if (!currentBoxDetails) {
    showLinkFeedback('Vyber box a vlož seznam odkazů.', 'error');
    return;
  }
  const bulkInput = document.getElementById('box-link-bulk');
  if (!bulkInput) return;
  const raw = bulkInput.value || '';
  if (!raw.trim()) {
    showLinkFeedback('Vlož alespoň jeden řádek s odkazem.', 'error');
    return;
  }

  const { entries, invalid } = parseBulkLinksInput(raw);
  if (!entries.length) {
    showLinkFeedback('Nepodařilo se rozpoznat žádný odkaz.', 'error');
    return;
  }

  const position = currentBoxDetails.position;
  const existingLinks = normalizeLinksFromData(currentBoxDetails.data);
  const existingUrls = new Set(existingLinks.map((item) => ensureUrlHasProtocol(item.url)));

  let added = 0;
  let duplicates = 0;

  entries.forEach(({ label, url }) => {
    const normalizedUrl = ensureUrlHasProtocol(url);
    if (!normalizedUrl) {
      return;
    }
    if (existingUrls.has(normalizedUrl)) {
      duplicates += 1;
      return;
    }
    existingUrls.add(normalizedUrl);
    const finalLabel = (label && label.trim()) || extractLinkLabel(normalizedUrl) || normalizedUrl;
    existingLinks.push({ label: finalLabel, url: normalizedUrl });
    added += 1;
  });

  if (!added) {
    showLinkFeedback('Žádný nový odkaz nebyl přidán (duplicitní nebo neplatné řádky).', 'error');
    return;
  }

  const saved = await persistBoxLinks(position, existingLinks, added === 1 ? 'Odkaz přidán.' : `${added} odkazů přidáno.`);
  if (saved) {
    bulkInput.value = '';
    if (invalid || duplicates) {
      const notes = [];
      if (duplicates) notes.push(`${duplicates} duplicit`);
      if (invalid) notes.push(`${invalid} neplatných`);
      showLinkFeedback(`${added} odkazů přidáno (${notes.join(', ')} vynecháno).`, 'muted');
    } else {
      showLinkFeedback(`${added} odkazů přidáno.`, 'success');
      setTimeout(() => showLinkFeedback('', 'muted'), 1200);
    }
  }
}

async function removeDetailLink(index) {
  if (!currentBoxDetails) return;
  const links = normalizeLinksFromData(currentBoxDetails.data);
  if (index < 0 || index >= links.length) return;
  links.splice(index, 1);
  await persistBoxLinks(currentBoxDetails.position, links, 'Odkaz odstraněn.');
}

async function appendLinkToPosition(position, link) {
  if (!position || !link?.url) return;
  const normalizedUrl = ensureUrlHasProtocol(link.url);
  if (!normalizedUrl) {
    showBanner('URL adresa není platná.', 'error');
    return;
  }
  const label = (link.label || extractLinkLabel(normalizedUrl) || normalizedUrl).trim();
  const existing = gridDataCache[position] ? { ...gridDataCache[position] } : {};
  const links = normalizeLinksFromData(existing);
  links.push({ label, url: normalizedUrl });
  await persistBoxLinks(position, links, 'Odkaz uložen.');
}

function handleDetailLinksClick(event) {
  const removeBtn = event.target.closest('[data-link-remove]');
  if (removeBtn) {
    event.preventDefault();
    const index = Number(removeBtn.dataset.linkRemove);
    if (Number.isInteger(index)) {
      removeDetailLink(index);
    }
  }
}

async function showBoxDetails(box) {
    const position = box.dataset.position;
    if (!gridDocRef) return;

    const snap = await window.firebase.getDoc(gridDocRef);
    if (!snap.exists()) return;

    const gridData = snap.data().gridData || {};
    const boxData = gridData[position] || {};
    currentBoxDetails = { position, data: boxData };

    initDetailColorControls();
    document.getElementById('box-position').textContent = position;
    const boxPreviewEl = document.getElementById('box-preview');
    updateDetailMultiLineUI(position, boxData);
    updateDetailLinksUI(position, boxData);
    updateDetailColorUI(position, boxData);
    showLinkFeedback('', 'muted');
    // ... (logika pro vyplnění detailů zůstává stejná)
    document.getElementById('box-description').value = boxData.description || '';
    document.getElementById('detail-panel').classList.add('active');
}

 function generateGrid() {
     const gridContainer = document.getElementById('grid-container');
     if (!gridContainer) return;

     for (let r = 1; r <= 7; r++) {
         const row = document.createElement('div');
         row.className = 'row';
         for (let c = 1; c <= 15; c++) {
             const box = document.createElement('div');
             box.className = 'box';
             box.dataset.position = `${r}-${c}`;
             box.setAttribute("draggable", "true");
             row.appendChild(box);
         }
         gridContainer.appendChild(row);
     }
     console.log('✅ Grid HTML generated.');
 }

 // =================================================================================
 // --- 4. APLIKAČNÍ LOGIKA (WORKFLOWS) ---
 // =================================================================================

function startTextEdit(box) {
  if (isEditingText || !box) return;
  const position = box.dataset.position;
  if (!position) return;

  const docSnapPromise = window.firebase.getDoc(gridDocRef);
  docSnapPromise.then(async (docSnap) => {
    if (!docSnap.exists()) return;
    const gridData = docSnap.data().gridData || {};
    const boxData = gridData[position] || {};
    if (boxData.hasImage) {
      showBanner('Obrázek nelze přejmenovat, pouze text.', 'error');
      return;
    }

    isEditingText = true;
    const currentText = box.dataset.title || box.querySelector('.box-title-badge')?.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'w-full h-full border-none outline-none bg-white/90 text-center font-sans text-sm p-2 rounded-lg ring-2 ring-blue-500';

    box.classList.remove('has-title');
    box.dataset.title = '';
    box.innerHTML = '';
    box.appendChild(input);
    input.focus();
    input.select();

    const existingCache = gridDataCache[position]
      ? { ...gridDataCache[position] }
      : (boxData ? { ...boxData } : {});

    const restore = () => {
      applySingleBoxData(box, existingCache);
    };

    const finish = async (commit) => {
      if (!isEditingText) return;
      isEditingText = false;
      input.removeEventListener('blur', handleBlur);

      if (!commit) {
        restore();
        return;
      }

      const newText = input.value.trim();
      const previous = (currentText || '').trim();

      if (newText === previous) {
        restore();
        return;
      }

      const payload = newText
        ? { hasText: true, text: newText, hasImage: false }
        : { hasText: false, text: '', hasImage: false };

      const merged = { ...existingCache, ...payload };
      if (!newText) {
        merged.hasText = false;
        merged.text = '';
      }

      try {
        await updateBoxDataInFirestore(position, payload);
        applySingleBoxData(box, merged);
        gridDataCache[position] = merged;
      } catch (error) {
        console.error('startTextEdit save error', error);
        applySingleBoxData(box, existingCache);
        showBanner('Text se nepodařilo uložit.', 'error');
      }
    };

    const handleBlur = () => finish(true);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
  });
}

 async function handleNavAction(action, position) {
     const box = document.querySelector(`[data-position="${position}"]`);
     if (!box) return;

    switch(action) {
        case 'rename':
            startTextEdit(box);
            break;
        case 'link':
            const rawUrl = prompt('Zadejte URL adresu:', 'https://');
            if (rawUrl) {
                const normalizedUrl = ensureUrlHasProtocol(rawUrl);
                if (!normalizedUrl) {
                  showBanner('URL adresa není platná.', 'error');
                } else {
                  const defaultLabel = extractLinkLabel(normalizedUrl) || normalizedUrl;
                  const rawLabel = prompt('Text odkazu (volitelné):', defaultLabel) || '';
                  const label = rawLabel.trim() || defaultLabel;
                  await appendLinkToPosition(position, { label, url: normalizedUrl });
                }
            }
            break;
        case 'color':
            showNavIcons(box);
            openNavColorPanel(position);
            break;
        case 'delete':
    // Okamžité smazání bez potvrzení + archivace pro obnovu
    await archiveAndDeleteBox(position);
            break;
     }
 }


 async function handleAddNewProject() {
  if (!isFirebaseReady || !userWorkspacesDocRef) {
    showBanner('Firebase ještě není připraven.', 'error');
    return;
  }
  const projectName = prompt("Zadejte název nového projektu:", "Nový projekt");
  if (!projectName || projectName.trim() === '') {
    showBanner("Název projektu nemůže být prázdný.", "error");
    return;
  }

  document.getElementById('workspace-loading').classList.add('active');

  const newWorkspaceId = `ws_${Date.now()}`;
  const newCollectionName = `project73_${newWorkspaceId}`;

  workspaceConfigs[newWorkspaceId] = {
    name: projectName,
    collection: newCollectionName,
    sessionId: null,
    gridDocRef: null
  };

  try {
    await window.firebase.updateDoc(userWorkspacesDocRef, {
      workspaces: prepareWorkspacePayload(workspaceConfigs)
    });

    renderWorkspacePanels();
    await switchWorkspace(newWorkspaceId);
    refreshWorkspaceToolbar();

    showBanner(`Projekt "${projectName}" byl úspěšně vytvořen.`, 'info');

  } catch (error) {
    console.error("❌ Error creating new project:", error);
    showBanner("Nepodařilo se vytvořit nový projekt.", "error");
    delete workspaceConfigs[newWorkspaceId];
  } finally {
    document.getElementById('workspace-loading').classList.remove('active');
  }
}

 async function initializeWorkspace(workspaceId) {
     const config = workspaceConfigs[workspaceId];
     const fingerprint = getBrowserFingerprint();

     let session = await findSessionByFingerprint(fingerprint, config.collection);
     if (!session) {
       console.log('ℹ️ No session found for fingerprint, attempting fallback.');
       session = await findMostRecentSession(config.collection);
     }

    if (session) {
      config.sessionId = session.id;
      config.gridDocRef = window.firebase.doc(window.firebase.db, config.collection, session.id);
      console.log(`✅ Using session ${session.id} for workspace ${workspaceId}`);
      await ensureWorkspaceBaseline(workspaceId, { force: false });
      return session;
    }

    const { db, doc, setDoc, serverTimestamp } = window.firebase;
    const userId = currentUser.uid;
    const newSessionId = `${workspaceId}_${Date.now()}_${userId.slice(0, 8)}`;
     config.sessionId = newSessionId;
     config.gridDocRef = doc(db, config.collection, config.sessionId);

     const sessionData = {
         userId, sessionId: newSessionId, workspaceId, browserFingerprint: fingerprint,
         gridData: {},
         stats: { totalBoxes: 105, filledBoxes: 0, emptyBoxes: 105, isActive: true },
         metadata: { version: "2.0", project: "Project_73", workspace: workspaceId, gridSize: "15x7" },
         created: serverTimestamp(),
         lastModified: serverTimestamp(),
         lastAccessed: serverTimestamp()
     };

    await setDoc(config.gridDocRef, sessionData);
    console.log(`✅ Created new session for ${workspaceId}:`, newSessionId);
    await ensureWorkspaceBaseline(workspaceId, { force: true });
    return { sessionId: newSessionId, gridDocRef: config.gridDocRef };
}

 async function updateBoxDataInFirestore(position, dataToSave) {
     if (!gridDocRef) return;
     const { updateDoc, getDoc, serverTimestamp, doc: fbDoc } = window.firebase;

     if (dataToSave === null) {
         const docSnap = await getDoc(gridDocRef);
         if (docSnap.exists()) {
             const updatedGridData = { ...docSnap.data().gridData };
             delete updatedGridData[position];
             await updateDoc(gridDocRef, {
                 gridData: updatedGridData,
                 'lastModified': serverTimestamp()
             });
         }
         return;
     }

     const docSnap = await getDoc(gridDocRef);
     if (!docSnap.exists()) return;

     const gridData = docSnap.data().gridData || {};
     const existingData = gridData[position] || {};
     const mergedData = { ...existingData, ...dataToSave, updatedAt: serverTimestamp() };

     await updateDoc(gridDocRef, {
         [`gridData.${position}`]: mergedData,
         'lastModified': serverTimestamp()
     });
 }

 async function swapBoxDataInFirestore(pos1, pos2) {
     if (!gridDocRef) return false;
     const { getDoc, updateDoc, serverTimestamp } = window.firebase;
     const docSnap = await getDoc(gridDocRef);
     if (!docSnap.exists()) return false;

     const gridData = docSnap.data().gridData || {};
     const data1 = gridData[pos1] ? { ...gridData[pos1] } : null;
     const data2 = gridData[pos2] ? { ...gridData[pos2] } : null;

     const updates = {};
     updates[`gridData.${pos1}`] = data2;
     updates[`gridData.${pos2}`] = data1;
     if(updates[`gridData.${pos1}`]) updates[`gridData.${pos1}`].updatedAt = serverTimestamp();
     if(updates[`gridData.${pos2}`]) updates[`gridData.${pos2}`].updatedAt = serverTimestamp();
     updates.lastModified = serverTimestamp();

     await updateDoc(gridDocRef, updates);
     console.log(`✅ Swapped data in Firestore: ${pos1} ↔ ${pos2}`);
     return true;
 }

async function archiveAndDeleteBox(position){
 if(!gridDocRef) return;
 const { getDoc, addDoc, collection, serverTimestamp } = window.firebase;
 try {
   const snap = await getDoc(gridDocRef);
   if(!snap.exists()) return;
   const gridData = snap.data().gridData || {};
   const boxData = gridData[position];
   // Pokud není co archivovat, jen smažeme (bude řešit updateBoxDataInFirestore)
   if(!boxData){
     await updateBoxDataInFirestore(position, null);
     return;
   }
   const retentionMs = ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
   try {
     await addDoc(collection(window.firebase.db, ARCHIVE_COLLECTION), {
       userId: currentUser?.uid || null,
       workspaceId: currentWorkspace,
       sessionId,
       position,
       deletedAt: serverTimestamp(),
       expiresAt: new Date(Date.now() + retentionMs), // Pro Firestore TTL (nutno povolit)
       data: boxData,
       version: '2.0'
     });
   } catch(archiveErr){
     console.error('❌ Archivace selhala (proběhne jen přímé smazání):', archiveErr);
   }
   await updateBoxDataInFirestore(position, null);
   console.log(`🗑️ Box ${position} archivován a odstraněn.`);
 } catch(e){
   console.error('❌ archiveAndDeleteBox error:', e);
 }
}

async function loadArchiveList(limitCount = 20) {
 const listEl = document.getElementById('archive-list');
 if (!listEl || !currentWorkspace || !sessionId) return;
 listEl.innerHTML = '<div class="text-gray-400 animate-pulse">Načítám...</div>';
 try {
   const { db, collection, query, where, limit, getDocs } = window.firebase;
   const col = collection(db, ARCHIVE_COLLECTION);
   // Odstraněno orderBy('deletedAt', 'desc') z dotazu, aby se předešlo chybě indexu
   const q = query(
     col,
     where('workspaceId', '==', currentWorkspace),
     where('sessionId', '==', sessionId),
     limit(limitCount)
   );
   const snap = await getDocs(q);
   if (snap.empty) {
     listEl.innerHTML = '<div class="text-gray-400 italic">Žádné záznamy</div>';
     return;
   }

   // Seřazení dokumentů na straně klienta
   const sortedDocs = snap.docs.sort((a, b) => {
     const timeA = a.data().deletedAt?.toDate() || 0;
     const timeB = b.data().deletedAt?.toDate() || 0;
     return timeB - timeA; // Sestupné řazení
   });

   listEl.innerHTML = '';
   sortedDocs.forEach(docSnap => {
     const d = docSnap.data();
     const item = document.createElement('div');
     item.className = 'flex items-start gap-2 p-2 border rounded hover:bg-gray-50';
     const label = d.data?.text || (d.data?.colorStyle ? 'Barevný blok' : (d.data?.imageUrl ? 'Obrázek' : 'Obsah'));
     item.innerHTML = `
       <div class='flex-1'>
         <div class='font-medium text-[11px] leading-tight'>${d.position} – ${label}</div>
         <div class='text-[10px] text-gray-500'>Smazáno: ${d.deletedAt?.toDate ? d.deletedAt.toDate().toLocaleString() : '-'}</div>
       </div>
       <div class='flex flex-col gap-1'>
         <button data-doc='${docSnap.id}' data-pos='${d.position}' class='restore-btn text-[10px] px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600'>Obnovit</button>
       </div>`;
     listEl.appendChild(item);
   });
 } catch (e) {
   console.error('❌ loadArchiveList error', e);
   listEl.innerHTML = '<div class="text-red-500 text-xs">Chyba při načítání archivu.</div>';
 }
}

// ================= Odložené úkoly =================
const DEFERRED_COLLECTION = 'project73_deferredTasks';
let unsubscribeDeferred = null;

async function addDeferredTask(title){
 if(!title || !currentWorkspace || !sessionId) return;
 try {
   const { db, collection, addDoc, serverTimestamp } = window.firebase;
   await addDoc(collection(db, DEFERRED_COLLECTION), {
     userId: currentUser?.uid || null,
     workspaceId: currentWorkspace,
     sessionId,
     title: title.trim(),
     status: 'open',
     createdAt: serverTimestamp(),
     updatedAt: serverTimestamp(),
     version: '1.0'
   });
 } catch(e){
   console.error('❌ addDeferredTask error', e);
   showBanner('Chyba při ukládání úkolu', 'error');
 }
}

async function toggleDeferredTask(docId, currentStatus){
 try {
   const { db, doc, updateDoc, serverTimestamp } = window.firebase;
   const ref = doc(db, DEFERRED_COLLECTION, docId);
   await updateDoc(ref, { status: currentStatus === 'open' ? 'done' : 'open', updatedAt: serverTimestamp() });
 } catch(e){
   console.error('❌ toggleDeferredTask error', e);
 }
}

async function dropDeferredTask(docId){
 try {
   const { db, doc, updateDoc, serverTimestamp } = window.firebase;
   const ref = doc(db, DEFERRED_COLLECTION, docId);
   await updateDoc(ref, { status: 'dropped', updatedAt: serverTimestamp() });
 } catch(e){
   console.error('❌ dropDeferredTask error', e);
 }
}

function renderDeferredTaskList(snapshot){
 const listEl = document.getElementById('deferred-list');
 if(!listEl) return;
 if (snapshot.empty){
   listEl.innerHTML = '<div class="text-gray-400 italic">Žádné úkoly</div>';
   return;
 }

 // Seřazení dokumentů na straně klienta, abychom se vyhnuli potřebě indexu
 const sortedDocs = snapshot.docs.sort((a, b) => {
     const timeA = a.data().createdAt?.toDate() || 0;
     const timeB = b.data().createdAt?.toDate() || 0;
     return timeB - timeA; // Sestupné řazení
 });

 listEl.innerHTML = '';
 sortedDocs.forEach(docSnap => {
   const d = docSnap.data();
   if (d.status === 'dropped') return; // skryjeme odložené definitivně
   const item = document.createElement('div');
   const statusColor = d.status === 'done' ? 'bg-green-500' : 'bg-amber-500';
   item.className = 'flex items-center gap-2 p-2 border rounded hover:bg-gray-50';
   item.innerHTML = `
     <button data-task-toggle='${docSnap.id}' class='w-4 h-4 rounded-full ${statusColor} focus:outline-none'></button>
     <div class='flex-1 text-[12px] ${d.status === 'done' ? 'line-through text-gray-400' : ''}'>${d.title}</div>
     <button data-task-drop='${docSnap.id}' class='text-[10px] px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded'>×</button>
   `;
   listEl.appendChild(item);
 });
}

function initDeferredTasksListener(){
 if (unsubscribeDeferred) { unsubscribeDeferred(); unsubscribeDeferred = null; }
 if(!currentWorkspace || !sessionId) return;
 try {
   const { db, collection, query, where, onSnapshot, limit } = window.firebase;
   const col = collection(db, DEFERRED_COLLECTION);
   const q = query(
     col,
     where('workspaceId', '==', currentWorkspace),
     where('sessionId', '==', sessionId),
     limit(50)
   );
   unsubscribeDeferred = onSnapshot(q, (snap) => {
     renderDeferredTaskList(snap);
   }, (err) => {
     console.error('❌ deferredTasks listener error', err);
   });
 } catch(e){
   console.error('❌ initDeferredTasksListener error', e);
 }
}

// ================= Kalendářové události =================
const CALENDAR_COLLECTION = 'project73_calendarEvents';
let unsubscribeCalendar = null;

async function addCalendarEvent(title, dateValue){
 if (!title || !dateValue || !currentWorkspace || !sessionId || !currentUser?.uid) {
   showBanner('Vyplň název i datum události.', 'error');
   return false;
 }
 try {
   const parsedDate = new Date(`${dateValue}T00:00:00`);
   if (Number.isNaN(parsedDate.getTime())) {
     showBanner('Datum události není platné.', 'error');
     return false;
   }
   // Použijeme Timestamp pro správné uložení data
   const { db, collection, addDoc, serverTimestamp, Timestamp } = window.firebase;
   const dayKey = parsedDate.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
   await addDoc(collection(db, CALENDAR_COLLECTION), {
     userId: currentUser.uid,
     workspaceId: currentWorkspace,
     sessionId,
     title: title.trim(),
     eventDate: Timestamp.fromDate(parsedDate), // Převod JS Date na Firestore Timestamp
     dayKey,
     allDay: true,
     createdAt: serverTimestamp(),
     updatedAt: serverTimestamp()
   });
   return true;
 } catch (e) {
   console.error('❌ addCalendarEvent error', e);
   showBanner('Událost se nepodařilo uložit.', 'error');
   return false;
 }
}

async function removeCalendarEvent(docId){
 if (!docId) return;
 try {
   const { db, doc, deleteDoc } = window.firebase;
   await deleteDoc(doc(db, CALENDAR_COLLECTION, docId));
 } catch (e) {
   console.error('❌ removeCalendarEvent error', e);
   showBanner('Událost se nepodařilo odstranit.', 'error');
 }
}

function renderCalendarList(snapshot){
 const listEl = document.getElementById('calendar-list');
 const viewListEl = document.getElementById('calendar-view-list');
 if (!listEl) return;
 if (!snapshot || snapshot.empty){
   listEl.innerHTML = '<div class="text-gray-400 italic">Žádné události</div>';
   if (viewListEl) viewListEl.innerHTML = '<div class="text-gray-400 italic">Žádné události</div>';
   return;
 }
 const docs = snapshot.docs
   .map(docSnap => ({ id: docSnap.id, data: docSnap.data() }))
   .filter(item => item.data && item.data.title);
 docs.sort((a, b) => {
   const timeA = a.data.eventDate?.toDate ? a.data.eventDate.toDate().getTime() : 0;
   const timeB = b.data.eventDate?.toDate ? b.data.eventDate.toDate().getTime() : 0;
   return timeA - timeB;
 });

 if (!docs.length){
   listEl.innerHTML = '<div class="text-gray-400 italic">Žádné události</div>';
   if (viewListEl) viewListEl.innerHTML = '<div class="text-gray-400 italic">Žádné události</div>';
   return;
 }

 listEl.innerHTML = '';
 if (viewListEl) viewListEl.innerHTML = '';
 docs.forEach(({ id, data }) => {
   const dateLabel = data.eventDate?.toDate ? data.eventDate.toDate().toLocaleDateString() : '-';

   const container = document.createElement('div');
   container.className = 'flex items-center justify-between p-2 border rounded hover:bg-gray-50';
   container.innerHTML = `
     <div class='flex flex-col text-[11px] leading-tight'>
       <span class='font-semibold text-gray-700'>${data.title}</span>
       <span class='text-gray-500'>${dateLabel}</span>
     </div>
     <button data-calendar-remove='${id}' class='text-[10px] px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-600'>Smazat</button>
   `;
   listEl.appendChild(container);

   if (viewListEl){
     const card = document.createElement('div');
     card.className = 'calendar-view-card';
     card.innerHTML = `
       <h4>${data.title}</h4>
       <time>${dateLabel}</time>
       <button data-calendar-remove='${id}' class='text-[11px] self-start px-3 py-1 bg-rose-500 text-white rounded hover:bg-rose-600'>Smazat</button>
     `;
     viewListEl.appendChild(card);
   }
 });
}

function initCalendarListener(){
 if (unsubscribeCalendar) { unsubscribeCalendar(); unsubscribeCalendar = null; }
 const listEl = document.getElementById('calendar-list');
 const viewListEl = document.getElementById('calendar-view-list');
 if (listEl) listEl.innerHTML = '<div class="text-gray-400 italic">Načítám...</div>';
 if (viewListEl) viewListEl.innerHTML = '<div class="text-gray-400 italic">Načítám...</div>';
 if (!currentWorkspace || !sessionId || !currentUser?.uid) {
   if (viewListEl) viewListEl.innerHTML = '<div class="text-gray-400 italic">Pro zobrazení kalendáře se přihlaste.</div>';
   return;
 }
 try {
   const { db, collection, query, where, onSnapshot, limit } = window.firebase;
   const col = collection(db, CALENDAR_COLLECTION);
   const q = query(
     col,
     where('userId', '==', currentUser.uid),
     where('workspaceId', '==', currentWorkspace),
     limit(100)
   );
   unsubscribeCalendar = onSnapshot(q, (snap) => {
     renderCalendarList(snap);
   }, (err) => {
     console.error('❌ calendar listener error', err);
     if (listEl) listEl.innerHTML = '<div class="text-red-500 text-xs">Chyba při načítání kalendáře.</div>';
   });
 } catch (e) {
   console.error('❌ initCalendarListener error', e);
   if (listEl) listEl.innerHTML = '<div class="text-red-500 text-xs">Kalendář nelze načíst.</div>';
 }
}

function formatBytes(bytes){
 if (bytes === undefined || bytes === null) return '—';
 if (bytes === 0) return '0 B';
 const units = ['B', 'KB', 'MB', 'GB', 'TB'];
 const index = Math.floor(Math.log(bytes) / Math.log(1024));
 return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

async function fetchStorageTopLevelSummary(){
 const { storage, ref, listAll, getMetadata, getDownloadURL } = window.firebase;
 const rootRef = ref(storage);
 const rootList = await listAll(rootRef);

 const folders = await Promise.all(rootList.prefixes.map(async (prefix) => {
   let childList;
   try {
     childList = await listAll(prefix);
   } catch (err) {
     console.warn('⚠️ listAll failed for', prefix.fullPath, err);
     childList = { prefixes: [], items: [] };
   }
   const sampleItems = await Promise.all(childList.items.slice(0, 6).map(async (itemRef) => {
     let size = null;
     let contentType = null;
     let previewUrl = null;
     try {
       const metadata = await getMetadata(itemRef);
       size = metadata?.size ?? null;
       contentType = metadata?.contentType ?? null;
       if (contentType && contentType.startsWith('image/')) {
         try {
           previewUrl = await getDownloadURL(itemRef);
         } catch (previewErr) {
           console.warn('⚠️ getDownloadURL failed for', itemRef.fullPath, previewErr);
         }
       }
     } catch (metaErr) {
       console.warn('⚠️ getMetadata failed for', itemRef.fullPath, metaErr);
     }
     return {
       name: itemRef.name,
       path: itemRef.fullPath,
       size,
       contentType,
       previewUrl
     };
   }));
   let approxSize = 0;
   await Promise.all(childList.items.slice(0, 25).map(async (itemRef) => {
     try {
       const metadata = await getMetadata(itemRef);
       approxSize += metadata?.size || 0;
     } catch (metaErr) {
       console.warn('⚠️ getMetadata failed for', itemRef.fullPath, metaErr);
     }
   }));
   return {
     name: prefix.name,
     path: prefix.fullPath,
     folderCount: childList.prefixes.length,
     fileCount: childList.items.length,
     sampleItems,
     approxSize
   };
 }));

 const files = await Promise.all(rootList.items.map(async (itemRef) => {
   let size = null;
   let contentType = null;
   try {
     const metadata = await getMetadata(itemRef);
     size = metadata?.size ?? null;
     contentType = metadata?.contentType ?? null;
   } catch (err) {
     console.warn('⚠️ getMetadata failed for', itemRef.fullPath, err);
   }
   return {
     name: itemRef.name,
     path: itemRef.fullPath,
     size,
     contentType
   };
 }));

 return { folders, files };
}

function renderAssetsOverview(summary){
 const contentEl = document.getElementById('assets-view-content');
 const emptyEl = document.getElementById('assets-view-empty');
 if (!contentEl || !emptyEl) return;

 if (!summary || (!summary.folders.length && !summary.files.length)) {
   contentEl.innerHTML = '';
   emptyEl.textContent = 'V kořenovém adresáři Firebase Storage nejsou žádná data.';
   return;
 }

 emptyEl.textContent = '';
 contentEl.innerHTML = '';

 summary.folders.forEach(folder => {
   const card = document.createElement('div');
   card.className = 'assets-view-card';
   card.dataset.assetPath = folder.path;
   card.dataset.assetType = 'folder';
   card.innerHTML = `
     <h4>📁 ${folder.name}</h4>
     <dl>
       <dt>Cesta</dt><dd>${folder.path}</dd>
       <dt>Složky</dt><dd>${folder.folderCount}</dd>
       <dt>Soubory</dt><dd>${folder.fileCount}</dd>
       <dt>Velikost (≈)</dt><dd>${folder.approxSize ? formatBytes(folder.approxSize) : '—'}</dd>
     </dl>
     <div class='assets-view-preview'></div>
   `;
   contentEl.appendChild(card);
   const previewEl = card.querySelector('.assets-view-preview');
   if (previewEl && folder.sampleItems.length){
     folder.sampleItems.forEach(sample => {
       const item = document.createElement('div');
       item.className = 'assets-preview-item';
       const nameEl = document.createElement('div');
       nameEl.className = 'assets-preview-name';
       nameEl.textContent = sample.name;
       const sizeEl = document.createElement('div');
       sizeEl.textContent = sample.size ? formatBytes(sample.size) : '';
       if (sample.previewUrl){
         const thumb = document.createElement('img');
         thumb.className = 'assets-preview-thumb';
         thumb.alt = sample.name;
         thumb.loading = 'lazy';
         thumb.src = sample.previewUrl;
         item.appendChild(thumb);
       }
       item.appendChild(nameEl);
       if (sizeEl.textContent) item.appendChild(sizeEl);
       previewEl.appendChild(item);
     });
   }
 });

 summary.files.forEach(file => {
   const card = document.createElement('div');
   card.className = 'assets-view-card';
   card.dataset.assetPath = file.path;
   card.dataset.assetType = 'file';
   card.innerHTML = `
     <h4>📄 ${file.name}</h4>
     <dl>
       <dt>Cesta</dt><dd>${file.path}</dd>
       <dt>Typ</dt><dd>${file.contentType || '—'}</dd>
       <dt>Velikost</dt><dd>${file.size ? formatBytes(file.size) : '—'}</dd>
     </dl>
   `;
   contentEl.appendChild(card);
 });
}

async function loadAssetsOverview(force = false){
 const contentEl = document.getElementById('assets-view-content');
 const emptyEl = document.getElementById('assets-view-empty');
 if (!contentEl || !emptyEl) return;

 if (!isFirebaseReady || !currentUser) {
   contentEl.innerHTML = '';
   emptyEl.textContent = 'Pro zobrazení obsahu Storage se přihlaste.';
   return;
 }

 if (assetsLoading) return;
 if (assetsLoadedOnce && !force) return;

 assetsLoading = true;
 emptyEl.textContent = '';
 contentEl.innerHTML = '<div class="text-sm text-gray-500">Načítám obsah Firebase Storage...</div>';

 try {
 const summary = await fetchStorageTopLevelSummary();
 renderAssetsOverview(summary);
 assetsSummaryCache = summary;
 assetsLoadedOnce = true;
} catch (err) {
   console.error('❌ loadAssetsOverview error', err);
   contentEl.innerHTML = '';
   emptyEl.textContent = 'Obsah se nepodařilo načíst. Zkuste to prosím znovu.';
 } finally {
   assetsLoading = false;
 }
}

// Duplicate gallery block removed (single canonical implementation retained earlier)

async function restoreArchivedBox(docId, position){
 try {
   const { db, doc, getDoc, updateDoc } = window.firebase;
   const archiveDocRef = doc(db, ARCHIVE_COLLECTION, docId);
   const snap = await getDoc(archiveDocRef);
   if(!snap.exists()) return;
   const archived = snap.data();
   const data = archived.data || {};
   await updateBoxDataInFirestore(position, data);
   await updateDoc(archiveDocRef, { restored: true, restoredAt: new Date() });
   showBanner(`Obnoveno ${position}.`, 'info');
 } catch(e){
   console.error('❌ restoreArchivedBox error', e);
   showBanner('Chyba při obnově.', 'error');
 } finally {
   loadArchiveList();
 }
}

 async function uploadImageToStorage(fileOrBlob, position) {
     const { storage, ref, uploadBytesResumable, getDownloadURL } = window.firebase;

     const mime = (fileOrBlob.type && fileOrBlob.type.startsWith('image/')) ? fileOrBlob.type : 'image/png';
     const imageId = `img_${Date.now()}_${position}`;
     const fileExtension = mime.split('/')[1] || 'png';
     const fileName = `${imageId}.${fileExtension}`;
     const storagePath = `project73-images/${sessionId}/${fileName}`;
     const storageRef = ref(storage, storagePath);
     const metadata = { contentType: mime };

     const uploadTask = uploadBytesResumable(storageRef, fileOrBlob, metadata);

     return new Promise((resolve, reject) => {
         let progressStarted = false;
         const timeoutDuration = 15000; 

         const timeoutId = setTimeout(() => {
             if (!progressStarted) {
                 uploadTask.cancel(); 
                 console.error(`❌ Upload pro ${position} vypršel po ${timeoutDuration}ms.`);
                 reject(new Error('Upload timed out'));
             }
         }, timeoutDuration);

         uploadTask.on('state_changed',
             (snapshot) => {
               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
               if (snapshot.bytesTransferred > 0 && !progressStarted) {
                   progressStarted = true;
                   clearTimeout(timeoutId); 
               }
             }, 
             (error) => { 
                 clearTimeout(timeoutId); 
                 console.error(`❌ Upload pro ${position} selhal:`, error.code, error.message);

                 switch (error.code) {
                     case 'storage/unauthorized':
                         showBanner("Chyba: Nedostatečná oprávnění pro nahrání souboru.", "error");
                         break;
                     case 'storage/canceled':
                         if (!progressStarted) showBanner("Nahrávání trvá příliš dlouho.", "error");
                         break;
                     default:
                         showBanner("Neznámá chyba při nahrávání.", "error");
                         break;
                 }
                 reject(error); 
             },
             async () => {
                 clearTimeout(timeoutId); 
                 try {
                     const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                     console.log(`✅ Soubor pro ${position} nahrán:`, downloadURL);
                     resolve({ url: downloadURL, id: imageId, fileName });
                 } catch(e) {
                     console.error(`❌ Chyba při získávání URL pro ${position}:`, e);
                     reject(e);
                 }
             }
         );
     });
 }

 async function processUploadQueue() {
     if (!isFirebaseReady || uploadQueue.length === 0) return;

     while (uploadQueue.length > 0) {
         const { blob, position, localUrl } = uploadQueue.shift();
         try {
             const imageData = await uploadImageToStorage(blob, position);

             const box = document.querySelector(`[data-position="${position}"]`);
             if (box && box.style.backgroundImage.includes(localUrl)) {
                 box.style.backgroundImage = `url(${imageData.url})`;
             }

             await updateBoxDataInFirestore(position, {
                 hasImage: true, imageUrl: imageData.url, imageId: imageData.id,
                 hasText: false, text: '', hasColor: false
             });
             console.log(`✅ Queued image uploaded and saved for ${position}`);
         } catch (error) {
             console.error(`❌ Failed to process upload queue for ${position}:`, error);
             const box = document.querySelector(`[data-position="${position}"]`);
             if (box) box.style.outline = '2px solid red';
         }
     }
 }

// ================================================================
// Helper: Komprese / resize obrázku na klientu před uploadem
// - Zachová typ JPEG/PNG, ale větší PNG převádí na JPEG kvůli úspoře
// - maxWidth / maxHeight: omezení delší hrany
// - quality: 0..1 (použito jen pro JPEG/WebP)
// Vrací Promise<Blob>
async function compressImageIfNeeded(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = {}) {
 if (!(file instanceof Blob)) return file;
 // Pokud je soubor menší než ~600KB, neřešíme (rychlejší)
 if (file.size < 600 * 1024) return file;
 const originalType = file.type || 'image/jpeg';
 const convertToJpeg = !/\b(jpeg|jpg|webp)\b/i.test(originalType);

 const arrayBuf = await file.arrayBuffer();
 const blobUrl = URL.createObjectURL(new Blob([arrayBuf]));
 const img = await new Promise((res, rej) => {
   const i = new Image();
   i.onload = () => res(i);
   i.onerror = rej;
   i.src = blobUrl;
 });
 URL.revokeObjectURL(blobUrl);

 let { width, height } = img;
 const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
 if (ratio < 1) { width = Math.round(width * ratio); height = Math.round(height * ratio); }

 const canvas = document.createElement('canvas');
 canvas.width = width; canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, width, height);

 const mime = convertToJpeg ? 'image/jpeg' : (originalType === 'image/png' && file.size > 2*1024*1024 ? 'image/jpeg' : originalType);

 const blobCompressed = await new Promise(resolve => canvas.toBlob(b => resolve(b || file), mime, quality));
 // Pokud komprese nepomohla (větší než originál), vrať originál
 if (blobCompressed.size >= file.size) return file;
 return blobCompressed;
}

 // =================================================================================
 // --- 3. MANIPULACE S UI (DOM) ---
 // =================================================================================
 function swapBoxElementsInDOM(box1, box2) {
 const pos1 = box1.dataset.position;
 const pos2 = box2.dataset.position;

 const content1 = {
   innerHTML: box1.innerHTML,
   backgroundImage: box1.style.backgroundImage,
   background: box1.style.background,
   linkUrl: box1.dataset.linkUrl,
   linkText: box1.dataset.linkText
 };
 const content2 = {
   innerHTML: box2.innerHTML,
   backgroundImage: box2.style.backgroundImage,
   background: box2.style.background,
   linkUrl: box2.dataset.linkUrl,
   linkText: box2.dataset.linkText
 };

 // Vyčistit původní obsah (neztrácíme referenci na elementy)
 box1.innerHTML = ''; box1.style.backgroundImage = 'none'; box1.style.background = '';
 box2.innerHTML = ''; box2.style.backgroundImage = 'none'; box2.style.background = '';

 // Aplikace prohozeného obsahu
 box1.innerHTML = content2.innerHTML;
 box1.style.backgroundImage = content2.backgroundImage;
 box2.dataset.linkUrl = content1.linkUrl || '';
 box2.dataset.linkText = content1.linkText || '';

 // Optimistická aktualizace cache (aby diff re-render nesmazal lokální swap)
 const cache1 = gridDataCache[pos1];
 const cache2 = gridDataCache[pos2];
 gridDataCache[pos1] = cache2 ? { ...cache2 } : undefined;
 gridDataCache[pos2] = cache1 ? { ...cache1 } : undefined;
 if (DEBUG_DIFF) console.log('⚡ Optimistický lokální swap (cache)', pos1, '<->', pos2);
 }

 // --- RYCHLÉ LOKÁLNÍ SWAP DAT (bez innerHTML kopírování) ---
 function swapBoxDataLocal(p1, p2, gridData){
   const a = gridData[p1] ? { ...gridData[p1] } : null;
   const b = gridData[p2] ? { ...gridData[p2] } : null;
   gridData[p1] = b; gridData[p2] = a;
 }

 // Bezpečné naplnění jednoho boxu (subset render používá)
function applySingleBoxData(box, data){
  box.innerHTML = '';
  box.style.backgroundImage = 'none';
  box.style.background = '';
  box.dataset.linkUrl = '';
  box.dataset.linkText = '';
  box.dataset.linkCount = '0';
  box.dataset.title = '';
  box.classList.remove('has-title');
  if (!data) return;
  if (data.hasImage && data.imageUrl){
    box.style.backgroundImage = `url(${data.imageUrl})`;
  } else if (data.hasColor && data.colorStyle){
    box.style.background = data.colorStyle;
  }

  const titleText = (data.hasText && data.text) ? data.text.trim() : '';
  if (titleText){
    const badge = document.createElement('div');
    badge.className = 'box-title-badge';
    badge.textContent = titleText;
    box.appendChild(badge);
    box.classList.add('has-title');
    box.dataset.title = titleText;
    if (!data.hasColor && !(data.hasImage && data.imageUrl)) {
      box.style.background = 'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 100%)';
    }
  }

  const normalizedLinks = normalizeLinksFromData(data);
  if (normalizedLinks.length){
    box.dataset.linkCount = String(normalizedLinks.length);
  }
 }

 function renderBoxesSubset(subset){ // subset: { 'r-c': data, ... }
   Object.entries(subset).forEach(([pos, data]) => {
     const box = document.querySelector(`.box[data-position="${pos}"]`);
     if (!box) return;
     applySingleBoxData(box, data);
     if (data) gridDataCache[pos] = { ...data }; else delete gridDataCache[pos];
   });
 }

 // Post-drag integritní kontrola – ověří, že lokální cache odpovídá serveru (řeší závodní stavy)
 function schedulePostDragIntegrityCheck(positions){
   if(!gridDocRef) return;
   // Krátké zpoždění – dá prostor Firestore listeneru dodat případný pending snapshot
   setTimeout(async () => {
     try {
       const snap = await window.firebase.getDoc(gridDocRef);
       if(!snap.exists()) return;
       const serverGrid = snap.data().gridData || {};
       const diffs = {};
       const keys = new Set([...Object.keys(serverGrid), ...Object.keys(gridDataCache)]);
       for (const k of keys){
         const a = gridDataCache[k];
         const b = serverGrid[k];
         if (!isObjectEqual(a, b)) diffs[k] = b;
       }
       if (Object.keys(diffs).length > 0){
         if (DEBUG_DIFF) console.log("🔄 Integrační oprava po drag&drop", diffs);
         renderBoxesSubset(diffs);
       }
     } catch (e) {
       console.warn("Integrační kontrola selhala:", e);
     }
   }, 800);
 }

 function isObjectEqual(a, b){
   if (a === b) return true;
   if (!a || !b) return false;
   const keysA = Object.keys(a), keysB = Object.keys(b);
   if (keysA.length !== keysB.length) return false;
   return keysA.every(k => a[k] === b[k]);
 }

 // Deploy panel handlers with Debug mode
 document.addEventListener("DOMContentLoaded", () => {
   const deployBtn = document.getElementById("quick-deploy-btn");
   const panel = document.getElementById("deploy-panel");
   const closeBtn = document.getElementById("deploy-close");
   const copyBtn = document.getElementById("deploy-copy");
   const minBtn = document.getElementById("deploy-min");
   const deployModeBtn = document.getElementById("deploy-mode");
   const debugModeBtn = document.getElementById("debug-mode");
   const deployCommands = document.getElementById("deploy-commands");
   const debugCommands = document.getElementById("debug-commands");

   let isDebugMode = false;

   function toggleMode() {
     isDebugMode = !isDebugMode;
     if (isDebugMode) {
       deployModeBtn.style.background = "#374151";
       deployModeBtn.style.color = "#9ca3af";
       debugModeBtn.style.background = "#1e293b";
       debugModeBtn.style.color = "#cbd5e1";
       deployCommands.style.display = "none";
       debugCommands.style.display = "block";
     } else {
       deployModeBtn.style.background = "#1e293b";
       deployModeBtn.style.color = "#cbd5e1";
       debugModeBtn.style.background = "#374151";
       debugModeBtn.style.color = "#9ca3af";
       deployCommands.style.display = "block";
       debugCommands.style.display = "none";
     }
   }

   deployBtn?.addEventListener("click", (e) => {
     e.preventDefault();
     panel.style.display = panel.style.display === "block" ? "none" : "block";
   });

   closeBtn?.addEventListener("click", () => {
     panel.style.display = "none";
   });

   deployModeBtn?.addEventListener("click", () => {
     if (isDebugMode) toggleMode();
   });

   debugModeBtn?.addEventListener("click", () => {
     if (!isDebugMode) toggleMode();
   });

   copyBtn?.addEventListener("click", async () => {
     const activeCommands = isDebugMode ? debugCommands : deployCommands;
     try {
       await navigator.clipboard.writeText(activeCommands.textContent);
       copyBtn.textContent = "Copied!";
       setTimeout(() => { copyBtn.textContent = "Copy"; }, 1000);
     } catch (e) {
       console.warn("Copy failed:", e);
     }
   });

   minBtn?.addEventListener("click", () => {
     const isMinimized = panel.style.height === "60px";
     if (isMinimized) {
       panel.style.height = "auto";
       deployCommands.style.display = isDebugMode ? "none" : "block";
       debugCommands.style.display = isDebugMode ? "block" : "none";
       minBtn.textContent = "Min";
     } else {
       panel.style.height = "60px";
       deployCommands.style.display = "none";
       debugCommands.style.display = "none";
       minBtn.textContent = "Max";
     }
   });
 });
