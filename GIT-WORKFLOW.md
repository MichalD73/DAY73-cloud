# Git Workflow & Recommendations

**Datum vytvoření:** 2025-10-05
**Status:** Aktuální setup je DOBRÝ a profesionální ✅

---

## 📋 Současný stav

### Repository
- **Název:** MichalD73/myApp
- **Větev:** `backup/mobile-preview-2024-10-01`
- **Hlavní větev:** `main`

### Workflow
```
1. Úpravy → /DAY73-cloud/ (development)
2. Kopírování → /public/DAY73-cloud/ (production)
3. Git commit + push → GitHub
4. Firebase deploy → onlineday73.web.app
```

### Trojitá záloha
1. **Lokální:** Soubory na disku
2. **GitHub:** Verzovaný kód v cloudu
3. **Firebase Hosting:** Nasazená live verze

---

## ⚖️ Hodnocení: Je to dobré?

### ✅ Co je DOBŘE
- Máš verzování (Git) - můžeš se vrátit k jakékoliv verzi
- Máš remote backup (GitHub) - kdyby se něco stalo disku
- Máš jasně oddělený dev/prod (`DAY73-cloud/` vs `public/`)
- Workflow je bezpečný (commit → push → deploy)
- Není to zbytečně komplikované

### ⚠️ Co by se dalo zlepšit
- Manuální kopírování mezi složkami (sync script by ušetřil čas)
- `.gitignore` by mohl být kompletní (bezpečnostní doporučení)
- Název větve `backup/mobile-preview-2024-10-01` je trochu matoucí

---

## 🎯 Doporučení na vylepšení (stupně důležitosti)

### Level 1 - UDĚLAT TEĎKA ⭐⭐⭐

#### 1. **Vytvořit sync script**
**Proč:** Ušetří čas při každém nasazení

**Co to udělá:**
```bash
#!/bin/bash
# sync-cloud.sh
rsync -av --delete DAY73-cloud/ public/DAY73-cloud/
echo "✅ DAY73-cloud synchronized to public/"
```

**Jak používat:**
```bash
# Místo manuálního kopírování:
./sync-cloud.sh
git add .
git commit -m "feat: nějaká změna"
git push
firebase deploy --only hosting
```

**Úspora času:** 2-3 minuty při každém nasazení

---

#### 2. **Vyčistit .gitignore**
**Proč:** Bezpečnost - nechceš commitovat systémové soubory nebo citlivá data

**Doporučený .gitignore:**
```gitignore
# System files
.DS_Store
Thumbs.db
*.log

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Dependencies
node_modules/

# Build outputs
dist/
build/

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log

# Environment files
.env
.env.local
*.key
credentials.json

# Temporary files
tmp/
temp/
*.tmp
```

**Úspora:** Prevence před commitnutím citlivých dat

---

#### 3. **Přejmenovat větev** (volitelné)
**Proč:** Lepší orientace - `backup/mobile-preview-2024-10-01` zní jako dočasná větev

**Doporučení:**
- `develop` - pokud chceš pracovní větev
- `main` - pokud je to hlavní produkční větev
- `feature/day73-cloud` - pokud pracuješ na konkrétní feature

**Jak přejmenovat:**
```bash
# Přejmenovat lokální větev
git branch -m backup/mobile-preview-2024-10-01 develop

# Smazat starou remote větev
git push origin --delete backup/mobile-preview-2024-10-01

# Nahrát novou větev
git push -u origin develop
```

**Úspora:** Lepší orientace v projektu

---

### Level 2 - MOŽNÁ POZDĚJI ⭐⭐

#### Pre-commit hooks
**Co to je:** Automatické kontroly před každým commitem

**Příklady:**
- Automatické spuštění sync scriptu
- Kontrola syntaxe (linting)
- Spuštění testů

**Jak nastavit:**
```bash
# Vytvoř .git/hooks/pre-commit
#!/bin/bash
./sync-cloud.sh
git add public/DAY73-cloud/
```

**Kdy použít:** Až budeš chtít více automatizace

---

#### Lepší commit message templates
**Co to je:** Standardizované formáty pro commit zprávy

**Příklad:**
```
feat: přidána nová funkce do Notes modulu
fix: oprava zobrazení v mobilní verzi
docs: aktualizace dokumentace
chore: aktualizace dependencies
```

**Kdy použít:** Až budeš chtít větší projekt s více lidmi

---

### Level 3 - POKROČILÉ ⭐

#### GitHub Actions CI/CD
**Co to je:** Automatické nasazení po push do GitHubu

**Workflow:**
```
Push do GitHub → Automatický test → Automatický deploy do Firebase
```

**Kdy použít:**
- Pokud nasazuješ velmi často (10x denně)
- Pokud spolupracuješ s více lidmi
- Pokud máš automatizované testy

**Je to potřeba TEĎKA?** ❌ NE - současný workflow je dostatečný

---

## 📚 Užitečné příkazy

### Základní Git workflow
```bash
# Zobrazit status
git status

# Zobrazit změny
git diff

# Přidat všechny změny
git add .

# Commitnout s popisem
git commit -m "feat: popis změny"

# Nahrát na GitHub
git push

# Zobrazit historii commitů
git log --oneline -10

# Vrátit se k předchozímu commitu (POZOR!)
git checkout <commit-hash>
```

### Firebase deployment
```bash
# Nasadit vše
firebase deploy

# Nasadit jen hosting
firebase deploy --only hosting

# Zobrazit projekty
firebase projects:list

# Přepnout projekt
firebase use <project-id>
```

### Sync workflow (s sync scriptem)
```bash
# 1. Úpravy v DAY73-cloud/
# 2. Synchronizace
./sync-cloud.sh

# 3. Git commit
git add .
git commit -m "feat: nějaká změna"

# 4. Push
git push

# 5. Deploy
firebase deploy --only hosting
```

---

## 🎯 Co dělat TEĎKA?

### Doporučení pro okamžité vylepšení:

1. ✅ **Vytvoř sync-cloud.sh** (ušetří čas OKAMŽITĚ)
2. ✅ **Aktualizuj .gitignore** (prevence před commitnutím citlivých dat)
3. ⏭️ **Všechno ostatní přeskoč** - současný workflow JE dobrý

### Po refaktoringu modulů se můžeš vrátit k:
- Pre-commit hooks
- Lepší commit message templates
- GitHub Actions (pokud bude potřeba)

---

## 💡 Klíčové poznámky

1. **Současný setup JE profesionální** - není potřeba velké změny
2. **Sync script = největší okamžitá úspora času**
3. **Nezasekávej se na optimalizaci** - zaměř se na refaktoring modulů
4. **Git workflow ti chrání data** - máš 3 zálohy (lokál, GitHub, Firebase)
5. **Vždycky commit → push → deploy** - nikdy neskač kroky

---

**Další kroky:**
1. Vytvoř sync-cloud.sh
2. Aktualizuj .gitignore
3. Vrať se k refaktoringu modulů
4. K dalším vylepšením se vrátíš později
