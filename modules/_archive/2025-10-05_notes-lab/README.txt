===============================================================================
ARCHIV: Notes Lab
===============================================================================
Datum archivace: 2025-10-05
Důvod archivace: Duplicitní modul - máme moderní Notes View

===============================================================================
CO JE V TOMTO ARCHIVU
===============================================================================

Notes Lab byla starší verze poznámkového modulu.
Obsahuje:
  • notes-lab.html (70 řádků)
  • notes-lab.js (1371 řádků)
  • notes-lab.css (546 řádků)

Celkem: 1987 řádků kódu

===============================================================================
PROČ BYL ARCHIVOVÁN
===============================================================================

1. Duplicitní funkcionalita - máme moderní Notes View modul (notes-view.js)
2. Notes View má lepší UX a více features
3. Notes Lab nebyl aktivně používán
4. Zmatečné mít dva poznámkové moduly

===============================================================================
PŮVODNÍ UMÍSTĚNÍ V KÓDU
===============================================================================

Soubory:
  - DAY73-cloud/notes-lab.html
  - DAY73-cloud/notes-lab.js
  - DAY73-cloud/notes-lab.css

Navigace (grid-app-test.html):
  Řádek 82: <a href="/DAY73/notes-lab.html">Notes Lab</a>
  Řádek 148: { view:'notes-lab', label:'Notes Lab', href:'/DAY73/notes-lab.html' }

===============================================================================
FUNKCE NOTES LAB
===============================================================================

- Quill editor pro rich text
- Firebase Firestore integrace
- Firestore kolekce: project73-notes-lab (pravděpodobně)
- Základní CRUD operace pro poznámky
- Jednodušší než Notes View

===============================================================================
JAK OBNOVIT (POKUD POTŘEBUJEŠ)
===============================================================================

1. Zkopíruj soubory zpět:
   cp modules/_archive/2025-10-05_notes-lab/*.{html,js,css} .

2. Přidej do navigace (grid-app-test.html):
   <a href="/DAY73/notes-lab.html" target="_blank">Notes Lab</a>

3. Commit a deploy

===============================================================================
KDY SMAZAT TENTO ARCHIV
===============================================================================

Tento archiv můžeš bezpečně smazat když:
✓ Notes View funguje perfektně 6+ měsíců
✓ Nikdo si nestěžuje na chybějící Notes Lab
✓ Data v Firestore jsou migrovaná do Notes View

===============================================================================
POZNÁMKY
===============================================================================

- Notes View (notes-view.js) je AKTIVNÍ modul - NESMAZAT!
- Tento archiv je jen Notes Lab (starší verze)
- Pokud hledáš moderní poznámky, použij Notes View

===============================================================================
