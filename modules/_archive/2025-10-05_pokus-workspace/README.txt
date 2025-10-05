===============================================================================
ARCHIV: POKUS Workspace
===============================================================================
Datum archivace: 2025-10-05
Důvod archivace: Nepoužívaný testovací workspace

===============================================================================
CO JE V TOMTO ARCHIVU
===============================================================================

POKUS byl workspace pro testování - žádná samostatná funkcionalita.
Jen záznam v workspaceConfigs a navigaci.

===============================================================================
PŮVODNÍ UMÍSTĚNÍ V KÓDU
===============================================================================

grid-app.js:
  Řádek 1113: pokus: ['pokus', 'elektrocz-pokus']  // viewAliases
  Řádek 1663: pokus: { collection: 'project73-elektrocz-pokus', name: "POKUS", supportsSetups: true }

grid-app-test.html:
  Řádek 83: <a href="?view=pokus">POKUS</a>
  Řádek 114: <li><a href="?view=pokus">POKUS 1</a></li>
  Řádek 149: { view:'pokus', label:'POKUS' }

===============================================================================
FIRESTORE STRUKTURA
===============================================================================

Kolekce: project73-elektrocz-pokus
Workspace podporoval setups (supportsSetups: true)
Aliasy: 'pokus', 'elektrocz-pokus'

===============================================================================
JAK OBNOVIT (POKUD POTŘEBUJEŠ)
===============================================================================

1. Přidej do viewAliases (grid-app.js):
   pokus: ['pokus', 'elektrocz-pokus']

2. Přidej do workspaceConfigs (grid-app.js):
   pokus: { collection: 'project73-elektrocz-pokus', name: "POKUS", supportsSetups: true }

3. Přidej do navigace (grid-app-test.html):
   <a href="?view=pokus" data-toplink="pokus" class="p73-topbar-link">POKUS</a>

4. Přidej do overflow menu:
   { view:'pokus', label:'POKUS' }

5. Commit a deploy

===============================================================================
KDY SMAZAT TENTO ARCHIV
===============================================================================

Tento archiv můžeš bezpečně smazat když:
✓ POKUS workspace nebude 6+ měsíců potřeba
✓ Data v Firestore kolekci 'project73-elektrocz-pokus' jsou prázdná nebo přesunutá

===============================================================================
