# 🚀 DAY73 Cloud - Vývojová Verze

## ⚠️ DŮLEŽITÉ - VŽDY PRACUJ POUZE TADY!

Toto je **vývojová verze** projektu DAY73.

### 📍 Kde právě jsi:
```
/Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud/
```

### 🔒 Originál (NEDOTÝKAT SE):
```
/Users/michaldaniel73/APP73/Workspaces/Workspace7/public/DAY73/
```
**Tento adresář slouží pouze jako REFERENČNÍ KOPIE. NIKDY zde neupravuj soubory!**

---

## 🎯 Workflow pro vývoj:

### 1️⃣ Edituj soubory zde v `DAY73-cloud/`
```bash
code /Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud/
```

### 2️⃣ Commit změny
```bash
git add .
git commit -m "popis změn"
```
→ **Automaticky** se spustí sync do `public/DAY73-cloud/`

### 3️⃣ Push na GitHub
```bash
git push
```

### 4️⃣ Deploy na Firebase
```bash
npm run deploy:cloud
```
→ Deploy na https://onlineday73.web.app/DAY73-cloud/grid-app-test.html

---

## 🔗 Odkazy:

- **Live Cloud**: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
- **Live Original**: https://onlineday73.web.app/DAY73/grid-app-test.html
- **GitHub**: https://github.com/MichalD73/DAY73-cloud
- **Firebase Console**: https://console.firebase.google.com/project/projecty-73/overview

---

## ✅ Kontrola: Jsem na správném místě?

Spusť v terminálu:
```bash
pwd
```

Mělo by vrátit:
```
/Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud
```

Nebo zkontroluj git remote:
```bash
git remote -v
```

Mělo by vrátit:
```
origin  https://github.com/MichalD73/DAY73-cloud.git
```

---

## 🚨 Když začneš novou konverzaci:

1. **Otevři VS Code přímo v DAY73-cloud složce**
2. **Řekni AI**: "Pracujeme v DAY73-cloud verzi, ne v originálu!"
3. **Odkaz na tento soubor**: Můžeš říct "Přečti si START-HERE.md"

---

## 📂 Struktura projektu:

```
Workspace7/
├── DAY73-cloud/              ← 🟢 PRACUJ TADY
│   ├── START-HERE.md         ← Tento soubor
│   ├── README.md
│   ├── grid-app-test.html
│   ├── grid-app.js
│   ├── modules/
│   └── ...
├── public/
│   ├── DAY73/                ← 🔴 NEDOTÝKAT SE (originál)
│   └── DAY73-cloud/          ← 🔵 Auto-sync z DAY73-cloud/
└── sync-cloud.sh             ← Sync script
```

---

## 💡 Tipy:

- Vždy když otevřeš VS Code, zkontroluj, že jsi v `DAY73-cloud/` složce
- Git branch by měl být `main` (nebo tvá feature branch)
- Originál `public/DAY73/` je **read-only referenční kopie**
- Všechny změny dělej pouze v `DAY73-cloud/`
