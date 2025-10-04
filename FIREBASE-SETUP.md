# Firebase Setup Documentation

## 🔥 Firebase Configuration

**Project:** Central-Asset-Storage
**Project ID:** `central-asset-storage`
**Firebase SDK Version:** v10.12.0 (modular)
**Location:** `/shared/firebase.js`

### Config Object
```javascript
{
  apiKey: 'AIzaSyDdKzUd-QVHEdHMGl3kbuAKk4p6CjgkgzQ',
  authDomain: 'central-asset-storage.firebaseapp.com',
  projectId: 'central-asset-storage',
  storageBucket: 'central-asset-storage.appspot.com',
  messagingSenderId: '907874309868',
  appId: '1:907874309868:web:5354ee69d6212f3d9937c9'
}
```

---

## 📦 How to Use Firebase in ANY Module

### 1. HTML - Load Firebase Script

**CRITICAL:** Use absolute path from project root!

```html
<!-- In DAY73-cloud/grid-app-test.html -->
<script type="module" src="/DAY73-cloud/shared/firebase.js"></script>
```

**OR** if deploying to root:
```html
<script type="module" src="/shared/firebase.js"></script>
```

### 2. JavaScript - Access Firebase API

Firebase is available as **`window.firebase`** object.

#### ✅ CORRECT Pattern (Modular Firebase v10)

```javascript
// Check if Firebase is loaded
if (!window.firebase || !window.firebase.db) {
  console.error('Firebase not loaded');
  return;
}

// Destructure what you need
const { db, collection, addDoc, serverTimestamp } = window.firebase;

// Use it
await addDoc(collection(db, 'your-collection'), {
  field: 'value',
  createdAt: serverTimestamp()
});
```

#### ❌ WRONG Patterns (DO NOT USE)

```javascript
// ❌ Legacy API - doesn't work
firebase.firestore()
firebase.firestore().collection('...')

// ❌ ES module import - won't work in inline scripts
import { db } from './shared/firebase.js'
```

---

## 🗂️ Available Firebase Functions

From `window.firebase`:

### Firestore Database
- `db` - Firestore instance
- `collection(db, 'path')` - Get collection reference
- `doc(db, 'path', 'id')` - Get document reference
- `addDoc(collectionRef, data)` - Add new document
- `setDoc(docRef, data)` - Set document (create/overwrite)
- `getDoc(docRef)` - Get single document
- `getDocs(queryRef)` - Get multiple documents
- `updateDoc(docRef, data)` - Update document
- `deleteDoc(docRef)` - Delete document
- `onSnapshot(ref, callback)` - Real-time listener
- `query(collectionRef, ...constraints)` - Build query
- `where('field', 'op', value)` - Query filter
- `orderBy('field', 'direction')` - Sort results
- `limit(number)` - Limit results
- `serverTimestamp()` - Server timestamp
- `increment(number)` - Increment value
- `writeBatch(db)` - Batch write

### Storage
- `storage` - Storage instance
- `ref(storage, 'path')` - Get storage reference
- `uploadBytes(ref, blob)` - Upload file
- `uploadBytesResumable(ref, blob)` - Upload with progress
- `getDownloadURL(ref)` - Get download URL
- `listAll(ref)` - List files
- `getMetadata(ref)` - Get file metadata
- `deleteObject(ref)` - Delete file

### Authentication
- `auth` - Auth instance
- `onAuthStateChanged(auth, callback)` - Listen to auth state
- `signInAnonymously(auth)` - Sign in anonymously
- `signInWithPopup(auth, provider)` - Sign in with popup
- `signInWithRedirect(auth, provider)` - Sign in with redirect
- `getRedirectResult(auth)` - Get redirect result
- `signOut(auth)` - Sign out
- `GoogleAuthProvider` - Google auth provider

---

## 📝 Real-World Examples

### Example 1: Add Document to Firestore

```javascript
const { db, collection, addDoc, serverTimestamp } = window.firebase;

await addDoc(collection(db, 'kanban-cards'), {
  title: 'Task title',
  description: 'Task description',
  status: 'todo',
  createdAt: serverTimestamp()
});
```

### Example 2: Real-time Listener

```javascript
const { db, collection, query, orderBy, onSnapshot } = window.firebase;

const cardsQuery = query(
  collection(db, 'kanban-cards'),
  orderBy('createdAt', 'desc')
);

onSnapshot(cardsQuery, (snapshot) => {
  const cards = [];
  snapshot.forEach(doc => {
    cards.push({ id: doc.id, ...doc.data() });
  });
  renderCards(cards);
});
```

### Example 3: Update Document

```javascript
const { db, doc, updateDoc } = window.firebase;

await updateDoc(doc(db, 'kanban-cards', cardId), {
  status: 'done'
});
```

### Example 4: Upload Image to Storage

```javascript
const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;

const storageRef = ref(storage, `images/${filename}.png`);
await uploadBytes(storageRef, blob);
const downloadURL = await getDownloadURL(storageRef);
```

---

## 🚨 Common Errors & Solutions

### Error: "Firebase not loaded"

**Cause:** Script not loaded or wrong path
**Solution:** Check script tag path in HTML - must be absolute!

```html
<!-- ✅ CORRECT -->
<script type="module" src="/DAY73-cloud/shared/firebase.js"></script>

<!-- ❌ WRONG -->
<script type="module" src="../shared/firebase.js"></script>
```

### Error: "Expected first argument to collection() to be a CollectionReference"

**Cause:** Using legacy API (`firebase.firestore().collection()`)
**Solution:** Use modular API with `window.firebase`

```javascript
// ❌ WRONG
const db = firebase.firestore();
db.collection('cards').add({...});

// ✅ CORRECT
const { db, collection, addDoc } = window.firebase;
await addDoc(collection(db, 'cards'), {...});
```

### Error: "firebase.db is not a function"

**Cause:** Trying to call `db` as function
**Solution:** `db` is an object, use with `collection(db, 'path')`

```javascript
// ❌ WRONG
firebase.db('cards')

// ✅ CORRECT
const { db, collection } = window.firebase;
collection(db, 'cards')
```

---

## ✅ Checklist for New Modules

When creating a new module that uses Firebase:

1. ✅ Load Firebase script in HTML with **absolute path**
2. ✅ Check `window.firebase` exists before using
3. ✅ Destructure needed functions from `window.firebase`
4. ✅ Use modular API (NOT legacy `firebase.firestore()`)
5. ✅ Test in console: `console.log(window.firebase)` should show object

---

## 📚 Reference Links

- Firebase Modular SDK Docs: https://firebase.google.com/docs/web/modular-upgrade
- Firestore Docs: https://firebase.google.com/docs/firestore
- Storage Docs: https://firebase.google.com/docs/storage

---

**Last Updated:** 2025-10-04
**Maintainer:** Claude + Michal
