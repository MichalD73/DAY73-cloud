const WORKSPACE_ID = 'pokus';
const EXPECTED_COLLECTION = 'project73-elektrocz-pokus';
const ACTIVE_CLASS = 'p73-pokus-active';
const BADGE_CLASS = 'p73-nav-badge--pokus';

function getNavLink() {
  return document.querySelector(`[data-toplink="${WORKSPACE_ID}"]`);
}

function ensureBadge(collection) {
  const navLink = getNavLink();
  if (!navLink) return null;
  let badge = navLink.querySelector(`.${BADGE_CLASS}`);
  if (!badge) {
    badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.textContent = 'TEST';
    navLink.appendChild(badge);
  }
  if (!badge.dataset.defaultLabel) {
    badge.dataset.defaultLabel = badge.textContent || 'TEST';
  }
  if (collection) {
    badge.dataset.collection = collection;
    badge.title = `Firestore kolekce: ${collection}`;
  }
  return badge;
}

function toggleBodyState(active) {
  const body = document.body;
  if (!body) return;
  body.classList.toggle(ACTIVE_CLASS, !!active);
  const badge = getNavLink()?.querySelector(`.${BADGE_CLASS}`);
  if (badge) {
    badge.dataset.active = active ? '1' : '0';
  }
}

function effectiveConfig(detail) {
  if (detail?.config) return detail.config;
  const helper = window.P73Workspaces;
  if (helper && typeof helper.getConfig === 'function') {
    return helper.getConfig(WORKSPACE_ID);
  }
  return null;
}

function logWorkspace(detail) {
  if (!detail) return;
  const config = effectiveConfig(detail);
  const collection = config?.collection || '(nezjištěno)';
  const session = detail.sessionId || window.P73Workspaces?.getSessionId?.() || 'N/A';
  const docPath = detail.gridDocPath || window.P73Workspaces?.getGridDocPath?.() || 'N/A';
  console.info(`[POKUS module] Aktivní workspace – kolekce: ${collection}, session: ${session}, doc: ${docPath}`);
  if (config?.collection && config.collection !== EXPECTED_COLLECTION) {
    console.warn(`[POKUS module] Očekávána kolekce ${EXPECTED_COLLECTION}, nalezena ${config.collection}`);
  }
}

function activate(detail) {
  const config = effectiveConfig(detail);
  const collection = config?.collection || EXPECTED_COLLECTION;
  ensureBadge(collection);
  toggleBodyState(true);
  logWorkspace({ ...detail, config, sessionId: detail?.sessionId });
}

function deactivate() {
  toggleBodyState(false);
}

document.addEventListener('p73:workspace-configs-ready', (event) => {
  const configs = Array.isArray(event.detail?.configs) ? event.detail.configs : [];
  const entry = configs.find((item) => item.id === WORKSPACE_ID);
  ensureBadge(entry?.collection || EXPECTED_COLLECTION);
});

document.addEventListener('p73:workspace-ready', (event) => {
  const workspaceId = event.detail?.workspaceId;
  if (workspaceId === WORKSPACE_ID) {
    activate(event.detail || {});
  } else {
    deactivate();
  }
});

document.addEventListener('p73:workspace-switching', (event) => {
  const from = event.detail?.from;
  const to = event.detail?.to;
  if (from === WORKSPACE_ID && to !== WORKSPACE_ID) {
    deactivate();
  }
});

document.addEventListener('p73:workspace-cloned', (event) => {
  if (event.detail?.targetWorkspaceId !== WORKSPACE_ID) return;
  const badge = ensureBadge();
  if (badge) {
    const revertTo = badge.dataset.defaultLabel || 'TEST';
    badge.textContent = 'SYNC';
    setTimeout(() => {
      badge.textContent = revertTo;
    }, 1800);
  }
  console.info('[POKUS module] Data synchronizována:', event.detail?.sourceWorkspaceId, '→', WORKSPACE_ID, `(session ${event.detail?.sourceSessionId || 'n/a'})`);
});

function bootstrap() {
  const helper = window.P73Workspaces;
  const config = helper?.getConfig?.(WORKSPACE_ID);
  ensureBadge(config?.collection || EXPECTED_COLLECTION);
  if (helper?.getCurrentId?.() === WORKSPACE_ID) {
    activate({
      workspaceId: WORKSPACE_ID,
      config,
      sessionId: helper?.getSessionId?.(),
      gridDocPath: helper?.getGridDocPath?.(),
      isInitial: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
