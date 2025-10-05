# 🚨 Deployment Checklist - POVINNÉ KROKY

> **DŮLEŽITÉ: Přečti VŽDY před každým deploymentem!**

## ❌ CO SE STALO (Lessons Learned)

### Problém: Deployment nefungoval, "Page Not Found"

**Chyby:**
1. ❌ Vytvořil jsem `firebase.json` v **špatné složce** (`DAY73-cloud/` místo root)
2. ❌ Deployoval jsem z **nested repo** místo z root `Workspace7/`
3. ❌ Ignoroval jsem dokumentaci a jednal jsem bez pochopení struktury
4. ❌ Posílal jsem špatnou URL opakovaně
5. ❌ Jednal jsem bez schválení uživatele

**Důsledky:**
- 🔴 Nasadilo se 529 souborů místo správných ~300
- 🔴 Aplikace nefungovala na produkci
- 🔴 Hodiny ztráceného času debugováním

---

## ✅ SPRÁVNÝ WORKFLOW

### 1. Struktura Projektu (MUSÍŠ POCHOPIT!)

```
Workspace7/                    ← ROOT repo (tady deploy!)
├── firebase.json              ← Hlavní konfigurace
├── sync-cloud.sh              ← Auto-sync script
├── DAY73-cloud/               ← Nested repo (tady vyvíjíš!)
│   ├── .git/                  ← Vlastní git
│   ├── grid-app-test.html
│   └── ...
└── public/
    └── DAY73-cloud/           ← Auto-sync target (NEDOTÝKAT SE!)
```

### 2. Pracovní Workflow

```bash
# KROK 1: Vyvíjej v DAY73-cloud/
cd /Users/michaldaniel73/APP73/Workspaces/Workspace7/DAY73-cloud
# ... edituj soubory ...

# KROK 2: Commit (automaticky se spustí sync)
git add .
git commit -m "message"
# → Auto-sync do public/DAY73-cloud/

# KROK 3: Deploy z ROOT složky!
cd /Users/michaldaniel73/APP73/Workspaces/Workspace7
firebase deploy --only hosting:onlineday73 --project central-asset-storage

# KROK 4: Push
cd DAY73-cloud
git push
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

**Před každým `firebase deploy` MUSÍŠ zkontrolovat:**

### ✅ Checklist Items:

- [ ] **Jsem v ROOT složce** `Workspace7/`?
  ```bash
  pwd
  # Mělo by vrátit: /Users/michaldaniel73/APP73/Workspaces/Workspace7
  ```

- [ ] **Přečetl jsem DOMAINS-DEPLOY.md**?
  ```bash
  cat DOMAINS-DEPLOY.md | head -50
  ```

- [ ] **Sync proběhl úspěšně**?
  ```bash
  ./sync-cloud.sh
  # Nebo automaticky po git commit
  ```

- [ ] **Firebase.json je správný**?
  ```bash
  cat firebase.json | grep -A5 "onlineday73"
  # Mělo by obsahovat: "public": "public"
  ```

- [ ] **Znám PŘESNOU live URL**?
  ```
  https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
  ```

---

## 🚨 RED FLAGS - STOP A PŘEČTI DOKUMENTACI!

Když vidíš/slyšíš:

- 🚩 **"Nefunguje to" / "Page Not Found"**
  → Přečti DOMAINS-DEPLOY.md a tento checklist

- 🚩 **Více .git složek v projektu**
  → Nested repos! Přečti strukturu v CLAUDE-INSTRUCTIONS.md

- 🚩 **Sync script existuje**
  → Deployment NENÍ přímý! Přečti workflow

- 🚩 **Deployment má neočekávaný počet souborů**
  → Deployuješ ze špatné složky!

- 🚩 **Uživatel říká "přečti si dokumentaci"**
  → IHNED zastavit a přečíst VŠECHNY .md soubory

---

## ❌ NIKDY NEDĚLEJ:

### 1. ❌ NIKDY nevytvářej firebase.json v DAY73-cloud/
```bash
# ŠPATNĚ:
cd DAY73-cloud/
echo '{"hosting": ...}' > firebase.json  # ❌ NE!
```

### 2. ❌ NIKDY nedeployuj z DAY73-cloud/
```bash
# ŠPATNĚ:
cd DAY73-cloud/
firebase deploy  # ❌ NE! Deploy z root!
```

### 3. ❌ NIKDY neupravuj public/DAY73-cloud/ ručně
```bash
# ŠPATNĚ:
vim public/DAY73-cloud/grid-app-test.html  # ❌ Auto-sync target!
```

### 4. ❌ NIKDY neposílej URL bez /DAY73-cloud/
```bash
# ŠPATNĚ:
https://onlineday73.web.app  # ❌ Toto je root, ne naše app!

# SPRÁVNĚ:
https://onlineday73.web.app/DAY73-cloud/grid-app-test.html  # ✅
```

---

## 🎯 NOVÁ PRAVIDLA PRO AI ASISTENTY

### Pravidlo 1: **"Read First, Act Later"**
1. ✅ Přečti VŠECHNY relevantní .md soubory
2. ✅ Napiš PLÁN s kroky
3. ✅ Čekej na SCHVÁLENÍ uživatele
4. ✅ TEPRVE PAK jednej

### Pravidlo 2: **"Verify Structure First"**
```bash
# Před KAŽDÝM deploymentem:
pwd                    # Kde jsem?
ls firebase.json       # Existuje config?
cat DOMAINS-DEPLOY.md  # Co říká dokumentace?
```

### Pravidlo 3: **"URL Check After Deploy"**
```bash
# Po KAŽDÉM deployi:
1. Jaká je PŘESNÁ live URL?
2. Otevři URL nebo popros uživatele
3. NEPŘEDPOKLÁDAJ že funguje - OVĚŘ!
```

### Pravidlo 4: **"Ask Before Breaking Things"**
- ❓ Nejsi si jistý strukturou? → ASK
- ❓ Vidíš nested repos? → ASK
- ❓ Deployment vypadá divně? → ASK
- ❓ Uživatel je frustrovaný? → STOP, READ DOCS, ASK

---

## 📝 Deployment Issue Workflow

Když něco NEJDE:

```markdown
1. ❓ **Co říká chybová zpráva / screenshot?**
   - Přesně přečti error message
   - Podívej se na screenshot od uživatele

2. 📖 **Co říká dokumentace?**
   - DOMAINS-DEPLOY.md
   - CLAUDE-INSTRUCTIONS.md
   - Tento checklist

3. 📂 **Kde FYZICKY jsem?**
   ```bash
   pwd
   ls -la
   git remote -v
   ```

4. 🔍 **Kde BÝT MÁM podle dokumentace?**
   - Porovnej aktuální stav s dokumentací

5. 📋 **Napsat PLÁN opravy**
   - Konkrétní kroky
   - Co se změní

6. ⏸️  **POČKAT na schválení uživatele**
   - Prezentovat plán
   - Nečekat = riskovat další chyby

7. ✅ **Teprve pak opravit**
   - Následovat schválený plán
   - Ověřit výsledek
```

---

## 🔧 Quick Reference Commands

### Zjistit kde jsem:
```bash
pwd
ls firebase.json
git remote -v
```

### Správný deployment:
```bash
# 1. Zkontroluj sync
./sync-cloud.sh

# 2. Deploy z ROOT
cd /Users/michaldaniel73/APP73/Workspaces/Workspace7
firebase deploy --only hosting:onlineday73 --project central-asset-storage

# 3. Ověř URL
echo "Live: https://onlineday73.web.app/DAY73-cloud/grid-app-test.html"
```

### Kontrola live deploymentu:
```bash
firebase hosting:channel:list --project central-asset-storage --site onlineday73
```

---

## 📚 Související Dokumentace

- [DOMAINS-DEPLOY.md](DOMAINS-DEPLOY.md) - Deploy workflow
- [CLAUDE-INSTRUCTIONS.md](CLAUDE-INSTRUCTIONS.md) - Základní instrukce pro AI
- [START-HERE.md](START-HERE.md) - Úvod do projektu
- [GIT-WORKFLOW.md](GIT-WORKFLOW.md) - Git best practices

---

## 💡 Shrnutí

**VŽDY PAMATUJ:**
1. 📖 Dokumentace FIRST
2. 🤔 Pochopení struktury BEFORE akce
3. 📋 Plán a schválení BEFORE změn
4. ✅ Ověření výsledku AFTER deploy

**NIKDY:**
- ❌ Nejednej bez pochopení struktury
- ❌ Nevytvářej config soubory bez čtení dokumentace
- ❌ Neposílej URL bez ověření
- ❌ Nedeployuj bez checklistu

---

*Vytvořeno: 2025-10-05*
*Důvod: Prevent catastrophic deployment failures*
*Lesson learned: Always read docs first, ask questions, verify results*
