# 📦 Architekt Module - ARCHIVOVÁNO

**Datum archivace:** 2025-10-05
**Důvod:** Modul se nepoužívá, odstraněn z navigace

## 📋 Co bylo archivováno:

### 1. Kód v grid-app.js
- **Počet výskytů:** 130 řádků kódu
- **Funkce:**
  - `isArchitektWorkspace()`
  - `updateArchitektCopyToolbarButton()`
  - `setupArchitektCopyFeature()`
  - Funkce pro kopírování obrázků mezi workspace

- **Proměnné:**
  - `ARCHITEKT_WORKSPACE_ID`
  - `architektCopyInitialized`
  - `architektCopyPanelOpen`
  - `architektCopyBusy`
  - `architektCopyItems`
  - `architektCopySelection`

### 2. HTML elementy v grid-app-test.html
- Navigační odkaz: `<a href="?view=architekt">`
- Toolbar button: `#architekt-copy-open`
- Copy panel: `#architekt-copy-panel`
- Grid: `#architekt-copy-grid`

### 3. Firebase kolekce
- **Název:** `project73-architekt`
- **Konfigurace:** `{ collection: 'project73-architekt', name: "Architekt", supportsSetups: true }`

## 🎯 Co modul dělal:

Architekt workspace s funkcí "Kopírovat obrázky" - umožňoval:
- Zobrazit grid obrázků z workspace
- Vybrat více obrázků (checkbox selection)
- Kopírovat vybrané obrázky do schránky
- "Select All" funkce

## 📂 Soubory v archivu:

```
modules/_archive/architekt/
├── README.md                        ← Tento soubor
├── architekt-code-references.txt   ← Všechny řádky s "architekt" z grid-app.js
└── [budoucí soubory pokud potřeba]
```

## 🔄 Jak obnovit (pokud by bylo potřeba):

### Krok 1: Obnovit navigaci
V `grid-app-test.html` přidat:
```html
<a href="?view=architekt" data-toplink="architekt" class="p73-topbar-link">Architekt</a>
```

### Krok 2: Obnovit workspace config
V `grid-app.js` sekci `workspaceConfigs` přidat:
```javascript
architekt: { collection: 'project73-architekt', name: "Architekt", supportsSetups: true }
```

### Krok 3: Obnovit funkce
- Zkopírovat funkce z `architekt-code-references.txt`
- Přidat zpět do grid-app.js

### Krok 4: Obnovit HTML panel
- Najít `#architekt-copy-panel` v git historii
- Přidat zpět do grid-app-test.html

## ⚠️ Poznámky:

- Firebase kolekce `project73-architekt` **ZŮSTÁVÁ** - data nejsou smazána
- Pokud chceš modul úplně odstranit, smaž i Firebase kolekci ručně
- Modul byl odstraněn 2025-10-05, reference uloženy pro případnou obnovu

## 🔗 Související archivy:

- `modules/_archive/goal-canvas/` - Goal Canvas modul (archivován dříve)
- `modules/_archive/mindmap/` - Mindmap modul (archivován dříve)

---

**Archivoval:** Claude Code AI
**Schválil:** Michaldaniel73
**Účel:** Úklid nepoužívaných modulů
