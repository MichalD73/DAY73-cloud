// Centralized Firebase Storage path definitions (all relative to bucket root)
// Do NOT include gs:// or domain here; always use ref(storage, RELATIVE_PATH)

export const FIREBASE_STORAGE_FOLDERS = {
  // Aktuálně používaná složka s obrázky pro elektrocz modul
  elektroczActive: 'project73-images/elektrocz_1758366482528_l6hvyU57',
  // Původní (legacy) složka použitá dříve v grid routeru – zachována pro případný audit nebo přechod
  elektroczGridLegacy: 'project73-images/elektrocz_1758366701541',
  // Rezervované místo pro budoucí moduly:
  // modulGalerie: 'project73-images/galerie_produktu_novinky',
  // modulKatalog: 'project73-images/katalog_ikony',
};

// Helper (optional) – získání všech známých elektrocz verzí (active první)
export function getElektroczFolderCandidates() {
  return [FIREBASE_STORAGE_FOLDERS.elektroczActive, FIREBASE_STORAGE_FOLDERS.elektroczGridLegacy].filter(Boolean);
}
