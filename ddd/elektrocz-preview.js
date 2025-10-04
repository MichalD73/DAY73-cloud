// Standalone elektrocz preview module
// Loads ~6 images from the elektrocz storage folder and renders them into the page.
// Usage: include in an HTML file with: <script type="module" src="./elektrocz-preview.js"></script>

import { storage, ref, listAll, getDownloadURL, getMetadata } from './firebase.js';
import { FIREBASE_STORAGE_FOLDERS } from './src/utils/firebase/storage-paths.js';

// Central bucket (for optional logging/autodetect only)
const BUCKET_PREFIX = 'gs://central-asset-storage.appspot.com';
// Primary elektrocz folder now comes from centralized config (RELATIVE path)
const FOLDER_REL = FIREBASE_STORAGE_FOLDERS.elektroczActive;

function normalizeRelativePath(p){
  let path = p || '';
  if (path.startsWith('gs://')) {
    // Strip bucket part if full gs:// accidentally passed
    path = path.replace(/^gs:\/\/[^/]+\//,'');
  }
  if (path.startsWith('/')) path = path.slice(1);
  return path;
}

async function listFolderItems(relativePath) {
  const rel = normalizeRelativePath(relativePath);
  const rootRef = ref(storage, rel);
  return listAll(rootRef);
}

async function loadFirstImages(limit = 6) {
  let listing;
  // 1. Try primary configured folder
  try {
    listing = await listFolderItems(FOLDER_REL);
  } catch (e) {
    console.warn('[elektrocz-preview] Primary folder failed, will attempt auto-detect:', e?.message||e);
  }

  // 2. Fallback autodetect if empty or failed
  if (!listing || (listing.items.length === 0 && listing.prefixes.length === 0)) {
    try {
      const parentRel = 'project73-images';
      const parentListing = await listFolderItems(parentRel);
      const elektroczPrefixes = parentListing.prefixes.filter(p => p.name.startsWith('elektrocz_'));
      elektroczPrefixes.sort((a,b) => b.name.localeCompare(a.name));
      if (elektroczPrefixes.length) {
        const detectedRel = `${parentRel}/${elektroczPrefixes[0].name}`;
        console.info('[elektrocz-preview] Auto-detected elektrocz folder:', detectedRel);
        listing = await listFolderItems(detectedRel);
        const infoEl = document.querySelector('#elektrocz-preview > div:nth-child(2)');
        if (infoEl) infoEl.textContent = detectedRel + ' (auto)';
      } else {
        console.warn('[elektrocz-preview] No elektrocz_* folder detected under', parentRel);
      }
    } catch (e) {
      console.warn('[elektrocz-preview] Auto-detect failed:', e?.message||e);
    }
  }

  if (!listing) return [];

  // 3. If only nested prefixes, traverse until files found
  if (listing.items.length === 0 && listing.prefixes.length > 0) {
    console.info('[elektrocz-preview] No direct items; exploring subfolders breadth-first');
    const queue = [...listing.prefixes];
    while (queue.length) {
      const next = queue.shift();
      try {
        const subListing = await listAll(next);
        if (subListing.items.length) { listing = subListing; break; }
        queue.push(...subListing.prefixes);
      } catch (e) {
        console.warn('[elektrocz-preview] Subfolder list failed', next?.fullPath, e?.message||e);
      }
    }
  }

  if (listing.items.length === 0) {
    console.warn('[elektrocz-preview] Still no items after traversal');
    return [];
  }

  const slice = listing.items.slice(0, limit);
  const results = [];
  for (const itemRef of slice) {
    const [url, meta] = await Promise.all([
      getDownloadURL(itemRef),
      getMetadata(itemRef).catch(() => ({}))
    ]);
    results.push({
      id: itemRef.name,
      name: itemRef.name,
      url,
      contentType: meta.contentType,
      size: meta.size,
      updated: meta.updated
    });
  }
  return results;
}

function ensureContainer() {
  let c = document.getElementById('elektrocz-preview');
  if (!c) {
    c = document.createElement('div');
    c.id = 'elektrocz-preview';
    c.style.cssText = 'padding:16px;font:14px/1.4 system-ui,ui-sans-serif,sans-serif;';
    const title = document.createElement('h2');
    title.textContent = 'elektrocz.com – Storage preview';
    title.style.cssText = 'margin:0 0 12px;font:600 18px/1.2 system-ui,ui-sans-serif;';
    c.appendChild(title);
    const info = document.createElement('div');
    info.textContent = FOLDER_REL; // show relative configured path
    info.style.cssText = 'font:12px/1.2 ui-monospace,monospace;color:#64748b;margin-bottom:12px;word-break:break-all;';
    c.appendChild(info);
    const grid = document.createElement('div');
    grid.id = 'elektrocz-preview-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;';
    c.appendChild(grid);
    document.body.appendChild(c);
  }
  return c.querySelector('#elektrocz-preview-grid');
}

function renderImages(items) {
  const grid = ensureContainer();
  grid.innerHTML = '';
  items.forEach(it => {
    const cell = document.createElement('div');
    cell.style.cssText = 'border:1px solid #1e293b;border-radius:8px;padding:6px;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;gap:6px;';
    const thumb = document.createElement('div');
    thumb.style.cssText = 'width:100%;aspect-ratio:1/1;background:#1e293b center/cover no-repeat;border-radius:4px;';
    thumb.style.backgroundImage = `url("${it.url}")`;
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;line-height:1.3;word-break:break-all;';
    meta.textContent = it.name;
    cell.appendChild(thumb);
    cell.appendChild(meta);
    grid.appendChild(cell);
  });
}

function readLimitFromUrl(def = 6) {
  try {
    const u = new URL(location.href);
    const v = parseInt(u.searchParams.get('limit'), 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 60) : def; // cap at 60
  } catch { return def; }
}

async function bootstrap() {
  try {
    if (window.firebase?.auth && !window.firebase.auth.currentUser) {
      await new Promise(res => setTimeout(res, 500));
    }
    const limit = readLimitFromUrl();
    console.log('[elektrocz-preview] Using limit', limit, 'folder', FOLDER_REL);
    const t0 = performance.now();
    const items = await loadFirstImages(limit);
    const t1 = performance.now();
    renderImages(items);
    if (!items.length) {
      const grid = document.getElementById('elektrocz-preview-grid');
      if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1;padding:24px;font:13px/1.4 ui-monospace;color:#f87171;background:#1e293b;border:1px solid #334155;border-radius:8px;">⚠️ Nenalezeny žádné soubory (zkontroluj podsložky nebo název).<br/>Zkus přidat soubor nebo použij ?limit= a refresh.</div>';
      }
    }
    console.log('[elektrocz-preview] Loaded', items.length, 'items in', (t1 - t0).toFixed(1), 'ms');
  } catch (e) {
    console.error('[elektrocz-preview] Error loading preview', e);
    const grid = ensureContainer();
    grid.innerHTML = `<div style="color:#ef4444;font:12px/1.4 ui-monospace;">Error: ${e?.message||e}</div>`;
  }
}

bootstrap();
