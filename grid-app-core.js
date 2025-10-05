// grid-app-core.js
// Extracted core logic from backup to restore Firebase initialization, realtime updates and workspace handling.
// Guards ensure we don't redeclare if this file is loaded twice.
(function(){
  if (window.__GRID_APP_CORE_LOADED__) {
    console.log('[grid-app-core] already loaded');
    return;
  }
  window.__GRID_APP_CORE_LOADED__ = true;
  console.log('[grid-app-core] initializing');

  // Expect global variables already declared in HTML (grid-app-test.html)
  // We only define functions if missing.
  function define(name, fn){ if(!(name in window)) window[name] = fn; }

  const BOX_COLOR_PRESETS = {
    blue: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    purple: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)',
    green: 'linear-gradient(135deg, #f1f8e9 0%, #aed581 100%)',
    orange: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
    pink: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%)'
  };

  let navColorPanelEl = null;
  let navColorSwatchesEl = null;
  let navColorTitleInput = null;
  let navColorApplyBtn = null;
  let navColorClearBtn = null;
  let navColorSelectedKey = null;
  let navIconsHideTimer = null;
  let detailColorGridEl = null;
  let detailColorClearBtn = null;

  define('workspaceSupportsSetups', function workspaceSupportsSetups(workspaceId){
    if (!workspaceId) return false;
    const configs = window.workspaceConfigs || {};
    const config = configs[workspaceId];
    const result = !!(config && config.supportsSetups);
    console.log('[workspaceSupportsSetups]', { workspaceId, hasConfig: !!config, supportsSetups: config?.supportsSetups, result });
    return result;
  });

  define('setupRealtimeListener', function setupRealtimeListener(){
      if (typeof window.unsubscribeListener === 'function') window.unsubscribeListener();
      if (!window.gridDocRef || !window.firebase) return;
      console.log('[setupRealtimeListener] listening on', window.gridDocRef.path);
      window.unsubscribeListener = window.firebase.onSnapshot(
        window.gridDocRef,
        (snap) => { if (snap.exists()) { window.renderGridData && window.renderGridData(snap.data().gridData); } },
      (error) => console.error('❌ onSnapshot error:', error)
    );
  });

  define('onUserSignedIn', async function onUserSignedIn(user){
    window.currentUser = user;
    console.log('✅ User signed in:', user.uid);
    try {
      await window.loadUserWorkspaceConfig(user);
      if (!window.currentWorkspace || !window.workspaceConfigs[window.currentWorkspace]) {
        window.currentWorkspace = Object.keys(window.workspaceConfigs)[0] || 'workspace1';
      }
      await window.initializeWorkspace(window.currentWorkspace);
      const config = window.workspaceConfigs[window.currentWorkspace];
      window.sessionId = config.sessionId;
      window.gridDocRef = config.gridDocRef;
      const snap = window.gridDocRef ? await window.firebase.getDoc(window.gridDocRef) : null;
      if (snap?.exists()) window.renderGridData && window.renderGridData(snap.data().gridData);
      window.setupRealtimeListener();
      window.isFirebaseReady = true;
      window.updateFirebaseStatus && window.updateFirebaseStatus(`Ready (${window.sessionId?.substring(0, 12) || 'N/A'}...)`);
      window.processUploadQueue && window.processUploadQueue();
      document.querySelector(`.workspace-panel[data-workspace="${window.currentWorkspace}"]`)?.classList.add('active');
    } catch(e){
      console.error('onUserSignedIn error', e);
    }
  });

  define('clearCurrentWorkspace', async function clearCurrentWorkspace(){
    if (!window.gridDocRef) return;
    try {
      const snap = await window.firebase.getDoc(window.gridDocRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const currentGrid = data.gridData || {};
      if (Object.keys(currentGrid).length === 0) {
        window.showBanner && window.showBanner('Pracovní plocha je už prázdná.', 'info');
        return;
      }
      await window.firebase.updateDoc(window.gridDocRef, {
        gridData: {},
        'stats.filledBoxes': 0,
        'stats.emptyBoxes': 105,
        lastModified: window.firebase.serverTimestamp()
      });
      window.renderGridData && window.renderGridData({});
      window.showBanner && window.showBanner('Plocha vyčištěna.', 'info');
    } catch (error) {
      console.error('❌ clearCurrentWorkspace error', error);
      window.showBanner && window.showBanner('Chyba při čištění.', 'error');
    }
  });

  define('ensureBoxTitleStyles', function ensureBoxTitleStyles(){
    if (document.getElementById('p73-box-title-style')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'p73-box-title-style';
    styleEl.textContent = `
.box.has-title { padding-top: 44px; }
.box-title-badge {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 24px);
  background: rgba(14,23,42,0.92);
  color: #f8fafc;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: 0 16px 32px rgba(15,23,42,0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(6px);
}
.nav-icons { position: absolute; top: calc(100% + 12px); left: 50%; background: white; border-radius: 12px; box-shadow: 0 6px 20px rgba(15,23,42,0.18); padding: 8px; display: flex; gap: 10px; z-index: 100; opacity: 0; transform: translate(-50%, 8px) scale(0.88); transition: all 0.2s; pointer-events: none; }
.nav-icons.active { opacity: 1; transform: translate(-50%, 0) scale(1); pointer-events: all; }
.nav-color-panel { position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); min-width: 220px; background: #ffffff; border-radius: 12px; box-shadow: 0 16px 36px rgba(15,23,42,0.16); padding: 14px; display: flex; flex-direction: column; gap: 10px; z-index: 120; border: 1px solid rgba(148,163,184,0.2); }
.nav-color-panel[hidden] { display: none; }
.nav-color-swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(32px, 1fr)); gap: 8px; }
.nav-color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; position: relative; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6); }
.nav-color-swatch::after { content: ''; position: absolute; inset: -1px; border-radius: 50%; background: inherit; }
.nav-color-swatch.active { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }
.nav-color-title { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #475569; }
.nav-color-title input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.nav-color-title input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.nav-color-actions { display: flex; gap: 8px; justify-content: flex-end; }
.nav-color-btn { padding: 6px 12px; border-radius: 999px; border: 1px solid #cbd5e1; background: #f8fafc; color: #0f172a; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.nav-color-btn:hover { background: #e2e8f0; }
.nav-color-btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.nav-color-btn-primary:hover { background: #1d4ed8; }
body.dnd-active .nav-icons { opacity: 0 !important; transform: translate(-50%, 8px) scale(0.88) !important; pointer-events: none !important; }
`;
    document.head.appendChild(styleEl);
  });

  define('ensureNavColorPanel', function ensureNavColorPanel(){
    const navIcons = document.getElementById('nav-icons');
    if (!navIcons) return null;
    let panel = document.getElementById('nav-color-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'nav-color-panel';
      panel.className = 'nav-color-panel';
      panel.hidden = true;
      panel.innerHTML = `
        <div class="nav-color-swatches" id="nav-color-swatches"></div>
        <label class="nav-color-title" for="nav-color-title-input">
          <span>Nadpis</span>
          <input type="text" id="nav-color-title-input" placeholder="Nadpis (volitelné)" />
        </label>
        <div class="nav-color-actions">
          <button type="button" id="nav-color-apply" class="nav-color-btn nav-color-btn-primary">Uložit</button>
          <button type="button" id="nav-color-clear" class="nav-color-btn">Zrušit barvu</button>
        </div>
      `;
      navIcons.appendChild(panel);
    }

    navColorPanelEl = panel;
    navColorSwatchesEl = panel.querySelector('#nav-color-swatches');
    navColorTitleInput = panel.querySelector('#nav-color-title-input');
    navColorApplyBtn = panel.querySelector('#nav-color-apply');
    navColorClearBtn = panel.querySelector('#nav-color-clear');

    if (navColorSwatchesEl && !navColorSwatchesEl.children.length) {
      navColorSwatchesEl.innerHTML = Object.entries(BOX_COLOR_PRESETS)
        .map(([key, style]) => `<button type="button" class="nav-color-swatch" data-color-option="${key}" style="background:${style};"></button>`)
        .join('');
    }

    return navColorPanelEl;
  });

  window.getNavIconsElement = function getNavIconsElement(){
    return document.getElementById('nav-icons');
  };

  window.cancelNavIconsAutohide = function cancelNavIconsAutohide(){
    if (navIconsHideTimer){
      clearTimeout(navIconsHideTimer);
      navIconsHideTimer = null;
    }
  };

  window.startNavIconsAutohide = function startNavIconsAutohide(){
    window.cancelNavIconsAutohide();
    const el = window.getNavIconsElement();
    if (!el || !el.classList.contains('active')) return;
    navIconsHideTimer = setTimeout(() => {
      el.classList.remove('active');
      el.dataset.position = '';
      window.closeNavColorPanel && window.closeNavColorPanel();
      navIconsHideTimer = null;
    }, 2000);
  };

  define('initDetailColorControls', function initDetailColorControls(){
    detailColorGridEl = document.getElementById('detail-color-grid');
    detailColorClearBtn = document.getElementById('detail-color-clear');
    if (!detailColorGridEl || detailColorGridEl.dataset.initialized === '1') return;

    detailColorGridEl.innerHTML = '';
    Object.entries(BOX_COLOR_PRESETS).forEach(([key, style]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'detail-color-swatch';
      button.dataset.colorOption = key;
      button.style.background = style;
      detailColorGridEl.appendChild(button);
    });

    detailColorGridEl.addEventListener('click', (event) => {
      const swatch = event.target.closest('[data-color-option]');
      if (!swatch || !window.currentBoxDetails?.position) return;
      event.preventDefault();
      const titleInput = document.getElementById('box-title-input');
      const rawTitle = titleInput ? titleInput.value : '';
      window.applyColorToPosition && window.applyColorToPosition(window.currentBoxDetails.position, swatch.dataset.colorOption, rawTitle);
    });

    detailColorClearBtn?.addEventListener('click', (event) => {
      if (!window.currentBoxDetails?.position) return;
      event.preventDefault();
      const titleInput = document.getElementById('box-title-input');
      const rawTitle = titleInput ? titleInput.value : '';
      window.applyColorToPosition && window.applyColorToPosition(window.currentBoxDetails.position, null, rawTitle);
    });

    detailColorGridEl.dataset.initialized = '1';
  });

  define('updateDetailColorUI', function updateDetailColorUI(position, boxData = {}){
    if (!detailColorGridEl || !window.currentBoxDetails || window.currentBoxDetails.position !== position) return;
    const hasColor = boxData && boxData.hasColor;
    const activeKey = hasColor ? window.getColorKeyFromStyle?.(boxData.colorStyle) : null;
    detailColorGridEl.querySelectorAll('[data-color-option]').forEach((swatch) => {
      swatch.classList.toggle('is-active', swatch.dataset.colorOption === activeKey);
    });
    if (detailColorClearBtn) {
      detailColorClearBtn.classList.toggle('is-active', !activeKey);
    }
  });

  window.showNavIcons = function showNavIcons(box){
    const nav = window.getNavIconsElement();
    if (!nav || !box) return;
    if (nav.parentElement !== box) {
      box.appendChild(nav);
    }
    nav.dataset.position = box.dataset.position || '';
    nav.classList.add('active');
    window.cancelNavIconsAutohide();
  };

  window.hideNavIcons = function hideNavIcons(){
    const nav = window.getNavIconsElement();
    if (!nav) return;
    nav.classList.remove('active');
    nav.dataset.position = '';
    window.closeNavColorPanel && window.closeNavColorPanel();
  };

  define('selectNavColorOption', function selectNavColorOption(colorKey){
    navColorSelectedKey = colorKey || null;
    if (!navColorSwatchesEl) return;
    navColorSwatchesEl.querySelectorAll('.nav-color-swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.colorOption === navColorSelectedKey);
    });
  });

  define('triggerNavColorApply', function triggerNavColorApply(){
    const position = navColorPanelEl?.dataset.position;
    if (!position) return;
    window.applyColorToPosition && window.applyColorToPosition(position, navColorSelectedKey, navColorTitleInput?.value || '');
  });

  define('getColorKeyFromStyle', function getColorKeyFromStyle(style){
    if (!style) return null;
    const normalized = style.replace(/\s+/g, ' ');
    for (const [key, preset] of Object.entries(BOX_COLOR_PRESETS)) {
      if (preset.replace(/\s+/g, ' ') === normalized) return key;
    }
    return null;
  });

  define('openNavColorPanel', function openNavColorPanel(position){
    const navIcons = window.getNavIconsElement();
    if (!navIcons) return;
    window.ensureNavColorPanel && window.ensureNavColorPanel();
    if (!navColorPanelEl) return;
    const box = document.querySelector(`[data-position="${position}"]`);
    if (!box) {
      window.showBanner && window.showBanner('Box se nepodařilo najít.', 'error');
      return;
    }

    window.cancelNavIconsAutohide();
    navIcons.dataset.position = position;
    navColorPanelEl.dataset.position = position;

    const existingData = window.gridDataCache?.[position] || {};
    const badgeEl = box.querySelector('.box-title-badge');
    const currentTitle = existingData.text || box.dataset.title || (badgeEl?.textContent || '');
    if (navColorTitleInput) navColorTitleInput.value = currentTitle;

    const currentColorKey = window.getColorKeyFromStyle(existingData.colorStyle);
    window.selectNavColorOption && window.selectNavColorOption(currentColorKey);

    navColorPanelEl.hidden = false;
    navColorPanelEl.classList.add('active');
  });

  define('closeNavColorPanel', function closeNavColorPanel(){
    if (!navColorPanelEl) return;
    navColorPanelEl.hidden = true;
    navColorPanelEl.classList.remove('active');
    navColorPanelEl.dataset.position = '';
    navColorSelectedKey = null;
    if (navColorSwatchesEl) {
      navColorSwatchesEl.querySelectorAll('.nav-color-swatch.active').forEach((swatch) => swatch.classList.remove('active'));
    }
  });

  define('applyColorToPosition', async function applyColorToPosition(position, colorKey, rawTitle){
    if (!window.isFirebaseReady || !window.gridDocRef || !window.currentUser) {
      window.showBanner && window.showBanner('Počkej na připojení Firebase a přihlášení.', 'error');
      return;
    }

    const box = document.querySelector(`[data-position="${position}"]`);
    if (!box) {
      window.showBanner && window.showBanner('Box se nepodařilo najít.', 'error');
      return;
    }

    navColorSelectedKey = colorKey || null;
    const existingData = window.gridDataCache?.[position] ? { ...window.gridDataCache[position] } : {};
    const colorStyle = colorKey ? BOX_COLOR_PRESETS[colorKey] : '';
    const hasColor = !!colorStyle;

    const currentBgImage = box.style.backgroundImage || '';
    const hasCssImage = currentBgImage && currentBgImage !== 'none' && !currentBgImage.includes('gradient(');
    const hasImageContent = (existingData.hasImage && existingData.imageUrl) || hasCssImage;
    if (hasColor && hasImageContent) {
      window.showBanner && window.showBanner('Nejdřív odeber obrázek, potom můžeš použít barvu.', 'error');
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
      await window.updateBoxDataInFirestore(position, updatePayload);
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
      window.applySingleBoxData && window.applySingleBoxData(box, mergedData);
      if (window.gridDataCache) window.gridDataCache[position] = mergedData;
      const showBorder = !((mergedData.hasColor && mergedData.colorStyle) || (mergedData.hasImage && mergedData.imageUrl));
      box.style.borderColor = showBorder ? '#e5e7eb' : 'transparent';
      if (window.currentBoxDetails && window.currentBoxDetails.position === position) {
        window.currentBoxDetails.data = { ...window.currentBoxDetails.data, ...mergedData };
        window.updateDetailTitleUI && window.updateDetailTitleUI(position, mergedData);
        window.updateDetailColorUI && window.updateDetailColorUI(position, mergedData);
      }
      window.showBanner && window.showBanner(hasColor ? 'Barva boxu aktualizována.' : 'Barva byla odstraněna.', 'info');
      window.selectNavColorOption && window.selectNavColorOption(navColorSelectedKey);
      window.updateDetailColorUI && window.updateDetailColorUI(position, mergedData);
    } catch (error) {
      console.error('applyColorToPosition error', error);
      window.showBanner && window.showBanner('Barvu se nepodařilo uložit.', 'error');
    }
  });

  define('setupNavIconActions', function setupNavIconActions(){
    window.initDetailColorControls && window.initDetailColorControls();
    window.ensureNavColorPanel && window.ensureNavColorPanel();
    const navIconsEl = window.getNavIconsElement();
    if (!navIconsEl) return;

    if (navColorSwatchesEl) {
      navColorSwatchesEl.innerHTML = Object.entries(BOX_COLOR_PRESETS)
        .map(([key, style]) => `<button type="button" class="nav-color-swatch" data-color-option="${key}" style="background:${style};"></button>`)
        .join('');
    }

    if (!navIconsEl.__p73NavHandlersBound) {
      navIconsEl.__p73NavHandlersBound = true;
      navIconsEl.addEventListener('click', (event) => {
        const icon = event.target.closest('.nav-icon');
        if (!icon) return;
        const action = icon.dataset.action;
        if (!action) return;

        const navPosition = navIconsEl.dataset.position;
        const fallbackPosition = window.activeBox?.dataset?.position;
        const position = navPosition || fallbackPosition;
        if (!position) {
          window.showBanner && window.showBanner('Vyber box v mřížce.', 'error');
          return;
        }

        if (action === 'color') {
          window.openNavColorPanel && window.openNavColorPanel(position);
          return;
        }

        window.closeNavColorPanel && window.closeNavColorPanel();
        window.handleNavAction && window.handleNavAction(action, position);
      });

      navIconsEl.addEventListener('mouseenter', () => window.cancelNavIconsAutohide());
      navIconsEl.addEventListener('mouseleave', () => window.startNavIconsAutohide());
    }

    if (navColorPanelEl && !navColorPanelEl.__p73Bound) {
      navColorPanelEl.__p73Bound = true;

      navColorPanelEl.addEventListener('click', (event) => {
        const swatch = event.target.closest('[data-color-option]');
        if (swatch) {
          const selectedKey = swatch.dataset.colorOption;
          window.selectNavColorOption && window.selectNavColorOption(selectedKey);
          const position = navColorPanelEl?.dataset.position;
          if (position) {
            window.applyColorToPosition && window.applyColorToPosition(position, navColorSelectedKey, navColorTitleInput?.value || '');
          }
          return;
        }
      });

      navColorTitleInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          window.triggerNavColorApply && window.triggerNavColorApply();
        }
      });

      navColorApplyBtn?.addEventListener('click', () => {
        window.triggerNavColorApply && window.triggerNavColorApply();
      });

      navColorClearBtn?.addEventListener('click', () => {
        const position = navColorPanelEl?.dataset.position;
        if (!position) return;
        window.selectNavColorOption && window.selectNavColorOption(null);
        window.applyColorToPosition && window.applyColorToPosition(position, null, navColorTitleInput?.value || '');
      });

      document.addEventListener('click', (event) => {
        if (!navColorPanelEl || navColorPanelEl.hidden) return;
        if (navColorPanelEl.contains(event.target)) return;
        if (event.target.closest('[data-action="color"]')) return;
        window.closeNavColorPanel && window.closeNavColorPanel();
      });
    }
  });

  // Re-attach DOMContentLoaded auth logic if missing
  if (!window.__GRID_APP_DOM_READY_BOUND__) {
    window.__GRID_APP_DOM_READY_BOUND__ = true;
    document.addEventListener('DOMContentLoaded', () => {
      // Only run if auth listener not already set (avoid duplicate anonymous sign-in attempts)
      if (!window.firebase) {
        console.warn('[grid-app-core] firebase namespace not ready at DOMContentLoaded');
        return;
      }
      if (!document.getElementById('grid-container').querySelector('.row')) {
        try { if (typeof window.generateGrid === 'function') window.generateGrid(); } catch(e){ console.warn('generateGrid error:', e); }
      }
      try { if (typeof window.ensureBoxTitleStyles === 'function') window.ensureBoxTitleStyles(); } catch(e){ console.warn('ensureBoxTitleStyles error:', e); }
      try { if (typeof window.ensureNavColorPanel === 'function') window.ensureNavColorPanel(); } catch(e){ console.warn('ensureNavColorPanel error:', e); }
      try { if (typeof window.initializeEventListeners === 'function') window.initializeEventListeners(); } catch(e){ console.warn('initializeEventListeners error:', e); }
      try { if (typeof window.setupNavIconActions === 'function') window.setupNavIconActions(); } catch(e){ console.warn('setupNavIconActions error:', e); }
      const { auth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } = window.firebase;

      // Expose toggleAuthGate utility if missing
      if(!('toggleAuthGate' in window)){
        window.toggleAuthGate = function toggleAuthGate(show){
          const gate=document.getElementById('auth-gate');
            if(!gate) return; gate.classList[show? 'remove':'add']('hidden');
        };
      }

      // Define reusable Google sign-in function (upgrade anonymous account not handled yet)
      if(!('signInWithGoogle' in window)){
        window.signInWithGoogle = async function signInWithGoogle(){
          try {
            window.__googleProvider = window.__googleProvider || new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, window.__googleProvider);
            window.showBanner && window.showBanner('Přihlášeno přes Google','success');
            return cred.user;
          } catch(e){
            if(e?.code === 'auth/popup-closed-by-user'){
              window.showBanner && window.showBanner('Přihlášení zrušeno','warn');
            } else {
              console.error('Google sign-in error', e);
              window.showBanner && window.showBanner('Chyba Google přihlášení','error');
            }
          }
        };
      }

      // Optional sign out helper
      if(!('signOutUser' in window)){
        window.signOutUser = async function signOutUser(){
          try { await signOut(auth); window.showBanner && window.showBanner('Odhlášeno','info'); } catch(e){ console.error('signOut error', e); }
        };
      }

      // Attach click handler to Google sign-in button
      const signinBtn = document.getElementById('auth-signin-btn');
      if(signinBtn && !signinBtn.__p73Bound){
        signinBtn.__p73Bound = true;
        signinBtn.addEventListener('click', () => window.signInWithGoogle && window.signInWithGoogle());
      }

      onAuthStateChanged(auth, (user) => {
        if (user) {
          window.toggleAuthGate && window.toggleAuthGate(false);
          window.onUserSignedIn(user);
        } else {
          // Show gate briefly then fallback to anonymous if user does nothing after short delay
          window.toggleAuthGate && window.toggleAuthGate(true);
          setTimeout(()=>{
            // If still no user (race guard) sign in anonymously
            if(!auth.currentUser){
              signInAnonymously(auth).catch(err => console.error('Anonymous sign-in failed:', err));
            }
          }, 1200);
        }
      });
    });
  }

  // Append extended core only once
  if (window.__GRID_APP_CORE_EXTENDED__) return; 
  window.__GRID_APP_CORE_EXTENDED__ = true;

  function gDefine(name, fn){ if(!(name in window)) window[name] = fn; }

  // --- Utility equality + rendering (if missing) ---
  gDefine('sameBox', function sameBox(a,b){
    if (!a && !b) return true; if (!a || !b) return false;
    return (!!a.hasImage === !!b.hasImage && (a.imageUrl||'') === (b.imageUrl||'') &&
            !!a.hasText === !!b.hasText && (a.text||'') === (b.text||'') &&
            !!a.hasColor === !!b.hasColor && (a.colorStyle||'') === (b.colorStyle||'') &&
            (a.linkUrl||'') === (b.linkUrl||'') && (a.linkText||'') === (b.linkText||''));
  });

  function normalizeLinksFromData(data = {}){
    const raw = Array.isArray(data.links) ? data.links : [];
    const normalized = raw
      .map(item => ({
        label: (item?.label || item?.text || item?.title || '').trim(),
        url: ensureUrlHasProtocol(item?.url || item?.href || '')
      }))
      .filter(item => !!item.url);
    if (!normalized.length && data.linkUrl) {
      const fallbackUrl = ensureUrlHasProtocol(data.linkUrl);
      if (fallbackUrl) {
        normalized.push({
          label: (data.linkText || data.linkUrl).trim(),
          url: fallbackUrl
        });
      }
    }
    return normalized.map(item => ({
      label: item.label || extractLinkLabel(item.url) || item.url,
      url: item.url
    }));
  }

  function ensureUrlHasProtocol(rawValue){
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

  function parseBulkLinkLine(line){
    if (!line) return null;
    const trimmed = line.trim();
    if (!trimmed) return null;
    const separatorMatch = trimmed.match(/^(.+?)\s*(?:\||:)\s*(https?:\/\/\S+)\s*$/i);
    if (separatorMatch) {
      return { label: separatorMatch[1].trim(), url: separatorMatch[2].trim() };
    }
    const urlMatch = trimmed.match(/https?:\/\/\S+/i);
    if (!urlMatch) return null;
    const url = urlMatch[0].trim();
    const labelPart = trimmed.slice(0, urlMatch.index).replace(/[|:]+$/, '').trim();
    return { label: labelPart, url };
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

  function extractLinkLabel(url){
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  gDefine('applySingleBoxData', function applySingleBoxData(box, data){
    box.innerHTML = '';
    box.style.backgroundImage = 'none';
    box.style.background = '';
    box.dataset.linkUrl = '';
    box.dataset.linkText = '';
    box.dataset.linkCount = '0';
    box.dataset.title = '';
    box.classList.remove('has-title');
    const hasVisual = data && ((data.hasColor && data.colorStyle) || (data.hasImage && data.imageUrl));
    box.style.borderColor = hasVisual ? 'transparent' : '#e5e7eb';
    if (!data) return;

    if (data.hasImage && data.imageUrl) {
      box.style.backgroundImage = `url(${data.imageUrl})`;
    } else if (data.hasColor && data.colorStyle) {
      box.style.background = data.colorStyle;
    }

    const titleText = (data.hasText && data.text) ? data.text.trim() : '';
    if (titleText) {
      const badge = document.createElement('div');
      badge.className = 'box-title-badge';
      badge.textContent = titleText;
      box.appendChild(badge);
      box.classList.add('has-title');
      box.dataset.title = titleText;
      if (!data.hasColor && !(data.hasImage && data.imageUrl)) {
        box.style.background = '#ffffff';
      }
    }

    const normalizedLinks = normalizeLinksFromData(data);
    if (normalizedLinks.length) {
      box.dataset.linkCount = String(normalizedLinks.length);
    }
  });

  gDefine('renderGridData', function renderGridData(gridData={}){
    if(!window.gridDataCache) return;
    let changed=0;
    document.querySelectorAll('.box').forEach(box=>{
      const pos=box.dataset.position; const newData=gridData[pos]; const oldData=window.gridDataCache[pos];
      if (window.sameBox && window.sameBox(oldData,newData)) return;
      window.applySingleBoxData(box,newData); if(newData) window.gridDataCache[pos]={...newData}; else delete window.gridDataCache[pos]; changed++;
    });
    if(window.DEBUG_DIFF) console.log('[diff] changed boxes:', changed);
  });

  gDefine('generateGrid', function generateGrid(){
    const gridContainer=document.getElementById('grid-container'); if(!gridContainer) return;
    if(gridContainer.querySelector('.row')) return; // already
    for(let r=1;r<=7;r++){
      const row=document.createElement('div'); row.className='row';
      for(let c=1;c<=15;c++){
        const box=document.createElement('div'); box.className='box'; box.dataset.position=`${r}-${c}`; box.setAttribute('draggable','true'); row.appendChild(box);
      }
      gridContainer.appendChild(row);
    }
    console.log('✅ Grid generated (core)');
  });

  gDefine('closeDetailPanel', function closeDetailPanel(){
    const dp=document.getElementById('detail-panel'); if(dp && dp.classList.contains('active')){ dp.classList.remove('active'); window.currentBoxDetails=null; }
  });

  gDefine('updateDetailTitleUI', function updateDetailTitleUI(position, boxData={}){
    const input=document.getElementById('box-title-input');
    const saveBtn=document.getElementById('box-title-save');
    const feedback=document.getElementById('box-title-feedback');
    if(!input) return;
    if(position) input.dataset.position=position;
    const titleText=boxData.text||'';
    if(!input.matches(':focus')) input.value=titleText;
    if(feedback){
      feedback.classList.remove('text-rose-500');
      feedback.classList.add('text-gray-400');
      feedback.hidden=true;
    }
  });

  gDefine('showBoxDetails', async function showBoxDetails(box){
    if(!window.gridDocRef || !window.firebase) return; const position=box.dataset.position;
    const snap=await window.firebase.getDoc(window.gridDocRef); if(!snap.exists()) return; const gridData=snap.data().gridData||{}; const boxData=gridData[position]||{};
    window.currentBoxDetails={ position, data: boxData };
    window.initDetailColorControls && window.initDetailColorControls();
    document.getElementById('box-position').textContent=position;
    document.getElementById('box-description').value=boxData.description||'';
    window.updateDetailTitleUI && window.updateDetailTitleUI(position, boxData);
    window.updateDetailLinksUI && window.updateDetailLinksUI(position, boxData);
    window.updateDetailColorUI && window.updateDetailColorUI(position, boxData);
    window.showLinkFeedback && window.showLinkFeedback('', 'muted');
    document.getElementById('detail-panel').classList.add('active');
  });

  gDefine('saveDetailTitle', async function saveDetailTitle(){
    const input=document.getElementById('box-title-input');
    const saveBtn=document.getElementById('box-title-save');
    const feedback=document.getElementById('box-title-feedback');
    if(!input || input.disabled) return;
    const position=input.dataset.position;
    if(!position || !window.updateBoxDataInFirestore) return;

    const trimmed=input.value.trim();
    const existing=window.gridDataCache?.[position] ? { ...window.gridDataCache[position] } : {};
    const previous=(existing.text||'').trim();
    if(trimmed===previous){
    if(feedback) feedback.hidden=true;
    return;
  }

    const payload= trimmed ? { hasText:true, text:trimmed } : { hasText:false, text:'' };
    try {
      if(saveBtn){ saveBtn.classList.add('opacity-60'); }
      await window.updateBoxDataInFirestore(position, payload);
      const merged={ ...existing, ...payload };
      if(!trimmed){ merged.hasText=false; merged.text=''; }
      const box=document.querySelector(`.box[data-position="${position}"]`);
      if(box && window.applySingleBoxData) window.applySingleBoxData(box, merged);
      if(window.gridDataCache) window.gridDataCache[position]=merged;
      if(window.currentBoxDetails && window.currentBoxDetails.position===position){
        window.currentBoxDetails.data={ ...window.currentBoxDetails.data, ...payload };
      }
      window.updateDetailTitleUI && window.updateDetailTitleUI(position, merged);
      window.showBanner && window.showBanner('Nadpis uložen.', 'info');
      if(feedback) feedback.hidden=true;
    } catch(error){
      console.error('saveDetailTitle error', error);
      window.showBanner && window.showBanner('Nadpis se nepodařilo uložit.', 'error');
      if(feedback){
        feedback.textContent='Nadpis se nepodařilo uložit.';
        feedback.classList.remove('text-gray-400');
        feedback.classList.add('text-rose-500');
        feedback.hidden=false;
      }
    } finally {
      if(saveBtn) saveBtn.classList.remove('opacity-60');
    }
  });

  gDefine('updateDetailLinksUI', function updateDetailLinksUI(position, boxData = {}){
    const listEl=document.getElementById('box-links-list');
    if(!listEl) return;
    const links=normalizeLinksFromData(boxData);
    listEl.innerHTML='';
    listEl.dataset.position = position || '';
    if(!links.length){
      const empty=document.createElement('div');
      empty.className='text-xs text-gray-400 italic';
      empty.textContent='Zatím žádné odkazy.';
      listEl.appendChild(empty);
    } else {
      links.forEach((link,index)=>{
        const row=document.createElement('div');
        row.className='flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm';
        row.innerHTML=`<div class="flex flex-col min-w-0"><span class="text-sm font-medium text-gray-800 truncate">${link.label}</span><a class="text-xs text-blue-600 underline truncate" href="${link.url}" target="_blank" rel="noopener">${link.url}</a></div><button type="button" class="rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-rose-50 hover:text-rose-600" data-link-remove="${index}">Smazat</button>`;
        listEl.appendChild(row);
      });
    }
    if (typeof boxData === 'object') {
      boxData.links = links;
      if ('linkUrl' in boxData) delete boxData.linkUrl;
      if ('linkText' in boxData) delete boxData.linkText;
    }
    if(window.currentBoxDetails && window.currentBoxDetails.position===position){
      window.currentBoxDetails.data.links = links;
      delete window.currentBoxDetails.data.linkUrl;
      delete window.currentBoxDetails.data.linkText;
    }
  });

  gDefine('showLinkFeedback', function showLinkFeedback(message='', type='error'){
    const feedback=document.getElementById('box-link-feedback');
    if(!feedback) return;
    if(!message){
      feedback.hidden=true;
      feedback.textContent='';
      feedback.classList.remove('text-rose-500','text-green-600');
      feedback.classList.add('text-gray-400');
      return;
    }
    feedback.textContent=message;
    feedback.classList.remove('text-rose-500','text-green-600','text-gray-400');
    if(type==='success') feedback.classList.add('text-green-600');
    else if(type==='muted') feedback.classList.add('text-gray-400');
    else feedback.classList.add('text-rose-500');
    feedback.hidden=false;
  });

  gDefine('persistBoxLinks', async function persistBoxLinks(position, links, successMessage='Odkazy aktualizovány.'){
    if(!position) return false;
    const sanitized=normalizeLinksFromData({ links });
    const payload={ links: sanitized, linkUrl:'', linkText:'' };
    const existing=window.gridDataCache?.[position] ? { ...window.gridDataCache[position] } : {};
    try{
      await window.updateBoxDataInFirestore(position, payload);
      const merged={ ...existing, ...payload };
      merged.links=sanitized; merged.linkUrl=''; merged.linkText='';
      const box=document.querySelector(`.box[data-position="${position}"]`);
      if(box) window.applySingleBoxData && window.applySingleBoxData(box, merged);
      if(window.gridDataCache) window.gridDataCache[position]=merged;
      if(window.currentBoxDetails && window.currentBoxDetails.position===position){
        window.currentBoxDetails.data=merged;
      }
      window.updateDetailLinksUI && window.updateDetailLinksUI(position, merged);
      window.showLinkFeedback && window.showLinkFeedback('', 'muted');
      window.showBanner && window.showBanner(successMessage,'info');
      return true;
    } catch(error){
      console.error('persistBoxLinks error', error);
      window.showLinkFeedback && window.showLinkFeedback('Odkaz se nepodařilo uložit.','error');
      window.showBanner && window.showBanner('Odkaz se nepodařilo uložit.','error');
      return false;
    }
  });

  gDefine('addDetailLink', async function addDetailLink(){
    if(!window.currentBoxDetails){
      window.showLinkFeedback && window.showLinkFeedback('Vyber box pro přidání odkazu.','error');
      return;
    }
    const labelInput=document.getElementById('box-link-label');
    const urlInput=document.getElementById('box-link-url');
    if(!urlInput) return;
    const normalizedUrl=ensureUrlHasProtocol(urlInput.value);
    if(!normalizedUrl){
      window.showLinkFeedback && window.showLinkFeedback('Zadej platnou URL adresu.','error');
      return;
    }
    const label=(labelInput?.value||'').trim() || extractLinkLabel(normalizedUrl) || normalizedUrl;
    const links=normalizeLinksFromData(window.currentBoxDetails.data);
    links.push({ label, url: normalizedUrl });
    const saved=await window.persistBoxLinks(window.currentBoxDetails.position, links, 'Odkaz přidán.');
    if(saved){
      if(labelInput) labelInput.value='';
      urlInput.value='';
    }
  });

  gDefine('addDetailBulkLinks', async function addDetailBulkLinks(){
    if(!window.currentBoxDetails){
      window.showLinkFeedback && window.showLinkFeedback('Vyber box a vlož seznam odkazů.','error');
      return;
    }
    const bulkInput=document.getElementById('box-link-bulk');
    if(!bulkInput) return;
    const raw=bulkInput.value||'';
    if(!raw.trim()){
      window.showLinkFeedback && window.showLinkFeedback('Vlož alespoň jeden řádek s odkazem.','error');
      return;
    }

    const { entries, invalid } = parseBulkLinksInput(raw);
    if(!entries.length){
      window.showLinkFeedback && window.showLinkFeedback('Nepodařilo se rozpoznat žádný odkaz.','error');
      return;
    }

    const position=window.currentBoxDetails.position;
    const existingLinks=normalizeLinksFromData(window.currentBoxDetails.data);
    const existingUrls=new Set(existingLinks.map(item=>ensureUrlHasProtocol(item.url)));
    let added=0;
    let duplicates=0;

    entries.forEach(({ label, url }) => {
      const normalizedUrl=ensureUrlHasProtocol(url);
      if(!normalizedUrl) return;
      if(existingUrls.has(normalizedUrl)){
        duplicates+=1;
        return;
      }
      existingUrls.add(normalizedUrl);
      const finalLabel=(label && label.trim()) || extractLinkLabel(normalizedUrl) || normalizedUrl;
      existingLinks.push({ label: finalLabel, url: normalizedUrl });
      added+=1;
    });

    if(!added){
      window.showLinkFeedback && window.showLinkFeedback('Žádný nový odkaz nebyl přidán (duplicitní nebo neplatné řádky).','error');
      return;
    }

    const saved=await window.persistBoxLinks(position, existingLinks, added===1 ? 'Odkaz přidán.' : `${added} odkazů přidáno.`);
    if(saved){
      bulkInput.value='';
      if(duplicates || invalid){
        const notes=[];
        if(duplicates) notes.push(`${duplicates} duplicit`);
        if(invalid) notes.push(`${invalid} neplatných`);
        window.showLinkFeedback && window.showLinkFeedback(`${added} odkazů přidáno (${notes.join(', ')} vynecháno).`, 'muted');
      } else {
        window.showLinkFeedback && window.showLinkFeedback(`${added} odkazů přidáno.`, 'success');
        setTimeout(()=> window.showLinkFeedback && window.showLinkFeedback('', 'muted'), 1200);
      }
    }
  });

  gDefine('removeDetailLink', async function removeDetailLink(index){
    if(!window.currentBoxDetails) return;
    const links=normalizeLinksFromData(window.currentBoxDetails.data);
    if(index < 0 || index >= links.length) return;
    links.splice(index,1);
    await window.persistBoxLinks(window.currentBoxDetails.position, links, 'Odkaz odstraněn.');
  });

  gDefine('appendLinkToPosition', async function appendLinkToPosition(position, link){
    if(!position || !link?.url) return;
    const normalizedUrl=ensureUrlHasProtocol(link.url);
    if(!normalizedUrl){
      window.showBanner && window.showBanner('URL adresa není platná.','error');
      return;
    }
    const label=(link.label || extractLinkLabel(normalizedUrl) || normalizedUrl).trim();
    const existing=window.gridDataCache?.[position] ? { ...window.gridDataCache[position] } : {};
    const links=normalizeLinksFromData(existing);
    links.push({ label, url: normalizedUrl });
    await window.persistBoxLinks(position, links, 'Odkaz uložen.');
  });

  gDefine('handleDetailLinksClick', function handleDetailLinksClick(event){
    const removeBtn=event.target.closest('[data-link-remove]');
    if(removeBtn){
      event.preventDefault();
      const idx=Number(removeBtn.dataset.linkRemove);
      if(Number.isInteger(idx)) window.removeDetailLink && window.removeDetailLink(idx);
    }
  });

  gDefine('startTextEdit', function startTextEdit(box){
    if (!box || window.isEditingText) return;
    if (!window.gridDocRef || !window.firebase) return;

    window.firebase.getDoc(window.gridDocRef).then(async (docSnap) => {
      if (!docSnap.exists()) return;
      const gridData = docSnap.data().gridData || {};
      const position = box.dataset.position;
      const boxData = gridData[position] || {};
      if (boxData.hasImage) {
        window.showBanner && window.showBanner('Obrázek nelze přejmenovat, pouze text.', 'error');
        return;
      }

      window.isEditingText = true;
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

      const existingCache = window.gridDataCache?.[position]
        ? { ...window.gridDataCache[position] }
        : (boxData ? { ...boxData } : {});

      const restore = () => {
        if (window.applySingleBoxData) {
          window.applySingleBoxData(box, existingCache);
        }
      };

      const finish = async (commit) => {
        if (!window.isEditingText) return;
        window.isEditingText = false;
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
          await window.updateBoxDataInFirestore(position, payload);
          window.applySingleBoxData && window.applySingleBoxData(box, merged);
          if (window.gridDataCache) window.gridDataCache[position] = merged;
        } catch (error) {
          console.error('startTextEdit save error', error);
          restore();
          window.showBanner && window.showBanner('Text se nepodařilo uložit.', 'error');
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
  });

  gDefine('handleNavAction', async function handleNavAction(action, position){
    const box=document.querySelector(`[data-position="${position}"]`); if(!box) return;
    switch(action){
      case 'rename': window.startTextEdit(box); break;
      case 'link': {
        const rawUrl=prompt('Zadejte URL adresu:','https://');
        if(rawUrl){
          const normalizedUrl=ensureUrlHasProtocol(rawUrl);
          if(!normalizedUrl){
            window.showBanner && window.showBanner('URL adresa není platná.','error');
          } else {
            const defaultLabel=extractLinkLabel(normalizedUrl) || normalizedUrl;
            const rawLabel=prompt('Text odkazu (volitelné):', defaultLabel) || '';
            const label=rawLabel.trim() || defaultLabel;
            await window.appendLinkToPosition && window.appendLinkToPosition(position, { label, url: normalizedUrl });
          }
        }
        break; }
      case 'color': {
        if (typeof window.openNavColorPanel === 'function') {
          window.openNavColorPanel(position);
        }
        break;
      }
      case 'delete': await window.archiveAndDeleteBox(position); break;
    }
  });

  gDefine('initializeWorkspace', async function initializeWorkspace(workspaceId){
    const config=window.workspaceConfigs?.[workspaceId]; if(!config || !window.firebase) return;
    const { db, doc, setDoc, serverTimestamp } = window.firebase; const fingerprint=(window.getBrowserFingerprint?window.getBrowserFingerprint(): 'na');
    const userId=window.currentUser.uid; const newSessionId=`${workspaceId}_${Date.now()}_${userId.slice(0,8)}`;
    config.sessionId=newSessionId; config.gridDocRef=doc(db, config.collection, config.sessionId);
    const sessionData={ userId, sessionId:newSessionId, workspaceId, browserFingerprint:fingerprint, gridData:{}, stats:{ totalBoxes:105, filledBoxes:0, emptyBoxes:105, isActive:true }, metadata:{ version:'2.0', project:'Project_73', workspace:workspaceId, gridSize:'15x7' }, created:serverTimestamp(), lastModified:serverTimestamp(), lastAccessed:serverTimestamp() };
    await setDoc(config.gridDocRef, sessionData); console.log('✅ Created new session for', workspaceId, newSessionId); return { sessionId:newSessionId, gridDocRef:config.gridDocRef };
  });

  gDefine('updateBoxDataInFirestore', async function updateBoxDataInFirestore(position, dataToSave){
    if(!window.gridDocRef || !window.firebase) return;
    const { updateDoc, getDoc, serverTimestamp } = window.firebase;

    if(dataToSave === null){
      const docSnap = await getDoc(window.gridDocRef);
      if(docSnap.exists()){
        const updated = { ...docSnap.data().gridData };
        delete updated[position];
        await updateDoc(window.gridDocRef, { gridData: updated, lastModified: serverTimestamp() });
        if(typeof window.workspaceSupportsSetups === 'function' && window.workspaceSupportsSetups(window.currentWorkspace) && window.workspaceActiveSetup){
          window.workspaceActiveSetup[window.currentWorkspace] = null;
          window.renderWorkspaceSetups && window.renderWorkspaceSetups();
        }
      }
      return;
    }

    const docSnap = await getDoc(window.gridDocRef);
    if(!docSnap.exists()) return;
    const gridData = docSnap.data().gridData || {};
    const existing = gridData[position] || {};
    const merged = { ...existing, ...dataToSave, updatedAt: serverTimestamp() };

    await updateDoc(window.gridDocRef, { [`gridData.${position}`]: merged, lastModified: serverTimestamp() });
    if(typeof window.workspaceSupportsSetups === 'function' && window.workspaceSupportsSetups(window.currentWorkspace) && window.workspaceActiveSetup){
      window.workspaceActiveSetup[window.currentWorkspace] = null;
      window.renderWorkspaceSetups && window.renderWorkspaceSetups();
    }
  });

  gDefine('swapBoxDataInFirestore', async function swapBoxDataInFirestore(pos1,pos2){
    if(!window.gridDocRef || !window.firebase) return false; const { getDoc, updateDoc, serverTimestamp } = window.firebase;
    const docSnap=await getDoc(window.gridDocRef); if(!docSnap.exists()) return false; const gridData=docSnap.data().gridData||{};
    const data1=gridData[pos1]?{...gridData[pos1]}:null;
    const data2=gridData[pos2]?{...gridData[pos2]}:null;
    const updates={};
    updates[`gridData.${pos1}`]=data2;
    updates[`gridData.${pos2}`]=data1;
    if(updates[`gridData.${pos1}`]) updates[`gridData.${pos1}`].updatedAt=serverTimestamp();
    if(updates[`gridData.${pos2}`]) updates[`gridData.${pos2}`].updatedAt=serverTimestamp();
    updates.lastModified=serverTimestamp();
    await updateDoc(window.gridDocRef, updates);
    if(typeof window.workspaceSupportsSetups === 'function' && window.workspaceSupportsSetups(window.currentWorkspace) && window.workspaceActiveSetup){
      window.workspaceActiveSetup[window.currentWorkspace] = null;
      window.renderWorkspaceSetups && window.renderWorkspaceSetups();
    }
    console.log('✅ Swapped data', pos1,'↔',pos2);
    return true;
  });

  gDefine('archiveAndDeleteBox', async function archiveAndDeleteBox(position){
    if(!window.gridDocRef || !window.firebase) return; const { getDoc, addDoc, collection, serverTimestamp } = window.firebase;
    try { const snap=await getDoc(window.gridDocRef); if(!snap.exists()) return; const gridData=snap.data().gridData||{}; const boxData=gridData[position]; if(!boxData){ await window.updateBoxDataInFirestore(position,null); return; }
      const retentionMs = (window.ARCHIVE_RETENTION_DAYS||7) * 24*60*60*1000;
      try { await addDoc(collection(window.firebase.db, window.ARCHIVE_COLLECTION||'p73_archive'), { userId: window.currentUser?.uid||null, workspaceId: window.currentWorkspace, sessionId: window.sessionId, position, deletedAt:serverTimestamp(), expiresAt:new Date(Date.now()+retentionMs), data:boxData, version:'2.0' }); } catch(e){ console.error('Archivace selhala', e); }
      await window.updateBoxDataInFirestore(position,null); console.log('🗑️ Box archivován a odstraněn', position);
    } catch(e){ console.error('archiveAndDeleteBox error', e); }
  });

  gDefine('loadArchiveList', async function loadArchiveList(limitCount=20){
  const listEl=document.getElementById('archive-list'); if(!listEl || !window.currentWorkspace || !window.sessionId) return;
    listEl.innerHTML='<div class="text-gray-400 animate-pulse">Načítám...</div>';
  try { const { db, collection, query, where, limit, getDocs } = window.firebase; const q=query(collection(db, window.ARCHIVE_COLLECTION||'p73_archive'), where('workspaceId','==',window.currentWorkspace), where('sessionId','==',window.sessionId), limit(limitCount)); const snap=await getDocs(q); const rows=[]; snap.forEach(d=>{ const data=d.data(); rows.push(`<div class='text-xs flex justify-between gap-2'><span>${data.position}</span><button data-pos='${data.position}' class='restore-btn text-blue-500'>Obnovit</button></div>`); }); listEl.innerHTML= rows.length? rows.join('') : '<div class="text-xs text-gray-400">Archiv prázdný.</div>'; listEl.querySelectorAll('.restore-btn').forEach(btn=> btn.addEventListener('click', async () => { const snap2=await window.firebase.getDoc(window.gridDocRef); if(!snap2.exists()) return; window.showBanner && window.showBanner('Obnova vyžaduje doplnit implementaci archiv detailu','info'); })); } catch(e){ console.error('loadArchiveList error', e); listEl.innerHTML='<div class="text-xs text-red-500">Chyba načítání archivu.</div>'; }
  });

  gDefine('initializeEventListeners', function initializeEventListeners(){
  const gridContainer=document.getElementById('grid-container'); if(gridContainer){ ['mouseenter','mouseleave','dblclick','dragstart','dragover','dragleave','drop','dragend'].forEach(evt=>{ const useCapture = (evt==='mouseenter'||evt==='mouseleave'); gridContainer.addEventListener(evt, window.handleGridInteraction, useCapture); }); console.log('✅ Event delegation ready'); }
  const titleInput=document.getElementById('box-title-input');
  const titleSaveBtn=document.getElementById('box-title-save');
  if(titleInput && !titleInput.__p73Bound){
    titleInput.__p73Bound=true;
    titleInput.addEventListener('keydown', (event)=>{
      if(event.key==='Enter'){
        event.preventDefault();
        window.saveDetailTitle && window.saveDetailTitle();
      }
    });
  }
  if(titleSaveBtn && !titleSaveBtn.__p73Bound){
    titleSaveBtn.__p73Bound=true;
    titleSaveBtn.addEventListener('click', ()=> window.saveDetailTitle && window.saveDetailTitle());
  }

  const linkSaveBtn=document.getElementById('box-link-save');
  const linkUrlInput=document.getElementById('box-link-url');
  const linkLabelInput=document.getElementById('box-link-label');
  if(linkSaveBtn && !linkSaveBtn.__p73Bound){
    linkSaveBtn.__p73Bound=true;
    linkSaveBtn.addEventListener('click', ()=> window.addDetailLink && window.addDetailLink());
  }
  if(linkUrlInput && !linkUrlInput.__p73Bound){
    linkUrlInput.__p73Bound=true;
    linkUrlInput.addEventListener('keydown', (event)=>{
      if(event.key==='Enter'){
        event.preventDefault();
        window.addDetailLink && window.addDetailLink();
      }
    });
  }
  if(linkLabelInput && !linkLabelInput.__p73Bound){
    linkLabelInput.__p73Bound=true;
    linkLabelInput.addEventListener('keydown', (event)=>{
      if(event.key==='Enter' && event.metaKey){
        event.preventDefault();
        window.addDetailLink && window.addDetailLink();
      }
    });
  }
  const linkBulkInput=document.getElementById('box-link-bulk');
  const linkBulkBtn=document.getElementById('box-link-bulk-save');
  if(linkBulkBtn && !linkBulkBtn.__p73Bound){
    linkBulkBtn.__p73Bound=true;
    linkBulkBtn.addEventListener('click', ()=> window.addDetailBulkLinks && window.addDetailBulkLinks());
  }
  if(linkBulkInput && !linkBulkInput.__p73Bound){
    linkBulkInput.__p73Bound=true;
    linkBulkInput.addEventListener('keydown', (event)=>{
      if(event.key==='Enter' && (event.metaKey || event.ctrlKey)){
        event.preventDefault();
        window.addDetailBulkLinks && window.addDetailBulkLinks();
      }
    });
  }
  const linksList=document.getElementById('box-links-list');
  if(linksList && !linksList.dataset.listenerBound){
    linksList.dataset.listenerBound='1';
    linksList.addEventListener('click', (event)=> window.handleDetailLinksClick && window.handleDetailLinksClick(event));
  }
  });

  gDefine('handleGridInteraction', function handleGridInteraction(event){
    const targetBox=event.target.closest('.box'); if(!targetBox) return;
    switch(event.type){
      case 'mouseenter':
        window.activeBox = targetBox;
        if (typeof window.showNavIcons === 'function') window.showNavIcons(targetBox);
        break;
      case 'mouseleave':
        if (window.activeBox === targetBox) window.activeBox = null;
        if (typeof window.startNavIconsAutohide === 'function') window.startNavIconsAutohide();
        break;
  case 'dblclick': window.showBoxDetails(targetBox); break;
      case 'dragstart':
        if (typeof window.hideNavIcons === 'function') window.hideNavIcons();
        document.body.classList.add('dnd-active');
        window.dragSource=targetBox;
        targetBox.classList.add('dragging');
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('text/plain', targetBox.dataset.position);
        break;
      case 'dragover': event.preventDefault(); targetBox.classList.add('dragover'); break;
      case 'dragleave': targetBox.classList.remove('dragover'); break;
  case 'drop': event.preventDefault(); targetBox.classList.remove('dragover'); if(window.dragSource && window.dragSource!==targetBox){ window.swapBoxDataInFirestore(window.dragSource.dataset.position, targetBox.dataset.position); } break;
      case 'dragend':
        document.body.classList.remove('dnd-active');
        document.querySelectorAll('.box').forEach(b=>b.classList.remove('dragging','dragover'));
        window.dragSource=null;
        break;
    }
  });

  // --- UI Helpers (banner + status) ---
  gDefine('showBanner', function showBanner(message, type='info', timeout=2500){
    let host=document.getElementById('p73-banner-host');
    if(!host){
      host=document.createElement('div');
      host.id='p73-banner-host';
      host.style.cssText='position:fixed;top:10px;right:10px;z-index:99999;display:flex;flex-direction:column;gap:6px;max-width:300px;font-family:system-ui,sans-serif';
      document.body.appendChild(host);
    }
    const el=document.createElement('div');
    const colors={ info:'#2563eb', success:'#059669', error:'#dc2626', warn:'#d97706' };
    el.style.cssText=`background:${colors[type]||colors.info};color:#fff;padding:8px 12px;border-radius:6px;box-shadow:0 4px 12px -2px rgba(0,0,0,.3);font-size:13px;line-height:1.3;opacity:0;transform:translateY(-4px);transition:.25s;`;
    el.textContent=message;
    host.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateY(0)'; });
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(-4px)'; setTimeout(()=> el.remove(), 250); }, timeout);
  });

  gDefine('updateFirebaseStatus', function updateFirebaseStatus(txt){
    const el=document.getElementById('firebase-status');
    if(el) el.textContent=txt;
  });

  // --- Workspace switching ---
  gDefine('switchWorkspace', async function switchWorkspace(targetId){
    if(!window.workspaceConfigs || !window.workspaceConfigs[targetId]){ window.showBanner && window.showBanner('Neplatný workspace','error'); return; }
    if(targetId === window.currentWorkspace){ window.showBanner && window.showBanner('Už je aktivní','info'); return; }
    window.showBanner && window.showBanner(`Přepínám na ${targetId}...`,'info');
    // Detach previous realtime
    if (typeof window.unsubscribeListener === 'function'){
      try { window.unsubscribeListener(); }
      catch(err){ console.warn('unsubscribeListener cleanup failed', err); }
    }
    window.currentWorkspace = targetId;
    // Re-init workspace session (try to reuse or create new)
    try {
      await window.initializeWorkspace(window.currentWorkspace);
      const config = window.workspaceConfigs[window.currentWorkspace];
      window.sessionId = config.sessionId; window.gridDocRef = config.gridDocRef;
      window.setupRealtimeListener && window.setupRealtimeListener();
      window.updateFirebaseStatus && window.updateFirebaseStatus(`Ready (${window.sessionId?.substring(0,12)})`);
    } catch(e){ console.error('switchWorkspace error', e); window.showBanner && window.showBanner('Chyba přepnutí','error'); }
    // UI highlight
    document.querySelectorAll('.workspace-panel').forEach(p=>p.classList.remove('active'));
    document.querySelector(`.workspace-panel[data-workspace="${window.currentWorkspace}"]`)?.classList.add('active');
  });

  // --- Add new workspace (simple stub) ---
  gDefine('handleAddNewProject', async function handleAddNewProject(){
    if(!window.currentUser || !window.firebase || !window.workspaceConfigs){ window.showBanner && window.showBanner('Nelze vytvořit workspace','error'); return; }
    const base='workspace'; let idx=1; while(window.workspaceConfigs[`${base}${idx}`]) idx++; const newId=`${base}${idx}`;
    window.workspaceConfigs[newId]={ id:newId, collection:'p73_workspaces', created:Date.now(), supportsSetups:true };
    window.showBanner && window.showBanner(`Vytvořen ${newId}`,'success');
    // Persist if we have userWorkspaces doc update function (inline code may define)
    if(window.saveWorkspaceConfigs){ try { await window.saveWorkspaceConfigs(); } catch(e){ console.warn('Persist workspace configs failed', e); } }
    // Optionally create session immediately
    window.switchWorkspace && window.switchWorkspace(newId);
  });

  // --- Upload queue placeholder (prevents errors) ---
  if(!('processUploadQueue' in window)){
    window.processUploadQueue = function(){ /* no-op placeholder */ };
  }

  // --- Sidebar listeners attachment ---
  gDefine('attachSidebarListeners', function attachSidebarListeners(){
    // Workspace switch buttons (data-workspace attr)
    document.querySelectorAll('[data-action="switch-workspace"]').forEach(btn=>{
      if(btn.__p73Bound) return; btn.__p73Bound=true;
      btn.addEventListener('click', ()=>{ const target=btn.getAttribute('data-target'); if(target) window.switchWorkspace(target); });
    });
    // Add new project button
    const addBtn=document.querySelector('[data-action="add-workspace"], #add-workspace-btn');
    if(addBtn && !addBtn.__p73Bound){ addBtn.__p73Bound=true; addBtn.addEventListener('click', ()=> window.handleAddNewProject && window.handleAddNewProject()); }
  });

  // Auto-attach after DOM ready if not already
  if(document.readyState!=='loading'){ window.attachSidebarListeners && window.attachSidebarListeners(); }
  else document.addEventListener('DOMContentLoaded', ()=> window.attachSidebarListeners && window.attachSidebarListeners());

  // ================= Navigation Overflow Menu =================
  define('initNavOverflow', function initNavOverflow() {
    const nav = document.querySelector('.p73-topbar-nav');
    if (!nav) return;

    let moreContainer = null;
    let moreBtn = null;
    let morePanel = null;
    let allNavItems = [];
    let resizeObserver = null;

    function setupOverflowMenu() {
      // Wrap all existing nav items (except the more button)
      const existingItems = Array.from(nav.children).filter(child => !child.classList.contains('p73-nav-more'));

      allNavItems = existingItems.map(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'p73-nav-item';
        item.parentNode.insertBefore(wrapper, item);
        wrapper.appendChild(item);
        return {
          wrapper,
          element: item,
          isDropdown: item.classList.contains('p73-topbar-dropdown')
        };
      });

      // Create "More" dropdown if not exists
      if (!moreContainer) {
        moreContainer = document.createElement('div');
        moreContainer.className = 'p73-nav-more';
        moreContainer.style.display = 'none';

        moreBtn = document.createElement('button');
        moreBtn.className = 'p73-nav-more-btn';
        moreBtn.textContent = 'Další';
        moreBtn.type = 'button';

        morePanel = document.createElement('div');
        morePanel.className = 'p73-nav-more-panel';
        morePanel.hidden = true;

        moreContainer.appendChild(moreBtn);
        moreContainer.appendChild(morePanel);
        nav.appendChild(moreContainer);

        // Toggle dropdown
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = !morePanel.hidden;
          morePanel.hidden = isOpen;
          moreContainer.classList.toggle('open', !isOpen);
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
          if (!morePanel.hidden) {
            morePanel.hidden = true;
            moreContainer.classList.remove('open');
          }
        });

        morePanel.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }

    function handleOverflow() {
      if (!moreContainer || allNavItems.length === 0) return;

      const navWidth = nav.offsetWidth;
      const moreWidth = 100; // Reserve space for "More" button
      let availableWidth = navWidth - moreWidth;
      let visibleCount = 0;

      // Reset all items to visible
      allNavItems.forEach(item => {
        item.wrapper.style.display = '';
      });
      morePanel.innerHTML = '';

      // Calculate which items fit
      for (let i = 0; i < allNavItems.length; i++) {
        const item = allNavItems[i];
        const itemWidth = item.wrapper.offsetWidth;

        if (availableWidth >= itemWidth) {
          availableWidth -= itemWidth;
          visibleCount++;
        } else {
          break;
        }
      }

      // Hide overflow items and add to dropdown
      const hiddenItems = allNavItems.slice(visibleCount);

      if (hiddenItems.length > 0) {
        hiddenItems.forEach(item => {
          item.wrapper.style.display = 'none';

          // Clone the link for the dropdown (but not dropdown containers)
          if (!item.isDropdown) {
            const link = item.element.cloneNode(true);
            link.classList.remove('p73-topbar-link');
            morePanel.appendChild(link);
          } else {
            // For dropdown items, just add a simple link to the view
            const dropdownLink = item.element.querySelector('.p73-topbar-link');
            if (dropdownLink) {
              const simpleLink = document.createElement('a');
              simpleLink.href = dropdownLink.href;
              simpleLink.textContent = dropdownLink.textContent.replace(/\s+$/, '');
              simpleLink.dataset.toplink = dropdownLink.dataset.toplink;
              if (dropdownLink.classList.contains('active')) {
                simpleLink.classList.add('active');
              }
              morePanel.appendChild(simpleLink);
            }
          }
        });
        moreContainer.style.display = '';
      } else {
        moreContainer.style.display = 'none';
      }
    }

    setupOverflowMenu();
    handleOverflow();

    // Use ResizeObserver for efficient resize handling
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleOverflow();
      });
      resizeObserver.observe(nav);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleOverflow);
    }

    // Re-check on window load (fonts, etc.)
    window.addEventListener('load', handleOverflow);
  });

  // Initialize navigation overflow after DOM ready
  if(document.readyState!=='loading'){ initNavOverflow(); }
  else document.addEventListener('DOMContentLoaded', ()=> initNavOverflow());

  console.log('[grid-app-core] extended core loaded');
})();
