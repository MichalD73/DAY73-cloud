===============================================================================
ARCHIV: Super Modul v1
===============================================================================
Datum archivace: 2025-10-05
Důvod archivace: Prázdná šablona bez funkcionality, nikdy nebyla využita

===============================================================================
CO JE V TOMTO ARCHIVU
===============================================================================

Tento archiv obsahuje kompletní kód modulu "Super Modul" - prázdné šablony
připravené na budoucí agregaci modulů.

Soubory:
  • super-modul.html (7 řádků)  - HTML markup prázdné scény
  • super-modul.css  (10 řádků) - CSS styly a view switching
  • README.txt                  - Tento dokument

===============================================================================
PROČ BYL ARCHIVOVÁN
===============================================================================

1. Nikdy nebyl aktivně používán
2. Obsahuje pouze prázdnou šablonu s placeholder textem
3. Žádná implementovaná funkcionalita
4. Účel modulu nejasný - jen "připraveno na budoucí agregaci"
5. Čistka nepoužívaných view v hlavní aplikaci

===============================================================================
PŮVODNÍ UMÍSTĚNÍ V KÓDU
===============================================================================

HTML (grid-app-test.html):
  Řádky 789-795: Kompletní Super Modul view

CSS (grid-app.css):
  Řádek 624: .super-modul-view { display:none; margin-left:300px; padding:12px 24px; }
  Řádek 625: body.view-super-modul .super-modul-view { display:block; }
  Řádky 626-628: View switching rules
  Řádky 630-633: Header a stage styling
  Řádky 580, 597, 609: Hide rules pro jiné views

Navigace (grid-app-test.html):
  Řádek 126: <a href="?view=super-modul">Super Modul</a>
  Řádek 158: Overflow menu item

===============================================================================
OBSAH MODULU
===============================================================================

Super Modul byl prázdná scéna s:
- Header s emoji 🧩 a názvem "Super Modul"
- Popisek: "Tato scéna je připravená na budoucí agregaci modulů..."
- Prázdný stage s placeholder textem
- Gradient background (f8fafc -> eef2ff)
- Dashed border pro stage area

Žádná JavaScript funkcionalita.
Žádná Firebase integrace.
Žádné uživatelské interakce.

===============================================================================
JAK OBNOVIT (POKUD POTŘEBUJEŠ)
===============================================================================

1. Zkopíruj super-modul.html do grid-app-test.html (mezi jiné views)
2. Zkopíruj super-modul.css do grid-app.css (před goal-canvas sekci)
3. Přidej navigační odkaz do topbaru:
   <a href="?view=super-modul" data-toplink="super-modul" class="p73-topbar-link">Super Modul</a>
4. Přidej do overflow menu pole:
   { view:'super-modul', label:'Super Modul' }
5. Commit a deploy

===============================================================================
KDY SMAZAT TENTO ARCHIV
===============================================================================

Tento archiv můžeš bezpečně smazat když:
✓ Super Modul nebude 6+ měsíců potřeba
✓ Vytvoříš nový agregační systém s jiným názvem/účelem
✓ Žádná dokumentace nebo plány neodkazují na Super Modul

===============================================================================
GIT HISTORIE
===============================================================================

Pro zobrazení kompletní historie tohoto modulu:
  git log --all --full-history -- "*super-modul*"
  git log -p --grep="super.modul" --grep="Super.Modul" -i

===============================================================================
