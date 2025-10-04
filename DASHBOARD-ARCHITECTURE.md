# Dashboard Architecture - DAY73-Cloud

> **Dokumentace struktury Dashboard a refaktoringu na sdílený kód**

## 🏗️ Aktuální Architektura

Dashboard má **DVĚ verze** které sdílejí **JEDEN kód**:

### Standalone Dashboard
- **URL**: https://onlineday73.web.app/DAY73-cloud/dashboard.html
- **Účel**: Čistý dashboard bez top menu, ideální pro sdílení
- **Soubor**: `dashboard.html` (628 řádků)
- **Obsahuje**: HTML wrapper + načtení `dashboard-view.js`

### Integrated Dashboard
- **URL**: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html?view=dashboard
- **Účel**: Dashboard jako součást hlavní aplikace s menu
- **Soubor**: `grid-app-test.html` + `dashboard-view.js`
- **Obsahuje**: Top menu + přepínání mezi views

---

## 📦 Struktura Souborů

```
DAY73-cloud/
├── dashboard.html (628 řádků)
│   └── HTML wrapper pro standalone verzi
│
├── dashboard-view.js (513 řádků) ← JEDINÝ ZDROJ PRAVDY
│   └── Všechna logika pro obě verze
│
├── dashboard-view.css
│   └── Sdílené styly
│
└── grid-app-test.html
    └── Main app s integrovaným dashboardem
```

---

## 🔄 Refaktoring: Před a Po

### ❌ PŘED Refaktoringem

```
dashboard.html: 1233 řádků
  ├── HTML struktura
  ├── AI Projects logika (duplikát)
  ├── Kanban logika (duplikát)
  └── Firebase integrace (duplikát)

dashboard-view.js: 512 řádků
  ├── AI Projects logika (duplikát)
  ├── Kanban logika (duplikát)
  └── Firebase integrace (duplikát)

────────────────────────────────────────
Celkem: 1745 řádků
Problém: Logika na DVOU místech!
```

**Problémy:**
- ❌ Každá změna = editace DVOU souborů
- ❌ Riziko rozsynchronizace verzí
- ❌ 604 řádků duplikovaného kódu
- ❌ Složitější údržba

### ✅ PO Refaktoringu

```
dashboard.html: 628 řádků
  ├── HTML struktura
  ├── Firebase SDK načtení
  ├── <script src="dashboard-view.js">
  └── DashboardView.init()

dashboard-view.js: 513 řádků ← SINGLE SOURCE OF TRUTH
  ├── AI Projects logika
  ├── Kanban logika
  ├── Firebase integrace
  └── Všechny funkce

────────────────────────────────────────
Celkem: 1141 řádků (-604 řádků!)
Řešení: Logika na JEDNOM místě!
```

**Výhody:**
- ✅ Změna = edituj jen `dashboard-view.js`
- ✅ Žádné riziko rozsynchronizace
- ✅ -604 řádků kódu
- ✅ Jednodušší údržba a debug

---

## 🔧 Jak to Funguje

### 1. Standalone Dashboard (dashboard.html)

```html
<!-- Firebase SDK -->
<script src="/DAY73-cloud/shared/firebase.js"></script>

<!-- Sdílená logika -->
<script src="dashboard-view.js"></script>

<!-- Inicializace -->
<script>
function initStandalone() {
  if (!window.DashboardView) {
    setTimeout(initStandalone, 50);
    return;
  }
  window.DashboardView.init();
}
initStandalone();
</script>
```

### 2. Integrated Dashboard (grid-app-test.html)

```javascript
// Firebase už načtený v main HTML
// Načtení modulu
<script src="dashboard-view.js"></script>

// View switch
if (view === 'dashboard') {
  DashboardView.init();
}
```

### 3. Sdílená Logika (dashboard-view.js)

```javascript
(function() {
  'use strict';

  // AI Projects data (JEDINÁ kopie)
  const aiProjects = [
    { title: "DAY73-Cloud Setup", status: "completed", ... },
    { title: "Manuál stránka", status: "completed", ... },
    // ...
  ];

  window.DashboardView = {
    init: async function() {
      await this.waitForFirebase();
      this.renderAIProjects();
      await this.loadKanbanCards();
    },

    renderAIProjects: function() { ... },
    loadKanbanCards: async function() { ... },
    // ... všechny další funkce
  };

  // Global exports pro onclick handlers
  window.showAddCardForm = (status) => window.DashboardView.showAddCardForm(status);
  window.addCard = (status) => window.DashboardView.addCard(status);
  window.cancelCardForm = () => window.DashboardView.cancelCardForm();
  window.closeCardDetail = () => window.DashboardView.closeCardDetail();
  window.toggleArchive = () => window.DashboardView.toggleArchive();
})();
```

---

## 🎯 Kdy Použít Jakou Verzi?

### Standalone (`/dashboard.html`)
**Použij když:**
- ✅ Chceš čistý dashboard bez menu
- ✅ Sdílíš dashboard s někým kdo nepotřebuje celou app
- ✅ Potřebuješ rychlé otevření jen dashboardu

### Integrated (`?view=dashboard`)
**Použij když:**
- ✅ Pracuješ v aplikaci a chceš mít menu
- ✅ Potřebuješ přepínat mezi views (Grid, Dashboard, atd.)
- ✅ Denní práce v aplikaci

---

## 📝 Jak Přidat Novou Funkcionalitu

### ✅ SPRÁVNĚ (po refaktoringu):

1. Otevři `dashboard-view.js`
2. Přidej novou metodu do `window.DashboardView`
3. Pokud potřeba, exportuj globálně pro onclick handlers
4. **Hotovo!** Funguje v OBOU verzích automaticky

```javascript
// dashboard-view.js
window.DashboardView = {
  // ... existující metody

  novaFunkce: function() {
    // Nová logika
  }
};

// Export pro HTML onclick
window.novaFunkce = () => window.DashboardView.novaFunkce();
```

### ❌ ŠPATNĚ (před refaktoringem):

1. ~~Otevři `dashboard.html`~~
2. ~~Přidej logiku~~
3. ~~Otevři `dashboard-view.js`~~
4. ~~Přidej STEJNOU logiku znovu~~
5. ~~Doufej že jsi nic nepominul~~

---

## 🐛 Troubleshooting

### Problém: Změna se projeví jen v jedné verzi

**Příčina:** Pravděpodobně jsi editoval `dashboard.html` místo `dashboard-view.js`

**Řešení:**
1. Zkontroluj že editační kód je v `dashboard-view.js`
2. `dashboard.html` by měl obsahovat jen HTML strukturu
3. Hard refresh (Cmd+Shift+R)

### Problém: Funkce nefunguje po kliknutí

**Příčina:** Chybí global export pro onclick handler

**Řešení:**
Přidej do `dashboard-view.js` na konec:
```javascript
window.tvojeNazevFunkce = () => window.DashboardView.tvojeNazevFunkce();
```

---

## 📊 Metriky Refaktoringu

| Metrika | Před | Po | Rozdíl |
|---------|------|-----|--------|
| Celkový počet řádků | 1745 | 1141 | **-604 (-35%)** |
| Míst s logikou | 2 | 1 | **-50%** |
| Riziko chyby při update | Vysoké | Nízké | **↓** |
| Čas na implementaci změny | 2x | 1x | **-50%** |

---

## 🔗 Související Dokumentace

- [FIREBASE-SETUP.md](FIREBASE-SETUP.md) - Firebase napojení a troubleshooting
- [DOMAINS-DEPLOY.md](DOMAINS-DEPLOY.md) - Hosting, deploy workflow
- [grid-app-test.html](grid-app-test.html) - Main aplikace
- [dashboard.html](dashboard.html) - Standalone verze
- [dashboard-view.js](dashboard-view.js) - Sdílená logika (single source of truth)
- [dashboard-view.css](dashboard-view.css) - Sdílené styly

---

## 💡 Best Practices

1. **Vždy edituj jen `dashboard-view.js`** pro logiku
2. **`dashboard.html` jen pro HTML strukturu** standalone verze
3. **Testuj OBJE verze** po každé změně
4. **Používej global exports** pro onclick handlers v HTML
5. **Udržuj AI Projects array** v `dashboard-view.js` aktuální

---

Vytvořeno: 2025-10-04
Poslední refaktoring: 2025-10-04
Autor: Michaldaniel73 + Claude Code
