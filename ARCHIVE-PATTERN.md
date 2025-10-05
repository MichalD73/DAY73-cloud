# Archive Pattern - Bezpečná archivace starého kódu

**Datum vytvoření:** 2025-10-05
**Účel:** Standardizovaný postup pro archivaci kódu před smazáním

---

## 🎯 Proč archivovat místo mazat?

**Problém se smazáním:**
- ❌ Nenávratná ztráta kódu
- ❌ Nemožnost rychlé obnovy při problémech
- ❌ Ztráta reference na staré řešení
- ❌ Strach "co když se něco pokazí?"

**Výhody archivace:**
- ✅ Bezpečná záloha kdyby se cokoliv pokazilo
- ✅ Jasně oddělené (není v produkci)
- ✅ Git tracked (historie zachována)
- ✅ Datované (víš kdy a proč archivováno)
- ✅ Snadné smazání až budeš 100% jistý

**Citát z diskuse:**
> "Pořád mám trochu strach říct smazat původní zálohu s tím, že se prostě najednou něco pokazí. Co udělat nějakou variantu archiv, kde to bude uloženo, dokud to nesmažeme, ale už nebude součástí."

---

## 📁 Struktura archivu

### Standardní struktura

```
public/DAY73-cloud/
├── _archive/                        # Archivní složka (prefix _ = ignorovat)
│   ├── 2025-10-05_notes-v1/        # Datovaný archiv
│   │   ├── notes-app.js            # Archivované soubory
│   │   ├── notes-app.css
│   │   └── README.txt              # Dokumentace archivu
│   │
│   ├── 2025-10-15_dashboard-v1/    # Další archiv (příklad)
│   │   ├── dashboard.js
│   │   └── README.txt
│   │
│   └── README.md                    # Přehled všech archivů
│
├── notes-view.js                    # AKTIVNÍ verze
├── notes-view.css
└── notes.html
```

### Pojmenování archivů

**Formát:** `YYYY-MM-DD_nazev-modulu-vX/`

**Příklady:**
- `2025-10-05_notes-v1/` - První archiv Notes modulu
- `2025-10-15_dashboard-v2/` - Druhý archiv Dashboard (po další změně)
- `2025-11-01_banners-v1/` - První archiv Banners modulu

**Proč takto:**
- ✅ Datum na začátku - chronologické řazení
- ✅ Název modulu - jasná identifikace
- ✅ Verze - rozlišení více archivů stejného modulu

---

## 📝 README.txt template

Každý archiv MUSÍ obsahovat `README.txt` s:

```txt
==========================================
 ARCHIV - Název Modulu vX (Popis)
==========================================

Datum archivace: YYYY-MM-DD
Důvod: [Proč bylo archivováno]

==========================================
 CO JE V TOMTO ARCHIVU
==========================================

1. soubor1.js (XXX řádků)
   - Popis co obsahuje

2. soubor2.css (XXX řádků)
   - Popis co obsahuje

==========================================
 PROČ BYLO ARCHIVOVÁNO
==========================================

[Důvod refaktoringu/změny]

Vytvořena nová verze:
- novy-soubor.js (popis)
- novy-soubor.css (popis)

Výhody nové verze:
✅ Benefit 1
✅ Benefit 2
✅ Benefit 3

==========================================
 BEZPEČNOSTNÍ ZÁLOHA
==========================================

Tyto soubory jsou ZÁLOHA pro případ problémů s novou verzí.

❌ NEJSOU v produkci (Firebase je ignoruje)
❌ NEJSOU načítány aplikací
✅ JSOU v Git historii (kdykoliv obnovitelné)
✅ JSOU bezpečně uloženy pro případ potřeby

==========================================
 KDY SMAZAT
==========================================

Tento archiv můžeš smazat až:
1. [Podmínka 1]
2. [Podmínka 2]
3. Projde alespoň 1-2 týdny bez problémů

Jak smazat:
rm -rf /path/to/_archive/YYYY-MM-DD_nazev-vX/

==========================================
 JAK OBNOVIT (pokud je potřeba)
==========================================

Pokud by nová verze měla problém:

1. [Krok 1]
2. [Krok 2]
3. Deploy na Firebase

==========================================
 ODKAZY NA DOKUMENTACI
==========================================

- [DOC-1.md] - Popis
- [DOC-2.md] - Popis

==========================================
 KONTAKT / POZNÁMKY
==========================================

Vytvořeno: [Kdo]
Datum: YYYY-MM-DD
Účel: [Účel archivace]

==========================================
```

---

## 🔧 Postup archivace

### Krok 1: Vytvoř archivní složku

```bash
# Vytvoř datovanou složku
mkdir -p public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-modulu-v1
```

**Příklad:**
```bash
mkdir -p public/DAY73-cloud/_archive/2025-10-05_notes-v1
```

### Krok 2: Přesuň staré soubory

```bash
# Přesuň soubory do archivu
mv public/DAY73-cloud/stary-soubor.js public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/
mv public/DAY73-cloud/stary-soubor.css public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/
```

**Příklad:**
```bash
mv public/DAY73-cloud/notes-app.js public/DAY73-cloud/_archive/2025-10-05_notes-v1/
mv public/DAY73-cloud/notes-app.css public/DAY73-cloud/_archive/2025-10-05_notes-v1/
```

### Krok 3: Vytvoř README.txt

```bash
# Vytvoř dokumentaci archivu
nano public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/README.txt
```

Použij **README.txt template** výše!

### Krok 4: Ověř strukturu

```bash
# Zkontroluj že archiv obsahuje vše potřebné
ls -lah public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/
```

**Měl bys vidět:**
```
drwxr-xr-x  5 user  staff   160B Oct  5 00:45 .
drwxr-xr-x  3 user  staff    96B Oct  5 00:44 ..
-rw-r--r--  1 user  staff   2.8K Oct  5 00:45 README.txt
-rw-r--r--  1 user  staff    16K Oct  4 19:24 stary-soubor.css
-rw-r--r--  1 user  staff    55K Oct  4 19:24 stary-soubor.js
```

### Krok 5: Git commit

```bash
git add .
git commit -m "chore: Archive old Module v1 to _archive folder

- Created _archive/YYYY-MM-DD_nazev-v1/ for safe backup
- Moved stary-soubor.js and stary-soubor.css to archive
- Added README.txt with archival documentation

Benefits:
✅ Safe backup if new version has issues
✅ Not in production (Firebase ignores _archive/)
✅ Git tracked but clearly separated
✅ Easy to delete when confident in new version
"
```

### Krok 6: Deploy

```bash
firebase deploy --only hosting
```

**Firebase automaticky ignoruje `_archive/` složku!**

### Krok 7: Push do GitHub

```bash
git push origin branch-name
```

---

## ⏰ Kdy smazat archiv

### Podmínky pro smazání

Archiv smaž až když:

- ✅ **Nová verze funguje 100%** - Všechny funkce otestovány
- ✅ **Prošel čas** - Alespoň 1-2 týdny bez problémů
- ✅ **Ověřeno v produkci** - Live verze funguje správně
- ✅ **Uživatelé potvrdili** - Žádné hlášení problémů
- ✅ **Jsi 100% jistý** - Nemáš strach že se něco pokazí

### Jak smazat archiv

```bash
# Smaž celou archivní složku
rm -rf public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/

# Commitni smazání
git add .
git commit -m "chore: Delete Module v1 archive - verified stable for X weeks"
git push

# Deploy
firebase deploy --only hosting
```

---

## 🔧 Jak obnovit archivovaný kód

### Pokud potřebuješ obnovit archiv:

#### Rychlá obnova (copy-paste)

```bash
# 1. Zkopíruj soubory zpět
cp public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/*.js public/DAY73-cloud/
cp public/DAY73-cloud/_archive/YYYY-MM-DD_nazev-v1/*.css public/DAY73-cloud/

# 2. Obnov odkazy v kódu (viz README.txt v archivu)
# 3. Deploy
firebase deploy --only hosting
```

#### Git obnova (z historie)

```bash
# Najdi commit kdy bylo archivováno
git log --all --grep="Archive old Module"

# Obnov soubory z commitu PŘED archivací
git checkout <commit-hash>~1 -- public/DAY73-cloud/stary-soubor.js
git checkout <commit-hash>~1 -- public/DAY73-cloud/stary-soubor.css

# Commitni obnovu
git commit -m "revert: Restore Module v1 from archive"
```

---

## ✅ Checklist archivace

Před commitem archivace zkontroluj:

- [ ] **Složka vytvořena** - `_archive/YYYY-MM-DD_nazev-vX/`
- [ ] **Soubory přesunuty** - Všechny staré soubory v archivu
- [ ] **README.txt vytvořen** - Podle template
- [ ] **README obsahuje:**
  - [ ] Co je v archivu
  - [ ] Proč archivováno
  - [ ] Kdy smazat
  - [ ] Jak obnovit
  - [ ] Odkazy na dokumentaci
- [ ] **Struktura ověřena** - `ls -lah` ukazuje správné soubory
- [ ] **Nová verze funguje** - Otestováno před archivací
- [ ] **Git commit** - S jasným popisem
- [ ] **Deploy** - Firebase archiv ignoruje
- [ ] **Push** - GitHub má zálohu

---

## 📊 Příklad: Notes Module

### Před archivací

```
public/DAY73-cloud/
├── notes-app.js          # Starý kód
├── notes-app.css         # Starý styling
├── notes-view.js         # Nový kód
├── notes-view.css        # Nový styling
└── notes.html            # Nový wrapper
```

**Problém:** Duplikace, nejasné co je aktivní.

### Po archivaci

```
public/DAY73-cloud/
├── _archive/
│   └── 2025-10-05_notes-v1/
│       ├── notes-app.js       # ← ARCHIV (bezpečná záloha)
│       ├── notes-app.css      # ← ARCHIV
│       └── README.txt         # ← Dokumentace
│
├── notes-view.js         # ← AKTIVNÍ
├── notes-view.css        # ← AKTIVNÍ
└── notes.html            # ← AKTIVNÍ
```

**Výsledek:** Jasné oddělení, bezpečná záloha, čistý produkční kód.

### README.txt obsah

```txt
==========================================
 ARCHIV - Notes Module v1 (Původní verze)
==========================================

Datum archivace: 2025-10-05
Důvod: Refaktoring na "Poznámky 2" (notes-view.js pattern)

... (kompletní dokumentace)

KDY SMAZAT:
1. Ověříš že "Poznámky 2" fungují 100%
2. Otestujeme všechny funkce
3. Projde alespoň 1-2 týdny bez problémů

JAK OBNOVIT:
cp _archive/2025-10-05_notes-v1/notes-app.* .
... (detailní kroky)
==========================================
```

---

## 🚀 Použití pro další moduly

### Template příkaz

```bash
# 1. Vytvoř archiv
mkdir -p public/DAY73-cloud/_archive/$(date +%Y-%m-%d)_MODULE-v1

# 2. Přesuň soubory
mv public/DAY73-cloud/old-file.js public/DAY73-cloud/_archive/$(date +%Y-%m-%d)_MODULE-v1/
mv public/DAY73-cloud/old-file.css public/DAY73-cloud/_archive/$(date +%Y-%m-%d)_MODULE-v1/

# 3. Vytvoř README.txt (použij template)
# 4. Git add, commit, push
# 5. Deploy
```

### Moduly k archivaci

Po refaktoringu těchto modulů použij tento pattern:

1. ~~Notes~~ ✅ Hotovo (2025-10-05_notes-v1)
2. Dashboard - Až se bude refaktorovat
3. Manifest - Až se bude refaktorovat
4. Banners - Až se bude refaktorovat
5. Mobile - Až se bude refaktorovat
6. Mindmap - Až se bude refaktorovat
7. Grid - Až se bude refaktorovat
8. Goal Canvas - Až se bude refaktorovat

---

## 📚 Související dokumentace

- **[NOTES-REFACTORING.md](./NOTES-REFACTORING.md)** - Příklad refaktoringu který vedl k archivaci
- **[DASHBOARD-ARCHITECTURE.md](./DASHBOARD-ARCHITECTURE.md)** - Pattern pro refaktoring modulů
- **[COMMUNICATION-PATTERN.md](./COMMUNICATION-PATTERN.md)** - Jak hlásit archivaci

---

## 🎯 Best Practices

### ✅ DOPORUČENO

- **Vždy vytvoř README.txt** - Budoucí ty poděkuje
- **Datuj archivy** - YYYY-MM-DD na začátku názvu
- **Čekej 1-2 týdny** - Před smazáním archivu
- **Testuj důkladně** - Novou verzi před archivací staré
- **Dokumentuj proč** - V README.txt vysvětli důvod

### ❌ NEDOPORUČENO

- **Mazat bez archivace** - Vždy nejdřív archivuj
- **Archiv bez README** - Budoucí ty nebude vědět co je to
- **Nedatované archivy** - Nebudeš vědět kdy to bylo
- **Mazat archiv brzy** - Počkej alespoň 1-2 týdny
- **Archiv v produkci** - Vždy použij `_archive/` prefix

---

## ✅ Závěr

Archivační pattern zajišťuje:
- ✅ **Bezpečnou zálohu** před smazáním kódu
- ✅ **Jasné oddělení** aktivního a archivovaného kódu
- ✅ **Git historii** pro budoucí obnovu
- ✅ **Klid na duši** - Víš že máš zálohu kdyby se cokoliv pokazilo
- ✅ **Čistý produkční kód** - Archiv není v produkci

**Použij tento pattern vždy když chceš smazat starý kód!** 🎉
