// ========================================
// SNIPPET LIBRARY V1 - ARCHIVED 2025-10-05
// ========================================
// Důvod archivace: Modul nikdy nebyl používán, účel lze vymyslet lépe
// Tento soubor obsahuje původní implementaci Knihovny kódů

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
