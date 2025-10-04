# Firebase Setup - DAY73-Cloud

> **Důležitá dokumentace pro řešení Firebase napojení a typických problémů**

## 🔧 Základní Konfigurace

### Firebase SDK Načítání (grid-app-test.html)

**KRITICKÉ POŘADÍ:**
```html
<!-- 1. Firebase App (vždy první!) -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>

<!-- 2. Firebase služby -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>

<!-- 3. Config (inicializace Firebase) -->
<script src="firebase-config.js"></script>

<!-- 4. Teprve pak moduly! -->
<script src="dashboard-view.js" type="module"></script>
```

⚠️ **Pokud změníš pořadí = Firebase nebude fungovat!**

---

## 🐛 Typické Problémy a Řešení

### Problém 1: "Firebase not loaded" v integrované verzi

**Symptom:**
- Dashboard view se načte, ale nezobrazí karty
- Console: `Firebase not loaded`

**Příčina:**
- Modul (např. dashboard-view.js) se spustil dřív než Firebase dokončil inicializaci

**Řešení:**
Použij `waitForFirebase()` polling metodu:

```javascript
waitForFirebase: async function() {
  let attempts = 0;
  const maxAttempts = 50; // 5 sekund timeout

  while (attempts < maxAttempts) {
    if (window.firebase && window.firebase.db) {
      console.log('[Dashboard] Firebase ready');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  console.error('[Dashboard] Firebase failed to load after', maxAttempts * 100, 'ms');
}

// Použití v init:
init: async function() {
  await this.waitForFirebase(); // VŽDY ČEKAT!
  // ... zbytek kódu
}
```

---

### Problém 2: Obrázky se neukládají v card body

**Symptom:**
- Paste obrázku do editoru funguje, ale po refreshi zmizí
- Firestore error: "Document too large"

**Příčina:**
- ContentEditable vytváří base64 data URLs které jsou příliš velké pro Firestore

**Řešení:**
Upload do Firebase Storage, uložit jen URL:

```javascript
editor.onpaste = async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();

      // Upload do Storage
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const storageRef = ref(storage, `card-body-images/${cardId}-${Date.now()}.png`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Vložit URL místo base64
      const img = document.createElement('img');
      img.src = downloadURL;
      img.style.maxWidth = '100%';
      // ... insert do editoru
    }
  }
};
```

---

### Problém 3: Storage permission denied

**Symptom:**
- Console error: "User does not have permission to access 'card-body-images/'"

**Příčina:**
- Chybí Storage rules nebo nebyly deploynuty

**Řešení:**

1. Zkontroluj **storage.rules**:
```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /kanban-images/{imageId} {
      allow read: if true;
      allow write: if true;
    }

    match /card-body-images/{imageId} {
      allow read: if true;
      allow write: if true;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

2. Deploy rules:
```bash
firebase deploy --only storage
```

---

## ✅ Kontrolní Checklist - Když něco nefunguje

### 1. Zkontroluj Console
```javascript
// Měl bys vidět tyto logy:
[Dashboard] Firebase ready
[Dashboard] Listening to kanban cards...
[Dashboard] Cards loaded: X
```

### 2. Zkontroluj Pořadí Scriptů
```
✅ firebase-app-compat.js
✅ firebase-*-compat.js (auth, firestore, storage)
✅ firebase-config.js
✅ dashboard-view.js (nebo jiný modul)
```

### 3. Zkontroluj window.firebase Objekt
```javascript
// V console:
console.log(window.firebase);
// Mělo by vrátit objekt s: { app, auth, db, storage, ... }
```

### 4. Zkontroluj waitForFirebase()
```javascript
// V každém modulu MUSÍ být:
init: async function() {
  await this.waitForFirebase(); // ← Tohle!
  // ...
}
```

### 5. Zkontroluj Storage Rules
```bash
# Deploy storage rules
firebase deploy --only storage

# Nebo deploy všeho
firebase deploy
```

---

## 🏗️ Architektura

### Standalone verze (dashboard.html)
- Firebase načítání inline v HTML
- Vše funguje hned, žádný polling potřeba
- Používá se pro standalone view bez menu

### Integrated verze (grid-app-test.html?view=dashboard)
- Firebase načtené v main HTML (grid-app-test.html)
- dashboard-view.js MUSÍ čekat přes `waitForFirebase()`
- Sdílí Firebase instanci s ostatními moduly

---

## 📦 Firebase Storage Složky

```
/kanban-images/          → Thumbnail obrázky karet
/card-body-images/       → Obrázky v card body editoru
```

Obě složky mají veřejný read/write access (definováno v storage.rules).

---

## 🔍 Debug Tips

### Zjisti jestli Firebase běží:
```javascript
if (window.firebase && window.firebase.db) {
  console.log('✅ Firebase is ready');
} else {
  console.log('❌ Firebase NOT ready');
}
```

### Zjisti kolik času trvá inicializace:
```javascript
console.time('firebase-init');
await this.waitForFirebase();
console.timeEnd('firebase-init');
```

### Zkontroluj Firestore připojení:
```javascript
const { db, collection, getDocs } = window.firebase;
const snapshot = await getDocs(collection(db, 'kanban-cards'));
console.log('Cards in DB:', snapshot.size);
```

---

## 📝 Poznámky pro Budoucnost

1. **Vždy používej waitForFirebase()** v integrated view modulech
2. **Nikdy neměň pořadí Firebase scriptů** v HTML
3. **Storage rules musí být deploynuty** pro upload obrázků
4. **Base64 NIKDY do Firestore** - vždy upload do Storage
5. **Console.log checkpoints** pro debug Firebase ready stavu

---

Vytvořeno: 2025-10-04
Poslední update: 2025-10-04
