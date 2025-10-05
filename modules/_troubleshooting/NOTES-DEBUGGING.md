# Poznámky - Debugging Guide

## Když poznámky nefungují / neukazují se nové

### 1. Typické chyby v Console

#### ❌ `ReferenceError: updateArchitektCopyToolbarButton is not defined`
**Příčina:** Archivovaný modul má zakomentované funkce, ale volání není zakomentované
**Řešení:** Zakomentuj všechna volání archivovaných funkcí v `grid-app.js`

**Hledej:**
```bash
grep -n "updateArchitektCopyToolbarButton\|isArchitektWorkspace" grid-app.js
```

**Oprav:** Zakomentuj každé volání:
```javascript
// updateArchitektCopyToolbarButton(); // REMOVED - Architekt archived
```

---

#### ❌ `NotFoundError: Failed to execute 'requestSubmit' on 'HTMLFormElement'`
**Příčina:** `formEl.requestSubmit(saveBtn)` - saveBtn není validní submitter
**Řešení:** Volat `requestSubmit()` BEZ parametru

**Místo v kódu:** `notes-view.js` (2 místa - onclick + autosave)

**Správně:**
```javascript
if (formEl) {
  formEl.requestSubmit();  // BEZ parametru!
}
```

**ŠPATNĚ:**
```javascript
formEl?.requestSubmit(saveBtn);  // NEFUNGUJE
```

---

### 2. Debug checklist (co zkontrolovat)

Když poznámky **neukazují nové záznamy**, zkontroluj v Console:

```javascript
// 1. Je uživatel přihlášený?
console.log('User:', window.NotesView?.currentUser);

// 2. Je Firebase připravený?
console.log('Firebase ready:', window.firebase?.db);

// 3. Kolik poznámek je v cache?
console.log('Notes cache:', window.NotesView?.notesCache?.length);

// 4. Jaká je aktuální složka?
console.log('Current folder:', window.NotesView?.currentFolderId);

// 5. Volá se subscribeNotes?
// Hledej v console: "[Notes] subscribeNotes starting for folder:"

// 6. Přichází onSnapshot events?
// Hledej v console: "[Notes] onSnapshot received: X notes"
```

---

### 3. Časté problémy a řešení

#### Problém: Poznámka se uloží ale nezobrazí
**Možné příčiny:**
1. `subscribeNotes()` se nevolá po uložení
2. `onSnapshot` listener není aktivní
3. Poznámka se uložila do jiné složky než je aktivní
4. `activeView` je false

**Řešení:**
- Zkontroluj že `subscribeNotes()` je volaný po `subscribeFolders()` callback
- Zkontroluj že `currentFolderId` není null
- Přidej debug logy (viz sekce 4)

---

#### Problém: Poznámky se nenačítají vůbec
**Možné příčiny:**
1. Firebase není inicializovaný
2. Uživatel není přihlášený
3. `currentFolderId` je null
4. Firestore permissions

**Řešení:**
- Zkontroluj Firebase console - jsou tam poznámky?
- Zkontroluj Network tab - volají se Firestore requesty?
- Zkontroluj `firebaseReady()` return value

---

### 4. Debug logy (přidat když potřebuješ)

**Do `subscribeNotes()` (řádek ~1275):**
```javascript
function subscribeNotes() {
  stopNotesSubscription();
  notesCache = [];
  renderNotes();

  if (!activeView || !currentUser || !currentFolderId || !firebaseReady()) {
    console.warn('[Notes] subscribeNotes aborted:', {
      activeView,
      hasUser: !!currentUser,
      currentFolderId,
      firebaseReady: firebaseReady()
    });
    return;
  }

  console.log('[Notes] subscribeNotes starting for folder:', currentFolderId);
  // ... zbytek kódu
}
```

**Do `onSnapshot` callbacku (řádek ~1297):**
```javascript
notesUnsubscribe = onSnapshot(q, (snapshot) => {
  console.log('[Notes] onSnapshot received:', snapshot.size, 'notes');
  // ... zbytek kódu
});
```

---

### 5. Kritická místa v kódu

| Soubor | Řádek | Co se tam děje | Časté chyby |
|--------|-------|----------------|-------------|
| `notes-view.js` | 1231-1267 | `subscribeFolders()` - onSnapshot callback | Early return když `snapshot.empty` |
| `notes-view.js` | 1275-1324 | `subscribeNotes()` - načítání poznámek | `activeView` check, `currentFolderId` null |
| `notes-view.js` | 1380-1406 | `renderNotes()` - zobrazení seznamu | Prázdný `notesCache` |
| `notes-view.js` | 1679-1809 | Save poznámky | `isSaving` flag, `requestSubmit()` error |
| `notes-view.js` | 530, 937 | `requestSubmit()` volání | Nevalidní submitter parameter |

---

### 6. Jak rychle otestovat že poznámky fungují

1. Otevři https://onlineday73.web.app/DAY73-cloud/grid-app-test.html
2. Klikni na "Poznámky" v navigaci
3. Otevři Console (F12)
4. Vytvoř novou poznámku (tlačítko "+")
5. Napiš text "test"
6. Ulož (Ctrl+Enter nebo tlačítko save)
7. **Očekávaný výstup v console:**
   ```
   [Notes] subscribeNotes starting for folder: <folder-id>
   [Notes] onSnapshot received: X notes
   ```
8. **Očekávané chování:** Poznámka se zobrazí v levém seznamu

---

### 7. Firestore struktura

```
project73-notes/
  {userId}/
    folders/
      {folderId}/
        - name: "Inbox"
        - parentId: null
        - isDefault: true
        - position: timestamp
        - createdAt: timestamp
        - updatedAt: timestamp

    items/
      {noteId}/
        - content: "plain text"
        - richContent: { ops: [...] }  // Quill Delta
        - title: "first line"
        - preview: "excerpt"
        - folderId: "<folder-id>"
        - createdAt: timestamp
        - updatedAt: timestamp
```

---

### 8. Kdy smazat debug logy

**Po úspěšném opravení odstraň:**
- `console.log` a `console.warn` z `subscribeNotes()`
- `console.log` z `onSnapshot` callbacks

**Ponechej pouze:**
- `console.error` pro production error logging

---

### 9. Kontakt pro budoucí já

Když tohle čteš za pár měsíců a poznámky nefungují:

1. **NEJDŘÍV** zkontroluj Console errors
2. Podívej se na sekci 1 a 2 v tomto dokumentu
3. Přidej debug logy (sekce 4)
4. Zkontroluj Firestore v Firebase Console
5. Zkontroluj že `shared/firebase.js` exportuje všechny potřebné funkce:
   - `onSnapshot`
   - `collection`
   - `query`
   - `where`
   - `orderBy`
   - `limit`

---

## Historie oprav

**2025-10-05:**
- ❌ ReferenceError: `updateArchitektCopyToolbarButton` - archivovaný modul
- ❌ NotFoundError: `requestSubmit(saveBtn)` - nevalidní submitter
- ✅ Oprava: zakomentované volání + requestSubmit() bez parametru
- ✅ Výsledek: Poznámky fungují, ukládají se a zobrazují

---

**Autor:** Claude + Michal
**Poslední update:** 2025-10-05
