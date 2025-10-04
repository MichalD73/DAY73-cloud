# Project_73 Cloud 🚀

Cloud verze Project_73 - komplexní projektový workspace s Firebase integrací a automatizovaným deployment workflow.

## 🌐 Live URLs

- **Production**: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
- **GitHub**: https://github.com/MichalD73/DAY73-cloud

---

## 🚀 Funkce

- **Grid systém** - Interaktivní mřížka pro organizaci projektů (105 boxů)
- **Goal Canvas** - Vizuální plátno pro strategické cíle s drag & drop
- **Knihovna kódů** - Ukládání code snippetů s náhledy a screenshoty
- **Kalendář** - Plánování událostí pro projekty
- **Assets & Galerie** - Správa souborů z Firebase Storage
- **Super Modul** - Agregace budoucích modulů

---

## 📦 Tech Stack

- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Deployment**: GitHub + Firebase Hosting
- **Version Control**: Git

---

## 🔧 Development Workflow

### 1️⃣ **Lokální vývoj**

```bash
# Otevři projekt v editoru
cd DAY73-cloud/

# Edituj soubory...
```

### 2️⃣ **Commit změn**

```bash
# Stage změny
git add .

# Commit (automaticky spustí sync do public/)
git commit -m "feat: add new feature"

# ✅ Post-commit hook automaticky syncne do public/DAY73-cloud/
```

### 3️⃣ **Push na GitHub**

```bash
git push origin main
```

### 4️⃣ **Deploy na Firebase**

```bash
# Z kořenového workspace
cd ..
npm run deploy:cloud

# NEBO manuálně:
npm run sync:cloud
firebase deploy --only hosting:onlineday73
```

---

## 📋 Užitečné příkazy

```bash
# Sync DAY73-cloud → public/DAY73-cloud
npm run sync:cloud

# Sync + Deploy
npm run deploy:cloud

# Lokální Firebase preview
firebase serve --only hosting:onlineday73

# Commit + Push (jedním příkazem)
git add . && git commit -m "update" && git push
```

---

## 🗂️ Struktura projektu

```
Workspace7/
├── DAY73/                    # ← Originál (nedotýkat se!)
├── DAY73-cloud/              # ← Vývoj zde!
│   ├── .git/                 # Git repo
│   ├── .github/workflows/    # GitHub Actions
│   ├── grid-app-test.html    # Hlavní app
│   ├── grid-app-core.js
│   └── dev-server.html
├── public/
│   └── DAY73-cloud/          # ← Auto-sync target (build)
├── sync-cloud.sh             # Sync script
└── package.json
```

---

## 🔄 Jak funguje automatizace

1. **Post-commit hook** (`DAY73-cloud/.git/hooks/post-commit`)
   - Automaticky syncne změny do `public/DAY73-cloud/` po každém commitu

2. **Sync script** (`sync-cloud.sh`)
   - Kopíruje soubory pomocí rsync
   - Vynechává `.git`, `node_modules`, `.DS_Store`

3. **NPM scripts** (`package.json`)
   - `sync:cloud` - Manuální sync
   - `deploy:cloud` - Sync + Firebase deploy

---

## ⚠️ Důležité poznámky

- **Originál `DAY73/` se NIKDY nedotýkat!**
- Všechny změny dělat pouze v `DAY73-cloud/`
- Firebase databáze (Firestore) je **sdílená** mezi oběma verzemi
- Používá stejný Google Auth (žádné změny v přihlášení)

---

## 🐛 Troubleshooting

**Změny se neprojevují na webu:**
```bash
# Hard refresh v browseru
Cmd+Shift+R (Mac) / Ctrl+Shift+R (PC)

# Zkontroluj, že sync proběhl
npm run sync:cloud

# Znovu deploy
npm run deploy:cloud
```

**Post-commit hook nefunguje:**
```bash
# Zkontroluj oprávnění
chmod +x DAY73-cloud/.git/hooks/post-commit

# Manuální sync
npm run sync:cloud
```

---

## 📝 Poznámky

Toto je **cloud verze** původního projektu DAY73, připravená pro:
- ✅ Git version control
- ✅ GitHub hosting
- ✅ Automatizované syncs
- ✅ Snadný deployment workflow
- ✅ Bezpečné experimentování (originál zůstává nedotčený)
