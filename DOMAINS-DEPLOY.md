# Domény a Deploy - DAY73-Cloud

> **Dokumentace domén, hosting setupu a deploy procesu**

## 🌐 Aktuální Hosting Setup

### Firebase Projekt
- **Projekt ID**: `central-asset-storage`
- **Projekt číslo**: `907874309868`
- **Firebase Console**: https://console.firebase.google.com/project/central-asset-storage

### Hosting Sites

#### 1. **onlineday73** (hlavní site pro DAY73-cloud)
- **URL**: https://onlineday73.web.app
- **Alternativní URL**: https://onlineday73.firebaseapp.com
- **Public folder**: `public/`
- **Root redirect**: `/` → `/DAY73/grid-app-test.html`

#### 2. **central-asset-storage** (původní site)
- **URL**: https://central-asset-storage.web.app
- **Public folder**: `dist/`

---

## 📋 Firebase.json Konfigurace

```json
{
  "hosting": [
    {
      "target": "onlineday73",
      "public": "public",
      "cleanUrls": true,
      "rewrites": [
        {
          "source": "/",
          "destination": "/DAY73/grid-app-test.html"
        }
      ]
    }
  ]
}
```

### Důležité nastavení:
- **`cleanUrls: true`** - Odstraní `.html` z URL (např. `/manual` místo `/manual.html`)
- **`rewrites`** - Root URL (`/`) redirectuje na grid-app-test.html
- **`public: "public"`** - Vše se deployuje z `/public` složky

---

## 🔄 Deploy Proces

### Automatický Sync
Máme nastavenou **automatickou synchronizaci** z `DAY73-cloud/` do `public/DAY73-cloud/`:

```bash
# Po každém commitu se spustí automaticky:
./sync-cloud.sh
```

**Sync script dělá:**
1. Zkontroluje git změny v `DAY73-cloud/`
2. Rsync do `public/DAY73-cloud/`
3. Oznámí co bylo synchronizováno

### Deploy Commands

```bash
# Deploy všeho
firebase deploy

# Deploy pouze hosting (nejrychlejší)
firebase deploy --only hosting:onlineday73

# Deploy pouze storage rules
firebase deploy --only storage

# Deploy pouze firestore rules
firebase deploy --only firestore:rules
```

---

## 🏗️ Struktura Složek

```
Workspace7/
├── DAY73-cloud/              ← Vývojová verze (Git repo)
│   ├── grid-app-test.html
│   ├── dashboard.html
│   ├── manual.html
│   └── ...
│
├── public/
│   └── DAY73-cloud/          ← Sync kopie pro deploy
│       ├── grid-app-test.html
│       ├── dashboard.html
│       └── ...
│
├── firebase.json
├── .firebaserc
└── sync-cloud.sh
```

**Workflow:**
1. Pracuješ v `DAY73-cloud/`
2. Commit → automatický sync do `public/DAY73-cloud/`
3. Deploy → Firebase uploaduje `public/` na hosting

---

## 🔗 Důležité URL

### Live Aplikace
- **Main App**: https://onlineday73.web.app/ (redirectuje na grid-app-test.html)
- **Grid App**: https://onlineday73.web.app/DAY73/grid-app-test.html
- **Dashboard (standalone)**: https://onlineday73.web.app/DAY73-cloud/dashboard.html
- **Dashboard (integrated)**: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html?view=dashboard
- **Manual**: https://onlineday73.web.app/DAY73-cloud/manual.html

### GitHub
- **Repository**: https://github.com/MichalD73/DAY73-cloud
- **Branch**: `main`

---

## ✅ Deploy Checklist

Když deploýuješ změny:

### 1. Zkontroluj Git Status
```bash
git status
```
- Jsou všechny změny commitnuté?

### 2. Zkontroluj Sync
```bash
# Měl by se spustit automaticky po commitu
# Pokud ne, spusť manuálně:
./sync-cloud.sh
```

### 3. Deploy na Firebase
```bash
firebase deploy --only hosting:onlineday73
```

### 4. Push na GitHub
```bash
git push origin main
```

### 5. Otestuj Live URL
Otevři v prohlížeči:
- https://onlineday73.web.app/DAY73-cloud/grid-app-test.html?view=dashboard

---

## 🐛 Typické Problémy

### Problém 1: Změny se neprojeví na live

**Možné příčiny:**
1. Nebyl sync do `public/DAY73-cloud/`
2. Nebyl deploy
3. Browser cache

**Řešení:**
```bash
# 1. Zkontroluj sync
ls -la public/DAY73-cloud/grid-app-test.html

# 2. Deploy znovu
firebase deploy --only hosting:onlineday73

# 3. Hard refresh v prohlížeči (Cmd+Shift+R na Mac)
```

---

### Problém 2: Sync nefunguje

**Symptom:** Po commitu se nespustil sync

**Řešení:**
```bash
# Spusť sync manuálně
./sync-cloud.sh

# Zkontroluj git hooks
ls -la DAY73-cloud/.git/hooks/
```

---

### Problém 3: Deploy selže na permissions

**Symptom:** `Permission denied` při deployi

**Řešení:**
```bash
# Znovu se přihlas do Firebase
firebase login

# Zkontroluj projekt
firebase projects:list

# Ujisti se že jsi ve správném projektu
firebase use central-asset-storage
```

---

## 📊 Deploy Statistiky

Po úspěšném deployi uvidíš:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/central-asset-storage/overview
Hosting URL: https://onlineday73.web.app
```

---

## 🔐 Domény a SSL

### Aktuální Domény
- **onlineday73.web.app** - Automatický SSL certifikát od Firebase
- **onlineday73.firebaseapp.com** - Automatický SSL certifikát od Firebase

### Vlastní Doména (budoucnost)
Pokud budeš chtít vlastní doménu (např. `day73.cz`):

1. Kup doménu
2. V Firebase Console → Hosting → Add custom domain
3. Přidej DNS záznamy od Firebase
4. Počkej na SSL provisioning (24-48h)

Firebase automaticky zajistí:
- ✅ SSL certifikát (Let's Encrypt)
- ✅ Auto-renewal
- ✅ HTTPS redirect

---

## 💡 Pro Tips

### Rychlý Deploy
```bash
# Alias pro rychlý deploy (přidej do ~/.zshrc nebo ~/.bashrc)
alias fdeploy="firebase deploy --only hosting:onlineday73"
```

### Preview před Deployem
```bash
# Spusť lokální preview
firebase serve --only hosting:onlineday73

# Otevři: http://localhost:5000
```

### Deploy History
```bash
# Zobraz historii deployů
firebase hosting:channel:list

# Firebase Console → Hosting → Release history
```

---

## 📝 Poznámky

1. **Vždy commit → sync → deploy** v tomto pořadí
2. **Sync je automatický** po git commit (díky git hooks)
3. **Deploy hosting trvá ~30-60 sekund**
4. **Browser cache** - někdy potřeba hard refresh (Cmd+Shift+R)
5. **Public folder** je gitignored (kromě konfigurace), protože je automaticky syncován

---

Vytvořeno: 2025-10-04
Poslední update: 2025-10-04
