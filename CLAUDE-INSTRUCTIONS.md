# 🤖 Instrukce pro Claude AI

## ⚠️ KRITICKÉ - PŘEČTI SI PŘI KAŽDÉ NOVÉ KONVERZACI!

## 🎯 HLAVNÍ SOUBORY APLIKACE:

### grid-app-test.html
- **Co to je**: Hlavní aplikace s TOP NAVIGACÍ a všemi moduly
- **Navigace**: `.p73-topbar-nav` - zde jsem implementoval overflow menu
- **URL**: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
- **Obsahuje**: Dashboard, Grid, Notes, atd.

### dashboard.html
- **Co to je**: Standalone dashboard BEZ navigace
- **URL**: https://onlineday73.web.app/DAY73-cloud/dashboard.html
- **Obsahuje**: Pouze dashboard obsah, žádné menu

### Kdy editovat co?
- **Overflow menu v navigaci** → `grid-app-test.html` + `grid-app-core.js`
- **Dashboard funkce** → `dashboard-view.js`
- **Notes funkce** → `notes-view.js`

### 🎯 Pravidlo č. 1: Pracovní adresář

**VŽDY pracuj POUZE v této složce:**
```
/Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud/
```

**NIKDY neupravuj originál:**
```
/Users/michaldaniel73/APP73/Workspaces/Workspace7/public/DAY73/
```

### 🔍 Jak poznat, že jsem na správném místě?

Když uživatel začne konverzaci, OKAMŽITĚ zkontroluj:

```bash
pwd
```

Pokud jsi v `Workspace7/`, naviguj do `DAY73-cloud/`:
```bash
cd DAY73-cloud/
```

### 📋 Kontrolní checklist při startu konverzace:

- [ ] Jsem v `/Workspace7/DAY73-cloud/` složce?
- [ ] Git remote je `https://github.com/MichalD73/DAY73-cloud.git`?
- [ ] Nebudu editovat soubory v `public/DAY73/`?

### 🚫 Co NIKDY nedělat:

1. ❌ Neupravuj soubory v `public/DAY73/` (originál)
2. ❌ Neupravuj soubory v `public/DAY73-cloud/` (auto-sync target)
3. ❌ Nevytvářej duplicitní .git složky
4. ❌ Nemazej post-commit hook

### ✅ Co VŽDY dělat:

1. ✅ Všechny edity v `DAY73-cloud/` složce
2. ✅ Po změnách: commit → auto-sync → push → deploy
3. ✅ Před commitem zkontroluj `git status`
4. ✅ Při deploy používej `npm run deploy:cloud`

### 🔄 Workflow:

```
1. Edit v DAY73-cloud/
   ↓
2. git add . && git commit -m "zpráva"
   ↓
3. [AUTO] Post-commit hook → sync do public/DAY73-cloud/
   ↓
4. git push
   ↓
5. npm run deploy:cloud
   ↓
6. ✅ Live na https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
```

### 📂 Struktura - kam co patří:

```
DAY73-cloud/              ← 🟢 Pracovní verze (edituj tady)
├── grid-app-test.html
├── grid-app.js
├── modules/
└── ...

public/DAY73/             ← 🔴 Originál (NEDOTÝKAT SE!)

public/DAY73-cloud/       ← 🔵 Auto-sync (NEDOTÝKAT SE!)
```

### 🆘 Když si nejsem jistý:

**Zeptej se uživatele:**
- "Mám pracovat v DAY73-cloud verzi, správně?"
- "Chceš, abych editoval soubor v DAY73-cloud/, ano?"

### 📌 Klíčové příkazy:

```bash
# Zjisti, kde jsi
pwd

# Zkontroluj Git remote
git remote -v

# Status
git status

# Deploy
npm run deploy:cloud
```

### 🎯 Při každém startu konverzace řekni:

"✅ Pracuji v DAY73-cloud vývojové verzi. Originál v public/DAY73/ zůstává nedotčený."
