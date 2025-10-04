
const MobileNotesModule = (() => {
  const ROOT_ID = 'mobile-view';
  let rootEl = null;

  function ensureRoot() {
    if (!rootEl) {
      rootEl = document.getElementById(ROOT_ID);
    }
    return rootEl;
  }

  function show() {
    const root = ensureRoot();
    if (root) {
      root.hidden = false;
    }
  }

  function hide() {
    const root = ensureRoot();
    if (root) {
      root.hidden = true;
    }
  }

  function destroy() {
    hide();
  }

  return { show, hide, destroy };
})();

window.P73Mobile = MobileNotesModule;

export default MobileNotesModule;
