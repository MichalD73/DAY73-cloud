# 🚀 DAY73-CLOUD - Rychlý Start

## Pro tebe (Vývojář):

### Otevři projekt:
```bash
./open-cloud-workspace.sh
```
Nebo:
```bash
code /Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud.code-workspace
```

### Běžný workflow:
```bash
# 1. Edituj soubory v DAY73-cloud/

# 2. Commit
git add .
git commit -m "popis změn"
# → automatický sync do public/DAY73-cloud/

# 3. Push na GitHub
git push

# 4. Deploy
npm run deploy:cloud
```

### Rychlé příkazy:
```bash
# Status
git status

# Manuální sync (pokud potřebuješ)
npm run sync:cloud

# Deploy
npm run deploy:cloud

# Kde jsem?
pwd
```

---

## Pro AI asistenta (Claude):

### Na začátku každé konverzace:

**Uživatel by měl říct:**
> "Pracujeme v DAY73-cloud verzi"

**Ty (AI) okamžitě potvrdíš:**
```bash
pwd
git remote -v
```

**A řekneš:**
> "✅ Pracuji v DAY73-cloud vývojové verzi"

### Důležité soubory pro AI:
- [CLAUDE-INSTRUCTIONS.md](CLAUDE-INSTRUCTIONS.md) - Kompletní instrukce
- [START-HERE.md](START-HERE.md) - Přehled projektu
- [README.md](README.md) - Technická dokumentace

---

## 🔗 Odkazy:

| Co | URL |
|---|---|
| **Live Cloud** | https://onlineday73.web.app/DAY73-cloud/grid-app-test.html |
| **Live Original** | https://onlineday73.web.app/DAY73/grid-app-test.html |
| **GitHub** | https://github.com/MichalD73/DAY73-cloud |
| **Firebase Console** | https://console.firebase.google.com/project/projecty-73 |

---

## ⚠️ Pamatuj:

- ✅ **DAY73-cloud/** = Pracovní verze
- 🔴 **public/DAY73/** = Originál (NEDOTÝKAT SE)
- 🔵 **public/DAY73-cloud/** = Auto-sync (NEDOTÝKAT SE)
