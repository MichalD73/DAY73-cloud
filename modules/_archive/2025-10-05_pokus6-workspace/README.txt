===============================================================================
ARCHIV: POKUS 6 Workspace
===============================================================================
Datum archivace: 2025-10-05
Důvod archivace: Nepoužívaný testovací workspace

===============================================================================
CO JE V TOMTO ARCHIVU
===============================================================================

POKUS 6 byl workspace pro testování - žádná samostatná funkcionalita.
Jen záznam v workspaceConfigs a navigaci.

===============================================================================
PŮVODNÍ UMÍSTĚNÍ V KÓDU
===============================================================================

grid-app.js:
  Řádek 1118: pokus6: ['pokus6']  // viewAliases
  Řádek 1668: pokus6: { collection: 'project73-pokus6', name: "POKUS 6", supportsSetups: true }

grid-app-test.html:
  Řádek 121: <a href="?view=pokus6">POKUS 6</a>
  Řádek 153: { view:'pokus6', label:'POKUS 6' }

===============================================================================
FIRESTORE STRUKTURA
===============================================================================

Kolekce: project73-pokus6
Workspace podporoval setups (supportsSetups: true)

===============================================================================
JAK OBNOVIT (POKUD POTŘEBUJEŠ)
===============================================================================

1. Přidej do viewAliases (grid-app.js):
   pokus6: ['pokus6']

2. Přidej do workspaceConfigs (grid-app.js):
   pokus6: { collection: 'project73-pokus6', name: "POKUS 6", supportsSetups: true }

3. Přidej do navigace (grid-app-test.html):
   <a href="?view=pokus6" data-toplink="pokus6" class="p73-topbar-link">POKUS 6</a>

4. Přidaj do overflow menu:
   { view:'pokus6', label:'POKUS 6' }

5. Commit a deploy

===============================================================================
KDY SMAZAT TENTO ARCHIV
===============================================================================

Tento archiv můžeš bezpečně smazat když:
✓ POKUS 6 workspace nebude 6+ měsíců potřeba
✓ Data v Firestore kolekci 'project73-pokus6' jsou prázdná nebo přesunutá

===============================================================================
