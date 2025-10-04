const MindmapApp = (() => {
  const ROOT_ID = 'mindmap-view';
  const COLLECTION_ROOT = 'project73_mindmap';
  const NODES_SUBCOLLECTION = 'nodes';
  const CANVAS_SIZE = 5000;
  const CANVAS_CENTER = CANVAS_SIZE / 2;
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.15;
  const DEFAULT_COLOR = '#0ea5e9';
  const NODE_ESTIMATE = { width: 220, height: 96 };
  const CHILD_OFFSET = { x: 240, y: 180 };
  const COLOR_PRESETS = [
    '#0ea5e9',
    '#38bdf8',
    '#6366f1',
    '#22c55e',
    '#f97316',
    '#facc15',
    '#ec4899',
    '#0f172a'
  ];

const state = {
  initialized: false,
  active: false,
  user: null,
  authUnsub: null,
  dataUnsub: null,
    nodes: new Map(),
    nodeElements: new Map(),
    scale: 1,
    panX: 0,
    panY: 0,
    selectedId: null,
    pendingPatch: null,
  pendingTimer: null,
  panning: null,
  dragging: null,
  viewportInitialized: false,
  pendingSelection: null,
  suppressInputs: false
  ,rootDocEnsured: false
};

  let rootEl;
  let stageEl;
  let canvasEl;
  let zoomLayerEl;
  let nodesEl;
  let linksSvg;
  let emptyEl;
  let addRootBtn;
  let addChildBtn;
  let centerBtn;
  let zoomOutBtn;
  let zoomInBtn;
  let zoomLabelEl;
  let titleInput;
  let contentInput;
  let deleteBtn;
  let colorGridEl;
  let detailHeadingEl;
  let metaEl;

  function firebaseReady() {
    return typeof window !== 'undefined'
      && window.firebase
      && window.firebase.db
      && typeof window.firebase.collection === 'function';
  }

  function ensureDom() {
    if (state.initialized) return;
    rootEl = document.getElementById(ROOT_ID);
    if (!rootEl) return;

    stageEl = document.getElementById('mindmap-stage');
    canvasEl = document.getElementById('mindmap-canvas');
    zoomLayerEl = document.getElementById('mindmap-zoom-layer');
    nodesEl = document.getElementById('mindmap-nodes');
    linksSvg = document.getElementById('mindmap-links');
    emptyEl = document.getElementById('mindmap-empty');
    addRootBtn = document.getElementById('mindmap-add-root');
    addChildBtn = document.getElementById('mindmap-add-child');
    centerBtn = document.getElementById('mindmap-center');
    zoomOutBtn = document.getElementById('mindmap-zoom-out');
    zoomInBtn = document.getElementById('mindmap-zoom-in');
    zoomLabelEl = document.getElementById('mindmap-zoom-label');
    titleInput = document.getElementById('mindmap-title-input');
    contentInput = document.getElementById('mindmap-content-input');
    deleteBtn = document.getElementById('mindmap-delete');
    colorGridEl = document.getElementById('mindmap-color-grid');
    detailHeadingEl = document.getElementById('mindmap-detail-heading');
    metaEl = document.getElementById('mindmap-meta');

    buildColorGrid();
    attachDomListeners();
    updateZoomLabel();
    setCanvasTransform();

    state.initialized = true;
  }

  function buildColorGrid() {
    if (!colorGridEl || colorGridEl.childElementCount) return;
    COLOR_PRESETS.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mindmap-color-swatch';
      btn.style.background = color;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', color);
      btn.setAttribute('aria-checked', 'false');
      btn.dataset.color = color;
      btn.addEventListener('click', () => {
        if (!state.selectedId) return;
        scheduleSelectedNodeUpdate({ color });
        updateColorSelection(color);
        const node = state.nodes.get(state.selectedId);
        if (node) {
          node.color = color;
          applyNodeVisuals(state.selectedId, node);
        }
      });
      colorGridEl.appendChild(btn);
    });
  }

  function attachDomListeners() {
    if (addRootBtn) {
      addRootBtn.addEventListener('click', handleAddRootNode);
    }
    if (addChildBtn) {
      addChildBtn.addEventListener('click', handleAddChildNode);
    }
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        if (state.selectedId && state.nodes.has(state.selectedId)) {
          centerOnNode(state.nodes.get(state.selectedId));
        } else {
          centerOnOrigin();
        }
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => adjustZoom(ZOOM_STEP));
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => adjustZoom(-ZOOM_STEP));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDeleteNode);
    }
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        if (state.suppressInputs || !state.selectedId) return;
        scheduleSelectedNodeUpdate({ title: titleInput.value });
        const node = state.nodes.get(state.selectedId);
        if (node) {
          node.title = titleInput.value;
          applyNodeVisuals(state.selectedId, node);
        }
      });
    }
    if (contentInput) {
      contentInput.addEventListener('input', () => {
        if (state.suppressInputs || !state.selectedId) return;
        scheduleSelectedNodeUpdate({ content: contentInput.value });
      });
    }
    if (stageEl) {
      stageEl.addEventListener('pointerdown', handleStagePointerDown);
      stageEl.addEventListener('pointermove', handleStagePointerMove);
      stageEl.addEventListener('pointerup', handleStagePointerUp);
      stageEl.addEventListener('pointercancel', handleStagePointerCancel);
      stageEl.addEventListener('dblclick', handleStageDoubleClick);
      stageEl.addEventListener('click', handleStageClick);
      stageEl.addEventListener('wheel', handleStageWheel, { passive: false });
    }
    window.addEventListener('resize', handleWindowResize);
  }

  function ensureAuthObserver() {
    if (state.authUnsub) return;
    if (!firebaseReady() || !window.firebase.auth || typeof window.firebase.onAuthStateChanged !== 'function') {
      return;
    }
    const { auth, onAuthStateChanged } = window.firebase;
    state.authUnsub = onAuthStateChanged(auth, (user) => {
      state.user = user || null;
      updateAvailabilityState();
      if (!state.user) {
        stopNodeSubscription();
        state.nodes.clear();
        removeAllNodeElements();
        selectNode(null);
        renderEmptyState();
        state.rootDocEnsured = false;
      } else if (state.active) {
        ensureNodeSubscription();
      }
    });
  }

  function updateAvailabilityState() {
    const canEdit = !!(state.user && state.active);
    if (addRootBtn) addRootBtn.disabled = !canEdit;
    if (zoomInBtn) zoomInBtn.disabled = !stageEl;
    if (zoomOutBtn) zoomOutBtn.disabled = !stageEl;
    updateSelectionControls();
    renderEmptyState();
  }

  function updateSelectionControls() {
    const hasSelection = !!(state.selectedId && state.nodes.has(state.selectedId));
    if (addChildBtn) addChildBtn.disabled = !hasSelection || !state.user;
    if (deleteBtn) deleteBtn.disabled = !hasSelection || !state.user;
    if (titleInput) titleInput.disabled = !hasSelection || !state.user;
    if (contentInput) contentInput.disabled = !hasSelection || !state.user;
  }

  function handleAddRootNode() {
    if (!state.user) return;
    const coords = getViewportCenter();
    createNode({ parentId: null, x: coords.x, y: coords.y, focus: true });
  }

  function handleAddChildNode() {
    if (!state.user || !state.selectedId) return;
    const parent = state.nodes.get(state.selectedId);
    if (!parent) return;
    const x = clampCoord(parent.x + CHILD_OFFSET.x);
    const y = clampCoord(parent.y + CHILD_OFFSET.y);
    createNode({ parentId: state.selectedId, x, y, focus: true });
  }

  function handleDeleteNode() {
    if (!state.selectedId || !state.user) return;
    const node = state.nodes.get(state.selectedId);
    if (!node) return;
    const confirmed = window.confirm('Opravdu odstranit toto téma i s jeho podtématy?');
    if (!confirmed) return;
    deleteNodeCascade(state.selectedId).catch((error) => {
      console.error('[Mindmap] delete failed', error);
      if (typeof window.showBanner === 'function') {
        window.showBanner('Mazání se nepodařilo. Zkuste to znovu.', 'error');
      }
    });
  }

  function handleStagePointerDown(event) {
    if (!stageEl || event.button !== 0) return;
    const nodeEl = event.target.closest('.mindmap-node');
    if (nodeEl) return;
    stageEl.setPointerCapture(event.pointerId);
    state.panning = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: state.panX,
      originY: state.panY
    };
    stageEl.classList.add('is-panning');
  }

  function handleStagePointerMove(event) {
    if (!state.panning || event.pointerId !== state.panning.pointerId) return;
    const dx = event.clientX - state.panning.startX;
    const dy = event.clientY - state.panning.startY;
    state.panX = state.panning.originX + dx;
    state.panY = state.panning.originY + dy;
    setCanvasTransform();
  }

  function handleStagePointerUp(event) {
    if (stageEl && event.pointerId) {
      try { stageEl.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    state.panning = null;
    if (stageEl) stageEl.classList.remove('is-panning');
  }

  function handleStagePointerCancel(event) {
    handleStagePointerUp(event);
  }

  function handleStageDoubleClick(event) {
    if (!state.user) {
      if (typeof window.showBanner === 'function') {
        window.showBanner('Před přidáním tématu se prosím přihlas.', 'warning');
      }
      return;
    }
    const nodeEl = event.target.closest('.mindmap-node');
    if (nodeEl) return;
    event.preventDefault();
    const coords = clientToCanvas(event.clientX, event.clientY);
    createNode({ parentId: null, x: coords.x, y: coords.y, focus: true });
  }

  function handleStageClick(event) {
    const nodeEl = event.target.closest('.mindmap-node');
    if (!nodeEl) {
      selectNode(null);
    }
  }

  function handleStageWheel(event) {
    if (!stageEl) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const focus = clientToCanvas(event.clientX, event.clientY);
    setScale(state.scale + delta, { focus });
  }

  function handleWindowResize() {
    if (!stageEl) return;
    if (!state.viewportInitialized) return;
    if (state.selectedId && state.nodes.has(state.selectedId)) {
      centerOnNode(state.nodes.get(state.selectedId));
    } else {
      centerOnOrigin();
    }
  }

  function handleNodePointerDown(event, nodeId) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const node = state.nodes.get(nodeId);
    if (!node) return;
    const el = state.nodeElements.get(nodeId);
    if (!el) return;
    el.setPointerCapture(event.pointerId);
    el.classList.add('is-dragging');
    state.dragging = {
      id: nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      moved: false
    };
  }

  function handleNodePointerMove(event, nodeId) {
    const drag = state.dragging;
    if (!drag || drag.id !== nodeId || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = (event.clientX - drag.startX) / state.scale;
    const dy = (event.clientY - drag.startY) / state.scale;
    if (!drag.moved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
      drag.moved = true;
    }
    const node = state.nodes.get(nodeId);
    if (!node) return;
    node.x = clampCoord(drag.originX + dx);
    node.y = clampCoord(drag.originY + dy);
    applyNodeVisuals(nodeId, node);
    updateLinks();
  }

  function handleNodePointerUp(event, nodeId) {
    const drag = state.dragging;
    const el = state.nodeElements.get(nodeId);
    if (el && event.pointerId) {
      try { el.releasePointerCapture(event.pointerId); } catch (_) {}
      el.classList.remove('is-dragging');
    }
    if (!drag || drag.id !== nodeId || drag.pointerId !== event.pointerId) {
      if (!drag && state.selectedId !== nodeId) {
        selectNode(nodeId);
      }
      return;
    }
    event.stopPropagation();
    state.dragging = null;
    const node = state.nodes.get(nodeId);
    if (!node) return;
    updateLinks();
    if (drag.moved) {
      persistNodePosition(nodeId, node);
    } else {
      selectNode(nodeId);
    }
  }

  function handleNodePointerCancel(event, nodeId) {
    handleNodePointerUp(event, nodeId);
  }

  function handleNodeClick(event, nodeId) {
    event.stopPropagation();
    if (state.dragging && state.dragging.id === nodeId && state.dragging.moved) {
      return;
    }
    selectNode(nodeId);
  }

  async function createNode({ parentId = null, x, y, focus = false }) {
    if (!firebaseReady()) {
      console.warn('[Mindmap] Firebase není připraveno, uzel nevytvořen.');
      return;
    }
    if (!state.user) {
      if (typeof window.showBanner === 'function') {
        window.showBanner('Před přidáním tématu se prosím přihlas.', 'warning');
      }
      return;
    }
    await ensureRootDocument();
    const { addDoc, collection, serverTimestamp, db } = window.firebase;
    const safeX = clampCoord(Math.round(x));
    const safeY = clampCoord(Math.round(y));
    const colRef = collection(db, COLLECTION_ROOT, state.user.uid, NODES_SUBCOLLECTION);
    const now = serverTimestamp();
    addDoc(colRef, {
      title: parentId ? 'Nové podtéma' : 'Nové téma',
      content: '',
      parentId: parentId || null,
      x: safeX,
      y: safeY,
      color: DEFAULT_COLOR,
      createdAt: now,
      updatedAt: now
    }).then((docRef) => {
      state.pendingSelection = focus ? docRef.id : null;
      if (focus && state.viewportInitialized) {
        setTimeout(() => {
          if (state.nodes.has(docRef.id)) {
            selectNode(docRef.id, { focus: true });
          }
        }, 0);
      }
    }).catch((error) => {
      console.error('[Mindmap] create node failed', error);
      if (typeof window.showBanner === 'function') {
        window.showBanner('Téma se nepodařilo vytvořit.', 'error');
      }
    });
  }

  function deleteNodeCascade(nodeId) {
    if (!firebaseReady() || !state.user) return Promise.resolve();
    const { doc, deleteDoc, db } = window.firebase;
    const toRemove = collectDescendants(nodeId);
    toRemove.push(nodeId);
    const deletions = toRemove.map((id) => {
      const ref = doc(db, COLLECTION_ROOT, state.user.uid, NODES_SUBCOLLECTION, id);
      return deleteDoc(ref);
    });
    return Promise.allSettled(deletions).then(() => {
      if (state.selectedId === nodeId) {
        selectNode(null);
      }
    });
  }

  function collectDescendants(nodeId) {
    const result = [];
    state.nodes.forEach((node, id) => {
      if (node.parentId === nodeId) {
        result.push(id, ...collectDescendants(id));
      }
    });
    return result;
  }

  function persistNodePosition(nodeId, node) {
    if (!firebaseReady() || !state.user) return;
    const { doc, updateDoc, serverTimestamp, db } = window.firebase;
    const ref = doc(db, COLLECTION_ROOT, state.user.uid, NODES_SUBCOLLECTION, nodeId);
    updateDoc(ref, {
      x: Math.round(node.x),
      y: Math.round(node.y),
      updatedAt: serverTimestamp()
    }).catch((error) => {
      console.error('[Mindmap] position update failed', error);
      if (typeof window.showBanner === 'function') {
        window.showBanner('Nepodařilo se uložit pozici.', 'error');
      }
    });
  }

  function scheduleSelectedNodeUpdate(partial) {
    if (!state.selectedId) return;
    state.pendingPatch = Object.assign({}, state.pendingPatch || {}, partial);
    if (state.pendingTimer) clearTimeout(state.pendingTimer);
    state.pendingTimer = setTimeout(commitSelectedNodeUpdate, 320);
  }

  function flushPendingUpdate() {
    if (state.pendingTimer) {
      clearTimeout(state.pendingTimer);
      state.pendingTimer = null;
    }
    if (!state.pendingPatch) return;
    commitSelectedNodeUpdate();
  }

  function commitSelectedNodeUpdate() {
    if (!state.pendingPatch || !state.selectedId || !state.user || !firebaseReady()) {
      state.pendingPatch = null;
      return;
    }
    const patch = state.pendingPatch;
    state.pendingPatch = null;
    const { doc, updateDoc, serverTimestamp, db } = window.firebase;
    const ref = doc(db, COLLECTION_ROOT, state.user.uid, NODES_SUBCOLLECTION, state.selectedId);
    updateDoc(ref, Object.assign({}, patch, { updatedAt: serverTimestamp() })).catch((error) => {
      console.error('[Mindmap] update failed', error);
      if (typeof window.showBanner === 'function') {
        window.showBanner('Úpravu se nepodařilo uložit.', 'error');
      }
    });
  }

  function ensureNodeSubscription() {
    if (!state.active || !state.user || state.dataUnsub) return;
    if (!firebaseReady()) return;
    ensureRootDocument();
    const { collection, orderBy, onSnapshot, db, query } = window.firebase;
    const colRef = collection(db, COLLECTION_ROOT, state.user.uid, NODES_SUBCOLLECTION);
    const q = query(colRef, orderBy('createdAt', 'asc'));
    state.dataUnsub = onSnapshot(q, (snapshot) => {
      const nextNodes = new Map();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        nextNodes.set(docSnap.id, normalizeNode(docSnap.id, data));
      });
      state.nodes = nextNodes;
      renderNodes();
      if (state.pendingSelection && nextNodes.has(state.pendingSelection)) {
        selectNode(state.pendingSelection, { focus: true });
        state.pendingSelection = null;
      }
    }, (error) => {
      console.error('[Mindmap] snapshot error', error);
    });
  }

  function stopNodeSubscription() {
    if (typeof state.dataUnsub === 'function') {
      try { state.dataUnsub(); } catch (_) {}
    }
    state.dataUnsub = null;
  }

  async function ensureRootDocument() {
    if (state.rootDocEnsured || !firebaseReady() || !state.user) return;
    const { doc, getDoc, setDoc, serverTimestamp, db } = window.firebase;
    try {
      const rootRef = doc(db, COLLECTION_ROOT, state.user.uid);
      const snap = await getDoc(rootRef);
      if (!snap.exists()) {
        await setDoc(rootRef, {
          owner: state.user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(rootRef, {
          owner: snap.data()?.owner || state.user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      state.rootDocEnsured = true;
    } catch (error) {
      console.warn('[Mindmap] Nepodařilo se zajistit kořenový dokument:', error);
    }
  }

  function normalizeNode(id, data) {
    return {
      id,
      title: (data.title || '').toString(),
      content: (data.content || '').toString(),
      parentId: data.parentId || null,
      x: typeof data.x === 'number' ? data.x : CANVAS_CENTER,
      y: typeof data.y === 'number' ? data.y : CANVAS_CENTER,
      color: data.color || DEFAULT_COLOR,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
  }

  function renderNodes() {
    if (!nodesEl) return;
    const childCounts = new Map();
    state.nodes.forEach((node) => {
      if (node.parentId) {
        childCounts.set(node.parentId, (childCounts.get(node.parentId) || 0) + 1);
      }
    });

    const seen = new Set();
    state.nodes.forEach((node, id) => {
      seen.add(id);
      let el = state.nodeElements.get(id);
      if (!el) {
        el = createNodeElement(id);
        state.nodeElements.set(id, el);
        nodesEl.appendChild(el);
      }
      applyNodeVisuals(id, node, childCounts.get(id) || 0);
    });

    state.nodeElements.forEach((el, id) => {
      if (!seen.has(id)) {
        el.remove();
        state.nodeElements.delete(id);
      }
    });

    if (state.selectedId && !state.nodes.has(state.selectedId)) {
      selectNode(null);
    }

    renderEmptyState();
    updateLinks();
  }

  function renderEmptyState() {
    if (!emptyEl) return;
    if (!state.user) {
      emptyEl.hidden = false;
      emptyEl.querySelector('p').textContent = 'Přihlas se Google účtem, abys mohl tvořit myšlenkovou mapu.';
      return;
    }
    const hasNodes = state.nodes.size > 0;
    emptyEl.hidden = hasNodes;
    if (!hasNodes) {
      emptyEl.querySelector('p').textContent = 'Přidej první téma pomocí tlačítka nahoře nebo dvojklikem do plátna.';
    }
  }

  function createNodeElement(id) {
    const el = document.createElement('div');
    el.className = 'mindmap-node';
    el.dataset.nodeId = id;
    const title = document.createElement('div');
    title.className = 'mindmap-node-title';
    const meta = document.createElement('div');
    meta.className = 'mindmap-node-meta';
    el.appendChild(title);
    el.appendChild(meta);

    el.addEventListener('pointerdown', (event) => handleNodePointerDown(event, id));
    el.addEventListener('pointermove', (event) => handleNodePointerMove(event, id));
    el.addEventListener('pointerup', (event) => handleNodePointerUp(event, id));
    el.addEventListener('pointercancel', (event) => handleNodePointerCancel(event, id));
    el.addEventListener('click', (event) => handleNodeClick(event, id));

    return el;
  }

  function applyNodeVisuals(id, node, childCount = 0) {
    const el = state.nodeElements.get(id);
    if (!el) return;
    const titleEl = el.querySelector('.mindmap-node-title');
    const metaEl = el.querySelector('.mindmap-node-meta');
    if (titleEl) {
      titleEl.textContent = node.title || 'Bez názvu';
    }
    if (metaEl) {
      if (childCount > 0) {
        metaEl.textContent = `${childCount} podtém${childCount === 1 ? 'o' : childCount < 5 ? 'ata' : 'at'}`;
      } else if (node.parentId) {
        metaEl.textContent = 'Podtéma';
      } else {
        metaEl.textContent = 'Kořenové téma';
      }
    }
    el.style.transform = `translate(${node.x}px, ${node.y}px)`;
    el.style.setProperty('--mindmap-node-color', node.color || DEFAULT_COLOR);
    el.classList.toggle('is-selected', state.selectedId === id);
  }

  function updateLinks() {
    if (!linksSvg) return;
    const fragment = document.createDocumentFragment();
    state.nodes.forEach((node) => {
      if (!node.parentId) return;
      const parent = state.nodes.get(node.parentId);
      if (!parent) return;
      const parentSize = getNodeSizeEstimate(parent.id);
      const childSize = getNodeSizeEstimate(node.id);
      const startX = parent.x + parentSize.width / 2;
      const startY = parent.y + parentSize.height;
      const endX = node.x + childSize.width / 2;
      const endY = node.y;
      const controlOffset = Math.max(Math.abs(endY - startY) * 0.4, 80);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${startX.toFixed(1)} ${(startY + controlOffset).toFixed(1)} ${endX.toFixed(1)} ${(endY - controlOffset).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'rgba(148,163,184,0.45)');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      fragment.appendChild(path);
    });
    linksSvg.replaceChildren(fragment);
  }

  function getNodeSizeEstimate(nodeId) {
    const el = state.nodeElements.get(nodeId);
    if (!el) return NODE_ESTIMATE;
    const width = el.offsetWidth / state.scale;
    const height = el.offsetHeight / state.scale;
    if (!width || !height) return NODE_ESTIMATE;
    return { width, height };
  }

  function selectNode(nodeId, options = {}) {
    if (nodeId === state.selectedId) {
      if (options.focus && nodeId && state.nodes.has(nodeId)) {
        centerOnNode(state.nodes.get(nodeId));
      }
      return;
    }
    flushPendingUpdate();
    state.selectedId = nodeId;
    state.nodeElements.forEach((el, id) => {
      el.classList.toggle('is-selected', id === nodeId);
    });
    updateSelectionControls();
    updateDetailPanel();
    if (options.focus && nodeId && state.nodes.has(nodeId)) {
      centerOnNode(state.nodes.get(nodeId));
    }
  }

  function updateDetailPanel() {
    if (!detailHeadingEl || !titleInput || !contentInput) return;
    const node = state.selectedId ? state.nodes.get(state.selectedId) : null;
    state.suppressInputs = true;
    if (!node) {
      detailHeadingEl.textContent = 'Vyber téma';
      titleInput.value = '';
      contentInput.value = '';
      if (metaEl) metaEl.textContent = '';
      updateColorSelection(null);
    } else {
      detailHeadingEl.textContent = node.title ? node.title : 'Bez názvu';
      titleInput.value = node.title || '';
      contentInput.value = node.content || '';
      if (metaEl) {
        const created = formatTimestamp(node.createdAt);
        const updated = formatTimestamp(node.updatedAt);
        metaEl.textContent = `${created ? `Vytvořeno: ${created}` : ''}${created && updated ? '\n' : ''}${updated ? `Upraveno: ${updated}` : ''}`;
      }
      updateColorSelection(node.color || DEFAULT_COLOR);
    }
    state.suppressInputs = false;
    updateSelectionControls();
  }

  function updateColorSelection(color) {
    if (!colorGridEl) return;
    Array.from(colorGridEl.children).forEach((btn) => {
      const swatch = btn;
      const match = swatch.dataset.color === color;
      swatch.setAttribute('aria-checked', match ? 'true' : 'false');
    });
  }

  function formatTimestamp(value) {
    if (!value) return '';
    try {
      if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return `${date.toLocaleDateString('cs-CZ')} ${date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (typeof value === 'number') {
        const date = new Date(value);
        return `${date.toLocaleDateString('cs-CZ')} ${date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (_) {}
    return '';
  }

  function adjustZoom(delta) {
    const stageRect = stageEl ? stageEl.getBoundingClientRect() : null;
    const focus = stageRect ? stageToCanvas(stageRect.width / 2, stageRect.height / 2) : null;
    setScale(state.scale + delta, { focus });
  }

  function setScale(nextScale, options = {}) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
    if (Math.abs(clamped - state.scale) < 0.0001) return;
    const focus = options.focus;
    if (focus) {
      state.panX = state.panX + focus.x * state.scale - focus.x * clamped;
      state.panY = state.panY + focus.y * state.scale - focus.y * clamped;
    }
    state.scale = clamped;
    setCanvasTransform();
    updateZoomLabel();
    requestAnimationFrame(updateLinks);
  }

  function updateZoomLabel() {
    if (!zoomLabelEl) return;
    zoomLabelEl.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function setCanvasTransform() {
    if (canvasEl) {
      canvasEl.style.setProperty('--mindmap-pan-x', `${state.panX}px`);
      canvasEl.style.setProperty('--mindmap-pan-y', `${state.panY}px`);
    }
    if (zoomLayerEl) {
      zoomLayerEl.style.setProperty('--mindmap-zoom', `${state.scale}`);
    }
  }

  function centerOnOrigin() {
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    state.panX = rect.width / 2 - CANVAS_CENTER * state.scale;
    state.panY = rect.height / 2 - CANVAS_CENTER * state.scale;
    setCanvasTransform();
    requestAnimationFrame(updateLinks);
  }

  function centerOnNode(node) {
    if (!stageEl || !node) return;
    const rect = stageEl.getBoundingClientRect();
    const size = getNodeSizeEstimate(node.id);
    state.panX = rect.width / 2 - (node.x + size.width / 2) * state.scale;
    state.panY = rect.height / 2 - (node.y + size.height / 2) * state.scale;
    setCanvasTransform();
    requestAnimationFrame(updateLinks);
  }

  function getViewportCenter() {
    if (!stageEl) {
      return { x: CANVAS_CENTER, y: CANVAS_CENTER };
    }
    const rect = stageEl.getBoundingClientRect();
    return stageToCanvas(rect.width / 2, rect.height / 2);
  }

  function stageToCanvas(stageX, stageY) {
    return {
      x: (stageX - state.panX) / state.scale,
      y: (stageY - state.panY) / state.scale
    };
  }

  function clientToCanvas(clientX, clientY) {
    if (!stageEl) return { x: CANVAS_CENTER, y: CANVAS_CENTER };
    const rect = stageEl.getBoundingClientRect();
    return stageToCanvas(clientX - rect.left, clientY - rect.top);
  }

  function clampCoord(value) {
    return Math.max(40, Math.min(CANVAS_SIZE - 80, value));
  }

  function removeAllNodeElements() {
    state.nodeElements.forEach((el) => el.remove());
    state.nodeElements.clear();
    updateLinks();
  }

  function show() {
    ensureDom();
    ensureAuthObserver();
    if (!rootEl) return;
    rootEl.hidden = false;
    rootEl.setAttribute('aria-hidden', 'false');
    state.active = true;
    if (!state.user && window.firebase?.auth?.currentUser) {
      state.user = window.firebase.auth.currentUser;
    }
    updateAvailabilityState();
    ensureNodeSubscription();
    if (!state.viewportInitialized) {
      state.viewportInitialized = true;
      requestAnimationFrame(centerOnOrigin);
    } else {
      setCanvasTransform();
      requestAnimationFrame(updateLinks);
    }
  }

  function hide() {
    if (!rootEl) return;
    flushPendingUpdate();
    state.active = false;
    rootEl.hidden = true;
    rootEl.setAttribute('aria-hidden', 'true');
    stopNodeSubscription();
  }

  function init() {
    ensureDom();
    ensureAuthObserver();
    if (document.body.classList.contains('view-mindmap')) {
      show();
    } else {
      updateAvailabilityState();
    }
  }

  return {
    init,
    show,
    hide
  };
})();

window.P73Mindmap = MindmapApp;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.P73Mindmap?.init === 'function') {
    window.P73Mindmap.init();
  }
});
