# Manuál pro Gemini: Projekt "Grid App"

Tento dokument slouží jako centrální zdroj informací pro práci na projektu "Grid App" v rámci `Workspace7`. Obsahuje klíčové poznatky, popis architektury a doporučení pro další vývoj.

## 1. Celkový kontext: Workspace7

`Workspace7` je **monorepo**, což znamená, že obsahuje více samostatných projektů v jednom společném pracovním prostoru. Mezi hlavní projekty patří:

-   **Grid App:** Interaktivní mřížka pro správu obsahu (aktuálně probíhá vývoj).
-   **Business Tools Hub (`src/XLS_tool.html`):** Sada nástrojů pro práci s XLSX soubory.
-   **Firebase Testovací Nástroje:** Aplikace pro diagnostiku a testování Firebase.
-   **Návrhy Designu:** Statické HTML soubory pro vizuální prototypy.

Díky souborům `Dockerfile` a `.devcontainer` je pro celý workspace zajištěno **jednotné vývojové prostředí**, což je velká výhoda.

## 2. Architektura Grid App

Aplikace, na které pracujeme, je **Grid App**. Její architektura je založena na principu "hubu", který spojuje několik částí.

### Klíčové soubory a jejich role:

-   **`grid-app-test.html` (Vstupní bod / Hub)**
    -   **Co to je:** Hlavní soubor, který spouštíte v prohlížeči.
    -   **Jak funguje:** Funguje jako "obal" nebo "rozcestník". Obsahuje navigační menu a `<iframe>`, do kterého načítá ostatní části aplikace.
    -   **Kdy ho měnit:** Pouze při změně hlavní navigace nebo celkové architektury (např. odstranění `<iframe>`).

-   **`grid-app-content.html` (Srdce aplikace)**
    -   **Co to je:** Zde se nachází 95 % veškeré logiky a vzhledu.
    -   **Jak funguje:** Obsahuje HTML, CSS (Tailwind) a JavaScript pro interaktivní mřížku, boční panely, komunikaci s Firebase (ukládání, načítání dat) a všechny uživatelské funkce.
    -   **Kdy ho měnit:** Téměř vždy. Jakákoliv změna funkčnosti, vzhledu nebo přidání nové funkce se děje zde.

-   **`GRID-APP-DEV.md` (Plán a dokumentace)**
    -   **Co to je:** Náš "deníček" a plánovač projektu.
    -   **Jak funguje:** Obsahuje roadmapu, TODO list a design systém.
    -   **Kdy ho měnit:** Po dokončení úkolu, při přidání nového nápadu nebo zapsání technické poznámky.

## 3. Doporučení: Vylepšení struktury projektu

Současné umístění souborů je trochu chaotické. Pro lepší přehlednost a budoucí rozšiřitelnost je **důrazně doporučeno** přesunout soubory `Grid App` do vlastního adresáře.

### Navrhovaná ideální struktura:

```
Workspace7/
├── .devcontainer/      # Konfigurace pro Docker
├── docs/               # Adresář pro veškerou dokumentaci
│   ├── GRID-APP-DEV.md
│   └── manuál_gemini_GRIDapp.md
├── grid-app/           # <-- Nový adresář pro naši Grid aplikaci
│   ├── grid-app-test.html
│   ├── grid-app-content.html
│   ├── firebase-diagnostic.html
│   └── ...
├── xls-tools/          # <-- Adresář pro nástroje z `src/`
│   ├── XLS_tool.html
│   └── ...
└── ...                 # Ostatní konfigurační soubory
```

**Výhody:**
-   **Přehlednost:** Jasně oddělené projekty.
-   **Izolace:** Změny v jednom projektu neovlivní druhý.
-   **Škálovatelnost:** Snadné přidávání nových projektů.

## 4. Další kroky ve vývoji

Na základě dokumentace `GRID-APP-DEV.md` jsou dalšími kroky ve vývoji:

1.  **Fáze 2 - Persistence & Data:**
    -   **Priorita:** Integrace Firebase pro ukládání, načítání a synchronizaci stavu mřížky.
    -   **Cíl:** Zajistit, aby se obsah mřížky (obrázky, texty, barvy) ukládal do databáze a byl dostupný i po obnovení stránky.

2.  **Fáze 3 - Pokročilé funkce:**
    -   Implementace drag & drop pro přesouvání obsahu mezi buňkami.
    -   Možnost editace obrázků.

3.  **Fáze 4 - Vylepšení UI/UX:**
    -   Přidání kontextového menu (po kliknutí pravým tlačítkem).
    -   Klávesové zkratky pro rychlejší práci.

---
*Tento manuál byl vytvořen pro zjednodušení a zrychlení další práce. Kdykoliv se na něj můžeme odkázat.*