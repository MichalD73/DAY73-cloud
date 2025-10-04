# 🚀 GitHub Actions - Automatický Deploy

## Nastavení automatického deploy při push na GitHub

### Krok 1: Vygeneruj Firebase CI Token

V terminálu spusť:
```bash
firebase login:ci
```

To otevře prohlížeč a vygeneruje token. Token zkopíruj - bude vypadat nějak takhle:
```
1//0eXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Krok 2: Přidej token do GitHub Secrets

1. Otevři GitHub repo: https://github.com/MichalD73/DAY73-cloud
2. Jdi na **Settings** → **Secrets and variables** → **Actions**
3. Klikni na **New repository secret**
4. Název: `FIREBASE_TOKEN`
5. Value: Vlož token z kroku 1
6. Klikni **Add secret**

### Krok 3: Commit a Push

Workflow je už připravený v `.github/workflows/firebase-deploy.yml`

Stačí udělat commit a push:
```bash
cd DAY73-cloud
git add .github/workflows/firebase-deploy.yml
git commit -m "feat: add automatic Firebase deploy via GitHub Actions"
git push
```

---

## ✅ Po nastavení:

### Jak to bude fungovat:

1. **Edituj** soubory v `DAY73-cloud/`
2. **Commit** změny: `git commit -m "zpráva"`
3. **Push** na GitHub: `git push`
4. 🤖 **GitHub Actions automaticky** deployne na Firebase!

### Kde sledovat deploy:

- GitHub repo → **Actions** tab
- Uvidíš běžící deploy a případné chyby

### Lokální sync:

Post-commit hook stále funguje - synchronizuje do `public/DAY73-cloud/` automaticky při commitu.

---

## 🔍 Troubleshooting:

**Problem:** Deploy selhal s "Permission denied"
- **Řešení:** Zkontroluj, že FIREBASE_TOKEN je správně nastavený v GitHub Secrets

**Problem:** Workflow se nespustil
- **Řešení:** Zkontroluj, že pushuj na `main` branch

**Problem:** Token expiroval
- **Řešení:** Vygeneruj nový token pomocí `firebase login:ci` a aktualizuj GitHub Secret

---

## 📊 Status badge (volitelné):

Přidej do README.md badge, který zobrazí status deploymentu:

```markdown
[![Deploy to Firebase](https://github.com/MichalD73/DAY73-cloud/actions/workflows/firebase-deploy.yml/badge.svg)](https://github.com/MichalD73/DAY73-cloud/actions/workflows/firebase-deploy.yml)
```
