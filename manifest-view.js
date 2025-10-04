const ManifestModule = (() => {
  let manifestData = null;
  let manifestViewEl = null;
  let manifestTableEl = null;
  let manifestStatusEl = null;
  let isLoading = false;
  let hasError = false;

  function ensureElements() {
    manifestViewEl = manifestViewEl || document.getElementById('manifest-view');
    manifestTableEl = manifestTableEl || document.getElementById('manifest-view-table');
    manifestStatusEl = manifestStatusEl || document.getElementById('manifest-view-status');
  }

  function setStatus(message, tone = 'info') {
    if (!manifestStatusEl) return;
    manifestStatusEl.textContent = message || '';
    manifestStatusEl.dataset.tone = tone;
  }

  function renderTable() {
    if (!manifestTableEl) return;
    manifestTableEl.innerHTML = '';

    if (!Array.isArray(manifestData) || manifestData.length === 0) {
      setStatus('Manifest je prázdný.', 'warning');
      return;
    }

    const table = document.createElement('table');
    table.className = 'manifest-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Soubor / Modul</th>
        <th>Cesta</th>
        <th>Popis</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    manifestData.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="manifest-col-title">${escapeHtml(item.label || '-') }</td>
        <td class="manifest-col-path">
          <code>${escapeHtml(item.path || '-')}</code>
        </td>
        <td class="manifest-col-description">${escapeHtml(item.description || '')}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    manifestTableEl.appendChild(table);
    setStatus(`Zobrazeno ${manifestData.length} položek.`, 'info');
  }

  function escapeHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadManifest(force = false) {
    if (!force && (manifestData || hasError)) return manifestData;
    if (isLoading) return manifestData;
    isLoading = true;
    setStatus('Načítám manifest…', 'info');

    try {
      const response = await fetch('/DAY73/app-manifest.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Manifest se nepodařilo načíst (HTTP ${response.status}).`);
      }
      const json = await response.json();
      if (!Array.isArray(json)) {
        throw new Error('Manifest má neočekávaný formát.');
      }
      manifestData = json;
      hasError = false;
    } catch (error) {
      console.error('[Manifest] load failed', error);
      hasError = true;
      manifestData = null;
      setStatus(error.message || 'Manifest se nepodařilo načíst.', 'error');
    } finally {
      isLoading = false;
    }
    return manifestData;
  }

  async function show() {
    ensureElements();
    if (!manifestViewEl) return;
    manifestViewEl.hidden = false;
    if (!manifestTableEl || !manifestStatusEl) return;

    await loadManifest();
    if (manifestData) {
      renderTable();
    }
  }

  function hide() {
    ensureElements();
    if (manifestViewEl) {
      manifestViewEl.hidden = true;
    }
  }

  async function refresh() {
    await loadManifest(true);
    if (manifestData) {
      renderTable();
    }
  }

  return {
    show,
    hide,
    refresh
  };
})();

window.P73Manifest = ManifestModule;

const refreshButton = document.getElementById('manifest-refresh');
if (refreshButton) {
  refreshButton.addEventListener('click', () => {
    if (window.P73Manifest) {
      window.P73Manifest.refresh();
    }
  });
}
