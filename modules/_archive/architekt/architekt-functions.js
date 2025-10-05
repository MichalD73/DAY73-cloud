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
