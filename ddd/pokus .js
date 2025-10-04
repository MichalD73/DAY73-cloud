import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    getDoc,
    setDoc,
    writeBatch,
    where,
    getDocs,
    limit,
    startAfter,
    arrayUnion,
    Timestamp // Přidáno pro získání časového razítka na klientovi
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// Import LabView (added)
import LabView from './src/views/LabView.jsx';

// Save status constants to avoid magic strings
export const SAVE_STATUS = { DIRTY: 'Neuloženo', SAVED: 'Uloženo', SAVING: 'Ukládám…', ERROR: 'Chyba' };

// Vaše Firebase konfigurace
const firebaseConfig = {
    apiKey: "AIzaSyDdKzUd-QVHEdHMGl3kbuAKk4p6CjgkgzQ",
    authDomain: "central-asset-storage.firebaseapp.com",
    projectId: "central-asset-storage",
    storageBucket: "central-asset-storage.appspot.com",
    messagingSenderId: "907874309868",
    appId: "1:907874309868:web:5354ee69d6212f3d9937c9"
};

// Inicializace Firebase služeb
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Use the app's default Storage bucket (implicit)
const storage = getStorage(app);
const functions = getFunctions(app);

// --- Pomocné funkce pro formátování ---
// Funkce escapeHtml byla odstraněna - nebyla používána

const formatTextForPreview = (text = '') => {
        if (!text) return '';
        let s = text; // necháme HTML neescapované kvůli vloženým tagům, ale linkujeme jen v textových částech

        // --- Markdown -> HTML (pořadí je důležité) ---
        // 1) Obrázky: ![alt](url)
        s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4" />');

        // 2) Tučné: **text** (přes více řádků)
        s = s.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');

        // 3) Kurzíva: *text* (nepovolit **, * * nebo uvnitř <strong>)
        s = s.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs, '<em>$1</em>');

        // 4) Nadpisy (základní): ## H2 / # H1
        s = s.replace(/^(#{2})\s+(.+)$/gm, '<h2>$2</h2>')
                 .replace(/^(#{1})\s+(.+)$/gm, '<h1>$2</h1>');

        // 5) Odkazy (www., http…): linkifikuj jen mimo HTML tagy/atributy
        const LINK_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'\]\}]+)([)\]\}.,])?/g;
        s = s
            .split(/(<[^>]+>)/g) // zachovej tagy, linkifikuj jen textové uzly
            .map(part => {
                if (part.startsWith('<')) return part;
                return part.replace(LINK_RE, (_, url, trail = '') => {
                    const href = url.startsWith('http') ? url : `https://${url}`;
                    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-orange-500 dark:text-cyan-400 hover:underline break-all">${url}</a>${trail}`;
                });
            })
            .join('');

        // 6) Nové řádky
        s = s.replace(/\n/g, '<br/>');

        return s;
};


// --- Helper pro skládání tříd ---
function cx(...a) {
    return a.filter(Boolean).join(" ");
}

// --- Badge komponenta (pill štítky) ---
function Badge({ children, tone = "slate", count = null, isActive = false }) {
    const tones = {
        slate:  "bg-slate-100  text-slate-700  border-slate-200",
        green:  "bg-green-100  text-green-700  border-green-200",
        amber:  "bg-amber-100  text-amber-700  border-amber-200",
        sky:    "bg-sky-100    text-sky-700    border-sky-200",
        violet: "bg-violet-100 text-violet-700 border-violet-200",
        rose:   "bg-rose-100   text-rose-700   border-rose-200",
    };
    
    const activeTones = {
        slate:  "bg-slate-200  text-slate-800  border-slate-300",
        green:  "bg-green-200  text-green-800  border-green-300",
        amber:  "bg-amber-200  text-amber-800  border-amber-300",
        sky:    "bg-sky-200    text-sky-800    border-sky-300",
        violet: "bg-violet-200 text-violet-800 border-violet-300",
        rose:   "bg-rose-200   text-rose-800   border-rose-300",
    };
    
    const currentTone = isActive ? activeTones[tone] : tones[tone];
    
    return (
        <span className={cx(
            "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-200 cursor-pointer hover:opacity-80",
            currentTone
        )}>
            {children}
            {count !== null && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/70 dark:bg-gray-800/70 rounded-full text-xs font-bold">
                    {count}
                </span>
            )}
        </span>
    );
}

// --- Komponenty pro ikony ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);
const LinkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>);
const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);
const ReclassifyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>);
const StarIcon = ({ isTop }) => (<svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isTop ? 'text-yellow-400 animate-pulse' : ''}`} style={isTop ? {filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.7))'} : {}}  fill={isTop ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const NoteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);
const SparkleIcon = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>);
const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7"/>
        <polyline points="22 6 12 16 2 6"/>
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
    </svg>
);

const PreviewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const SplitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);


const Modal = ({ isOpen, message, onConfirm, onCancel, type }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <p className="text-gray-800 dark:text-white text-lg mb-6">{message}</p>
                <div className="flex justify-end space-x-4">
                    {type === 'confirm' && (<button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-semibold transition-colors">Zrušit</button>)}
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-semibold transition-colors">OK</button>
                </div>
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, fileInputRef, handleImportCSV, isImporting, isReclassifying, handleReclassifyThreads, theme, handleThemeChange }) => {
    const [activeTab, setActiveTab] = useState('appearance');
    if (!isOpen) return null;
    const TabButton = ({ id, children }) => (
        <button onClick={() => setActiveTab(id)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === id ? 'bg-gray-200 dark:bg-gray-700 text-orange-500 dark:text-cyan-400 border-b-2 border-orange-500 dark:border-cyan-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {children}
        </button>
    );
    const skeletonContent = `
## Kostra Projektu: Dashboard Vláken

### 1. Nastavení
- [✓] Vzhled: Přepínání témat.
- [✓] Firebase: Zobrazení konfigurace.
- [✓] Manuál: Popis projektu.
- [✓] Nástroje: Import/Export (plánováno).
- [✓] Kostra Projektu: Tento dokument.

### 2. UI
- [✓] Plně responzivní layout.
- [✓] Přepínání pohledů (Vlákna / Poznámky / Prompty / Assistant).
- [✓] Formuláře pro přidání vláken, poznámek, promptů a asistentů.

### 3. Správa Vláken
- [✓] CRUD operace a připnutí.
- [✓] ✨ Generování názoru z odkazu pomocí Gemini API.
- [✓] 🚀 Změna kategorie pomocí Drag & Drop.

### 4. Rychlé Poznámky & Prompty & Assistant
- [✓] CRUD operace.
- [✓] Editor těla s automatickým ukládáním.
- [✓] ✨ Rozvinutí poznámky pomocí Gemini API.
- [✓] 🚀 Změna pořadí pomocí Drag & Drop.

### 5. Backend (Firebase)
- [✓] Kolekce: \`threads\`, \`quickNotes\`, \`prompts\`, \`assistants\`, \`userSettings\`.
    `;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-orange-500 dark:text-cyan-400">Nastavení</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none">&times;</button>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 px-4"><nav className="flex space-x-1"><TabButton id="appearance">Vzhled</TabButton><TabButton id="skeleton">Kostra Projektu</TabButton><TabButton id="manual">Manuál</TabButton><TabButton id="tools">Nástroje</TabButton><TabButton id="firebase">Firebase</TabButton></nav></div>
                <div className="overflow-y-auto p-6 text-gray-600 dark:text-gray-300 flex-grow">
                    {activeTab === 'appearance' && (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Barevné téma</h3>
                            <div className="flex space-x-4">
                                <button onClick={() => handleThemeChange('light')} className={`px-4 py-2 rounded-md font-semibold ${theme === 'light' ? 'bg-orange-500 text-white ring-2 ring-orange-300' : 'bg-gray-200 text-gray-800'}`}>Světlé</button>
                                <button onClick={() => handleThemeChange('dark')} className={`px-4 py-2 rounded-md font-semibold ${theme === 'dark' ? 'bg-cyan-500 text-gray-900 ring-2 ring-cyan-300' : 'bg-gray-700 text-white'}`}>Tmavé</button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'skeleton' && (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Kostra a Kontrolní Seznam</h3>
                            <pre className="whitespace-pre-wrap font-sans text-sm">{skeletonContent}</pre>
                        </div>
                    )}
                    {activeTab === 'manual' && (
                        <div className="space-y-6 whitespace-pre-wrap">
                            <div><h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Popis Projektu</h3><p>Toto je "Dashboard Vláken", aplikace pro evidenci a organizaci online zdrojů, nápadů nebo úkolů. Každé vlákno obsahuje textový popis, odkaz a je zařazeno do skupiny.</p></div>
                            <div><h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Základní Funkce</h3><ul className="list-disc list-inside space-y-1 pl-2"><li>Přidávání, úprava a mazání vláken a poznámek.</li><li>Seskupování vláken do kategorií.</li><li>Filtrování a vyhledávání.</li><li>Možnost "připnout" důležité vlákna.</li><li>Přepínání mezi světlým a tmavým vzhledem.</li></ul></div>
                        </div>
                    )}
                    {activeTab === 'tools' && (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Datové operace</h3>
                            <div className="flex space-x-4">
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                                <button onClick={() => fileInputRef.current.click()} disabled={isImporting || isReclassifying} className="flex items-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"><UploadIcon />{isImporting ? 'Importuji...' : 'Importovat CSV'}</button>
                                <button onClick={handleReclassifyThreads} disabled={isImporting || isReclassifying} className="flex items-center bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"><ReclassifyIcon />{isReclassifying ? 'Opravuji...' : 'Překlasifikovat'}</button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'firebase' && (
                        <div className="text-sm">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Technický Popis Projektu</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2">Klíčové technologie</h4>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>React (Hooks: useState, useEffect, useRef, useMemo)</li>
                                        <li><b>Firebase</b>
                                            <ul className="list-circle list-inside pl-5 mt-1 text-gray-500 dark:text-gray-400">
                                                <li>Authentication: anonymní přihlášení uživatelů</li>
                                                <li>Firestore: realtime NoSQL úlooriště (kolekce threads, quickNotes, prompts, userSettings)</li>
                                            </ul>
                                        </li>
                                        <li>Tailwind CSS pro styling + dark mode (přepínání třídou dark)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2">Struktura a funkce</h4>
                                    <ul className="list-disc list-inside pl-2 space-y-2">
                                        <li><b>Inicializace Firebase:</b> <span>initializeApp, getAuth, getFirestore; přihlášení anonymně v onAuthStateChanged. Pozn.: Firebase config může být v klientu, tajné klíče (např. Gemini) musí zůstat na serveru.</span></li>
                                        <li><b>UI komponenty:</b> <span>Lehké SVG ikony jako React komponenty, univerzální Modal, a SettingsModal se záložkami.</span></li>
                                        <li><b>Hlavní komponenta ThreadsDashboard:</b>
                                            <ul className="list-circle list-inside pl-5 mt-1 text-gray-500 dark:text-gray-400">
                                                <li><b>Stavy:</b> uživatel, vlákna, poznámky, filtry, formuláře, inline edit, téma, atd.</li>
                                                <li><b>Efekty:</b> přepnutí tématu, auth flow, realtime onSnapshot, debounce autosave.</li>
                                                <li><b>CRUD:</b> Plné operace pro vlákna a poznámky.</li>
                                                <li><b>Odvozená data (useMemo):</b> filtrace, seskupování, výběr aktivní poznámky.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2">Bezpečnost a škálování (doporučení)</h4>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Firestore Rules + scoping dotazů na authorId == uid; stránkování (limit, startAfter).</li>
                                        <li>Gemini volat přes server/proxy (skrytý klíč, rate-limit).</li>
                                        <li>U řazení přidat klientské createdAtMs = Date.now() pro stabilní UI do potvrzení serverTimestamp().</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700"><button onClick={onClose} className="px-5 py-2 rounded-md bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-semibold transition-colors">Zavřít</button></div>
            </div>
        </div>
    );
};

// Vylepšený ProjectBox s miniaturami obrázků a podporou hierarchie
const ProjectBox = ({ item, selected, onClick, onCreateSub, hasChildren, isExpanded, onToggleExpand }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    
    return (
        <div className="flex items-center gap-2">
            {/* Expand/Collapse button */}
            {hasChildren && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(item.id);
                    }}
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
            )}
            
            {/* Projekt button */}
            <button
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                onClick={() => onClick(item.id)}
                className={[
                    'py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none',
                    'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                    'flex items-center gap-2',
                    selected
                        ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                    isDragging ? 'opacity-0' : ''
                ].join(' ')}
                title={item.title}
            >
                {item.images && item.images.length > 0 && (
                    <img
                        src={item.images[0].url}
                        alt=""
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                        loading="lazy"
                    />
                )}
                <span className="truncate">{item.title}</span>
            </button>

            {/* Add subproject button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCreateSub(item.id);
                }}
                className="w-5 h-5 flex items-center justify-center text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full"
                title="Přidat podprojekt"
            >
                +
            </button>
        </div>
    );
};

const MainProjectBox = ({ item, selected, onClick, onCreateSub, hasChildren, isExpanded, onToggleExpand }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    
    const hasImage = item.images && item.images.length > 0;
    const previewImage = hasImage ? item.images[0].url : null;
    
    return (
        <div className="relative">
            <button
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                onClick={() => onClick(item.id)}
                className={[
                    'relative rounded-lg text-left w-40 h-24 flex flex-col select-none overflow-hidden',
                    'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                    'border-2',
                    selected
                        ? 'bg-orange-50 dark:bg-cyan-900/30 border-orange-400 dark:border-cyan-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    isDragging ? 'shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105' : ''
                ].join(' ')}
                title={item.title}
            >
                {/* Náhledový obrázek - horní 2/3 celé šířky */}
                {previewImage && (
                    <div 
                        className="w-full h-2/3 bg-cover bg-center rounded-t-lg"
                        style={{
                            backgroundImage: `url(${previewImage})`
                        }}
                    />
                )}
                
                {/* Obsah karty - spodní 1/3 s bílým pozadím */}
                <div className="w-full h-1/3 bg-white dark:bg-gray-800 rounded-b-lg px-3 py-2 flex items-center justify-start">
                    <h4 className="text-xs text-orange-600 dark:text-cyan-400 font-semibold truncate">
                        {item.title}
                    </h4>
                </div>
            </button>
            
            {/* Ovládací tlačítka */}
            <div className="absolute top-2 right-2 flex gap-1 z-20">
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(item.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm backdrop-blur-sm"
                        title={isExpanded ? "Sbalit podprojekty" : "Rozbalit podprojekty"}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateSub(item.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-xs bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm backdrop-blur-sm"
                    title="Přidat podprojekt"
                >
                    +
                </button>
            </div>
        </div>
    );
};

// Komponenta pro podprojekt
const SubProjectBox = ({ item, selected, onClick, onCreateSub, hasChildren, isExpanded, onToggleExpand }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    
    const hasImage = item.images && item.images.length > 0;
    const previewImage = hasImage ? item.images[0].url : null;
    
    return (
        <div className="relative">
            <button
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                onClick={() => onClick(item.id)}
                className={[
                    'relative rounded-lg text-left w-20 h-12 flex flex-col select-none overflow-hidden',
                    'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                    'border-2',
                    selected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    isDragging ? 'shadow-2xl ring-2 ring-blue-300 dark:ring-blue-300 scale-105' : ''
                ].join(' ')}
                title={item.title}
            >
                {/* Náhledový obrázek - horní 2/3 celé šířky */}
                {previewImage && (
                    <div 
                        className="w-full h-2/3 bg-cover bg-center rounded-t-lg"
                        style={{
                            backgroundImage: `url(${previewImage})`
                        }}
                    />
                )}
                
                {/* Obsah karty - spodní 1/3 s bílým pozadím */}
                <div className="w-full h-1/3 bg-white dark:bg-gray-800 rounded-b-lg px-1.5 py-1 flex items-center justify-start">
                    <h4 className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                        {item.title}
                    </h4>
                </div>
            </button>
            
            {/* Ovládací tlačítka */}
            <div className="absolute top-1 right-1 flex gap-1 z-20">
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(item.id);
                        }}
                        className="w-3 h-3 flex items-center justify-center text-xs bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm backdrop-blur-sm"
                        title={isExpanded ? "Sbalit podprojekty" : "Rozbalit podprojekty"}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateSub(item.id);
                    }}
                    className="w-3 h-3 flex items-center justify-center text-xs bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm backdrop-blur-sm"
                    title="Přidat podprojekt"
                >
                    +
                </button>
            </div>
        </div>
    );
};

const ProjectDropZone = ({ id, children, title, isEmpty }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    
    return (
        <div
            ref={setNodeRef}
            className={`min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-colors ${
                isOver 
                    ? 'border-orange-400 dark:border-cyan-400 bg-orange-50 dark:bg-cyan-900/20' 
                    : 'border-gray-300 dark:border-gray-600'
            } ${isEmpty ? 'flex items-center justify-center' : ''}`}
        >
            {isEmpty ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs mt-1">Přetáhněte sem projekty</div>
                </div>
            ) : (
                children
            )}
        </div>
    );
};

const ModernEditor = ({ content, onChange, mode, placeholder = "Začněte psát...", projectImages = [], cleanProjectBodyFn, onSave }) => {
    const textareaRef = useRef(null);
    const previewRef = useRef(null);

    // Synchronizace scrollování mezi editorem a náhledem
    const handleEditorScroll = useCallback(() => {
        if (mode === 'split' && textareaRef.current && previewRef.current) {
            const editor = textareaRef.current;
            const preview = previewRef.current;
            const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
            preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
        }
    }, [mode]);

    // Aplikování focus a cursor position
    const applyCursorPosition = useCallback(() => {
        if (textareaRef.current && window.editorCursorPosition !== undefined) {
            textareaRef.current.setSelectionRange(window.editorCursorPosition, window.editorCursorPosition);
            textareaRef.current.focus();
            delete window.editorCursorPosition;
        }
    }, []);

    useEffect(() => {
        applyCursorPosition();
    }, [applyCursorPosition]);

    // Klávesová zkratka pro uložení
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (onSave) {
                    onSave();
                }
            }
        };

        // Přidáme listener pouze když je textarea aktivní
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.addEventListener('keydown', handleKeyDown);
            return () => textarea.removeEventListener('keydown', handleKeyDown);
        }
    }, [onSave]);

    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="flex h-full">
            {/* Editor panel */}
            {(mode === 'edit' || mode === 'split') && (
                <div className={`${mode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onScroll={handleEditorScroll}
                        placeholder={placeholder}
                        autoFocus={mode === 'edit' || mode === 'split'}
                        className="w-full h-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none border-none outline-none font-mono text-sm leading-relaxed"
                        style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
                    />
                </div>
            )}

            {/* Preview panel */}
            {(mode === 'preview' || mode === 'split') && (
                <div className={`${mode === 'split' ? 'w-1/2' : 'w-full'} bg-white dark:bg-gray-900`}>
                    <div
                        ref={previewRef}
                        className="h-full p-4 overflow-auto prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                            __html: formatTextForPreview(
                                cleanProjectBodyFn ? cleanProjectBodyFn(content, projectImages) : content
                            ) 
                        }}
                    />
                </div>
            )}
        </div>
    );
};

// Moderní Editor komponenty
const EditorToolbar = ({ mode, onModeChange, saveStatus, lastSaved, onManualSave }) => {
    const [saveClicked, setSaveClicked] = useState(false);

    const handleManualSave = async () => {
        setSaveClicked(true);
        await onManualSave();
        setTimeout(() => setSaveClicked(false), 1000); // Reset po 1 sekundě
    };
    const getSaveStatusInfo = () => {
        switch (saveStatus) {
            case 'saving':
                return { 
                    icon: <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />, 
                    text: 'Ukládání...', 
                    color: 'text-orange-500' 
                };
            case 'saved':
                return { 
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>, 
                    text: lastSaved ? `Uloženo ${lastSaved.toLocaleTimeString()}` : 'Uloženo', 
                    color: 'text-green-500' 
                };
            case 'error':
                return { 
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>, 
                    text: 'Chyba při ukládání', 
                    color: 'text-red-500' 
                };
            case 'unsaved':
                return { 
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>, 
                    text: 'Neuloženo', 
                    color: 'text-yellow-500' 
                };
            default:
                return { 
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>, 
                    text: 'Uloženo', 
                    color: 'text-green-500' 
                };
        }
    };

    const { icon, text, color } = getSaveStatusInfo();

    return (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="flex items-center space-x-2">
                {/* Mode switcher */}
                <div className="flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
                    <button
                        onClick={() => onModeChange('edit')}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition ${
                            mode === 'edit' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Pouze editace (Ctrl+B)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={() => onModeChange('split')}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition ${
                            mode === 'split' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Editace + náhled"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6M9 16h6M9 8h6m-7 8h.01M2 8h.01M2 12h.01M2 16h.01" />
                        </svg>
                        <span>Split</span>
                    </button>
                    <button
                        onClick={() => onModeChange('preview')}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition ${
                            mode === 'preview' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Pouze náhled"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Preview</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                {/* Save status */}
                <div className={`flex items-center space-x-1 text-xs ${color}`}>
                    {icon}
                    <span>{text}</span>
                </div>
                
                {/* Manual save button */}
                <button
                    onClick={handleManualSave}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                        saveClicked 
                            ? 'bg-green-500 text-white transform scale-105' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title="Uložit nyní (Ctrl+S)"
                    disabled={saveStatus === 'saving'}
                >
                    {saveClicked ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : saveStatus === 'saving' ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    )}
                    <span>{saveClicked ? 'Uloženo!' : 'Uložit'}</span>
                </button>
            </div>
        </div>
    );
};

const ProjectImageItem = ({ id, img, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ 
            id,
            transition: {
                duration: 200,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            }
        });
    
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition: isDragging ? 'none' : (transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)'),
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };

    const isVideo = img.contentType?.startsWith('video/');
    
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={[
                'w-40 aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 cursor-grab active:cursor-grabbing',
                'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                'hover:shadow-lg transition-shadow duration-200',
                isDragging ? 'opacity-20 z-50' : 'opacity-100'
            ].join(' ')}
        >
            {isVideo ? (
                <video
                    src={img.url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    draggable={false}
                />
            ) : (
                <img
                    src={img.url}
                    alt={img.name || `image-${index}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                />
            )}
        </div>
    );
};

const NoteBox = ({ note, selected, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: note.id });
    const round = (v) => (typeof v === 'number' ? Math.round(v) : 0);
    const style = {
        transform: transform
            ? `translate3d(${round(transform.x)}px, ${round(transform.y)}px, 0)`
            : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(note.id)}
            className={[
                'py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none',
                'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                selected
                    ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                isDragging ? 'opacity-0' : ''
            ].join(' ')}
        >
            {note.title || note.text}
        </button>
    );
};

// Nová komponenta pro Strom, kopie NoteBox
const TreeNoteBox = ({ note, selected, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: note.id });
    const round = (v) => (typeof v === 'number' ? Math.round(v) : 0);
    const style = {
        transform: transform
            ? `translate3d(${round(transform.x)}px, ${round(transform.y)}px, 0)`
            : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(note.id)}
            className={[
                'py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none',
                'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                selected
                    ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                isDragging ? 'opacity-0' : ''
            ].join(' ')}
        >
            {note.title || note.text}
        </button>
    );
};

const PromptBox = ({ item, selected, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(item.id)}
            className={[
                'py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none',
                'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                selected
                    ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                isDragging ? 'opacity-0' : ''
            ].join(' ')}
            title={item.title}
        >
            {item.title}
        </button>
    );
};

const AssistantBox = ({ item, selected, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        willChange: transform ? 'transform' : undefined,
        backfaceVisibility: 'hidden'
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(item.id)}
            className={[
                'py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none',
                'transform-gpu antialiased [backface-visibility:hidden] will-change-[transform]',
                selected
                    ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                isDragging ? 'opacity-0' : ''
            ].join(' ')}
            title={item.title}
        >
            {item.title}
        </button>
    );
};

const ThreadBox = ({ thread, selected, onClick, visited }) => {
    return (
        <button
            onClick={onClick}
            className={`py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none transition-colors ${
                selected
                ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                : visited
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={thread.geminiOpinion}
        >
            {thread.geminiOpinion}
        </button>
    );
};

// --- Mapování původních názvů skupin na nové krátké názvy ---
const GROUP_MAP = {
    'Analýza & Data': 'Data',
    'Dashboardy & Vizualizace': 'Dashboard',
    'Design & UX': 'Design',
    'Marketing & Byznys': 'Business',
    'Programování & Technické': 'Coding',
    'Správa & Nástroje': 'Tools',
    'Obecné': 'Next',
};
const mapGroup = (g) => {
    const s = (g ?? '').trim();
    return GROUP_MAP[s] ?? s;
};

// Added helper: normalizedGroup to ensure consistent group normalization across filters and UI badges.
const normalizedGroup = (g = 'Next') => {
  if (!g) return 'Next';
  const map = {
    'next': 'Next',
    'now': 'Now',
    'later': 'Later',
    'idea': 'Idea',
    'ideas': 'Idea',
    'archive': 'Archive',
    'archived': 'Archive'
  };
  const k = String(g).trim().toLowerCase();
  return map[k] || g;
};


function ThreadsDashboard() {
    // --- Stavy komponenty ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [threads, setThreads] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('Vše');
    const [searchQuery, setSearchQuery] = useState('');
    const [newGeminiOpinion, setNewGeminiOpinion] = useState('');
    const [newLink, setNewLink] = useState('');
    const [newThreadGroup, setNewThreadGroup] = useState('Next');
    const [editingThreadId, setEditingThreadId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {}, type: 'alert' });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // useState pro import byl odstraněn - nebyl používán
    const isImporting = false; // konstanta místo useState - import funkce není implementována
    const [isReclassifying, setIsReclassifying] = useState(false);
    const fileInputRef = useRef(null);
    const [quickNotes, setQuickNotes] = useState([]);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteUrl, setNewNoteUrl] = useState('');
    const [duplicateCheck, setDuplicateCheck] = useState(null);
    const [currentView, setCurrentView] = useState('threads');
    const [theme, setTheme] = useState('light');
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [editingNoteBody, setEditingNoteBody] = useState('');
    const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.SAVED);
    const debounceTimeout = useRef(null);
    // openActionMenuId useState byl odstraněn - nebyl používán
    const [isGeneratingOpinion, setIsGeneratingOpinion] = useState(false);
    const [isExpandingNote, setIsExpandingNote] = useState(false);
    const [dragOverCategory, setDragOverCategory] = useState(null);
    // activeNoteId useState byl odstraněn - nebyl používán
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    // Sloučené poznámky - nové stavy
    const [newRecordType, setNewRecordType] = useState('poznámka'); // 'poznámka' nebo 'vlákno'
    const [recordTypeFilter, setRecordTypeFilter] = useState('vše'); // 'vše', 'poznámky', 'vlákna'
    const [recordGroupFilter, setRecordGroupFilter] = useState('Vše'); // Pro vlákna: 'Vše', 'Data', 'Dashboard', atd.

    // Stavy pro Prompty
    const [prompts, setPrompts] = useState([]);
    const [newPromptTitle, setNewPromptTitle] = useState('');
    const [selectedPromptId, setSelectedPromptId] = useState(null);
    const [editingPromptBody, setEditingPromptBody] = useState('');
    const [activePromptId, setActivePromptId] = useState(null);
    const promptFormRef = useRef(null);
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);

    // Stavy pro Assistant
    const [assistants, setAssistants] = useState([]);
    const [newAssistantTitle, setNewAssistantTitle] = useState('');
    const [selectedAssistantId, setSelectedAssistantId] = useState(null);
    const [editingAssistantBody, setEditingAssistantBody] = useState('');
    const [activeAssistantId, setActiveAssistantId] = useState(null);
    const assistantFormRef = useRef(null);
    const [isSavingAssistant, setIsSavingAssistant] = useState(false);
    const [isEditingAssistant, setIsEditingAssistant] = useState(false);

    // Stavy pro Project
    const [projects, setProjects] = useState([]);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [editingProjectBody, setEditingProjectBody] = useState('');
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [activeProjectImageId, setActiveProjectImageId] = useState(null);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const projectFormRef = useRef(null);
    const [isProjectImagesWide, setIsProjectImagesWide] = useState(false);
    const [projectUploads, setProjectUploads] = useState([]);
    const projectFileInputRef = useRef(null);
    const [isDndActive, setIsDndActive] = useState(false);

    // Moderní editor stavy
    const [projectEditorMode, setProjectEditorMode] = useState('edit'); // 'edit', 'preview', 'split'
    const [projectSaveStatus, setProjectSaveStatus] = useState(SAVE_STATUS.SAVED); // 'Uloženo', 'Neuloženo', 'Ukládám…', 'Chyba'
    const [projectLastSaved, setProjectLastSaved] = useState(null);
    const projectTextareaRef = useRef(null);
    const projectAutosaveTimeoutRef = useRef(null);

    // Hierarchie projektů - podprojekty
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [showAllMainSubprojects, setShowAllMainSubprojects] = useState(false);
    const [showAllRegularSubprojects, setShowAllRegularSubprojects] = useState(false);
    const [projectHierarchy, setProjectHierarchy] = useState({
        main: [],       // hlavní projekty (priority: true)
        regular: [],    // běžné projekty (priority: false, parentId: null)
        children: {}    // { parentId: [childProjects] }
    });

    // Záložkový systém pro projekty
    const [projectViewMode, setProjectViewMode] = useState('all'); // 'all', 'main', 'regular'

    // Vyčištění těla projektu od URL obrázků (legacy stav, kdy se adresy dostaly do textu)
    const cleanProjectBody = (body, imagesArr) => {
        try {
            let s = (body ?? '');
            const imgs = (imagesArr ?? []).filter(Boolean);

            const normalize = (u) => {
                try {
                    const noQuery = String(u).split('?')[0];
                    return noQuery;
                } catch {
                    return String(u || '');
                }
            };

            const imageBases = imgs
              .map(x => x.url)
              .filter(Boolean)
              .flatMap(u => [String(u), normalize(u)]);

            // 1) Odeber přesné i základní výskyty známých URL obrázků
            for (const u of imageBases) {
                const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                s = s.replace(new RegExp(esc, 'g'), '');
            }

            // 2) Odeber Markdown obrázky (obecně) i když mají jiné domény nebo jsou prázdné
            s = s.replace(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g, '');
            // 2b) Odeber prázdné Markdown obrázky ![název]()
            s = s.replace(/!\[[^\]]*\]\(\s*\)/g, '');

            // 3) Odeber řádky, které jsou jen URL (typicky obrázek)
            const IMG_EXT = /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i;
            s = s
                .split('\n')
                .filter(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return true; // prázdné řádky necháme, zredukujeme později
                    
                    // Odeber řádky s prázdnými Markdown obrázky ![název]()
                    if (/^!\[[^\]]*\]\(\s*\)$/.test(trimmed)) return false;
                    
                    const isUrl = /^(https?:\/\/\S+)$/.test(trimmed);
                    if (isUrl && (IMG_EXT.test(trimmed) || /firebasestorage|storage\.googleapis\.com/i.test(trimmed))) return false;
                    // Pokud řádek obsahuje některou ze známých imageBases, také ho odstraníme
                    if (imageBases.some(base => base && trimmed.includes(base))) return false;
                    return true;
                })
                .join('\n');

            // 4) Pouze zkrať trailing mezery (zachováme prázdné řádky)
            s = s.replace(/[ \t]+\n/g, '\n').replace(/\s+$/g, '');
            return s;
        } catch {
            return body ?? '';
        }
    };

    // Moderní editor utility funkce
    const preserveCursorPosition = (callback) => {
        const textarea = projectTextareaRef.current;
        if (!textarea) {
            callback();
            return;
        }
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        callback();
        
        // Obnovit cursor pozici v dalším frame
        requestAnimationFrame(() => {
            if (textarea && document.activeElement === textarea) {
                textarea.setSelectionRange(start, end);
            }
        });
    };

    // Organizace projektů do hierarchie
    const organizeProjectsHierarchy = (allProjects) => {
        const main = [];
        const regular = [];
        const children = {};

        allProjects.forEach(project => {
            if (project.parentId) {
                // Je to podprojekt
                if (!children[project.parentId]) {
                    children[project.parentId] = [];
                }
                children[project.parentId].push(project);
            } else if (project.priority) {
                // Hlavní projekt (priority)
                main.push(project);
            } else {
                // Běžný projekt
                regular.push(project);
            }
        });

        // Seřadíme podprojekty podle updatedAt
        Object.keys(children).forEach(parentId => {
            children[parentId].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        });

        return { main, regular, children };
    };

    // Funkce pro rozbalování/sbalování projektů
    const toggleProjectExpand = (projectId) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    // Funkce pro rozbalování/sbalování všech podprojektů
    const toggleAllMainSubprojects = () => {
        const newState = !showAllMainSubprojects;
        setShowAllMainSubprojects(newState);
        
        if (newState) {
            // Rozbal všechny hlavní projekty, které mají podprojekty
            const newExpanded = new Set(expandedProjects);
            projectHierarchy.main.forEach(mainProject => {
                if (projectHierarchy.children[mainProject.id] && projectHierarchy.children[mainProject.id].length > 0) {
                    newExpanded.add(mainProject.id);
                }
            });
            setExpandedProjects(newExpanded);
        } else {
            // Sbal všechny hlavní projekty
            const newExpanded = new Set(expandedProjects);
            projectHierarchy.main.forEach(mainProject => {
                newExpanded.delete(mainProject.id);
            });
            setExpandedProjects(newExpanded);
        }
    };

    const toggleAllRegularSubprojects = () => {
        const newState = !showAllRegularSubprojects;
        setShowAllRegularSubprojects(newState);
        
        if (newState) {
            // Rozbal všechny běžné projekty, které mají podprojekty
            const newExpanded = new Set(expandedProjects);
            projectHierarchy.regular.forEach(regularProject => {
                if (projectHierarchy.children[regularProject.id] && projectHierarchy.children[regularProject.id].length > 0) {
                    newExpanded.add(regularProject.id);
                }
            });
            setExpandedProjects(newExpanded);
        } else {
            // Sbal všechny běžné projekty
            const newExpanded = new Set(expandedProjects);
            projectHierarchy.regular.forEach(regularProject => {
                newExpanded.delete(regularProject.id);
            });
            setExpandedProjects(newExpanded);
        }
    };

    // Funkce pro klik na projekt - automaticky rozbalí podprojekty
    const handleProjectClick = (projectId) => {
        setSelectedProjectId(projectId);
        
        // Pokud projekt má podprojekty, automaticky ho rozbal
        if (projectHierarchy.children[projectId] && projectHierarchy.children[projectId].length > 0) {
            setExpandedProjects(prev => {
                const newSet = new Set(prev);
                newSet.add(projectId);
                return newSet;
            });
        }
    };

    // Funkce pro vytvoření podprojektu
    const createSubProject = async (parentId) => {
        if (!user) return;
        
        try {
            const parentProject = projects.find(p => p.id === parentId);
            if (!parentProject) return;

            const newSubProject = {
                title: 'Nový podprojekt',
                body: '',
                parentId: parentId,
                priority: false, // podprojekty nemohou být priority
                position: Date.now(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                images: []
            };

            await addDoc(collection(db, 'projects'), newSubProject);
            
            // Automaticky rozbal rodičovský projekt
            setExpandedProjects(prev => new Set([...prev, parentId]));
            
        } catch (error) {
            console.error('Chyba při vytváření podprojektu:', error);
        }
    };

    const handleProjectEditorChange = (newValue) => {
        preserveCursorPosition(() => {
            setEditingProjectBody(newValue);
            setProjectSaveStatus('unsaved');
            
            // Clear předchozí timeout a nastav nový
            clearTimeout(projectAutosaveTimeoutRef.current);
            projectAutosaveTimeoutRef.current = setTimeout(() => {
                handleProjectAutosave();
            }, 2000); // 2 sekundy pro komfortní psaní
        });
    };

    const handleProjectAutosave = async () => {
        if (!selectedProjectId || projectSaveStatus === 'saving') return;
        
        setProjectSaveStatus('saving');
        try {
            const raw = (editingProjectBody ?? '').replace(/\r\n/g, '\n');
            const firstLine = (raw.split('\n')[0] || '').trim();
            const patch = { body: editingProjectBody };
            if (firstLine) patch.title = firstLine;
            
            await updateDoc(doc(db, 'projects', selectedProjectId), patch);
            setProjectSaveStatus('saved');
            setProjectLastSaved(new Date());
        } catch (error) {
            console.error('Autosave chyba:', error);
            setProjectSaveStatus('error');
        }
    };

    const handleProjectManualSave = async () => {
        clearTimeout(projectAutosaveTimeoutRef.current);
        await handleProjectAutosave();
    };

    // handleProjectKeyboardShortcuts byla odstraněna - nebyla používána

    // Stavy pro "Strom" modul
    const [treeNotes, setTreeNotes] = useState([]);
    const [newTreeNoteTitle, setNewTreeNoteTitle] = useState('');
    const [selectedTreeNoteId, setSelectedTreeNoteId] = useState(null);
    const [editingTreeNoteBody, setEditingTreeNoteBody] = useState('');
    const [activeTreeNoteId, setActiveTreeNoteId] = useState(null);
    const [treeNoteSearchQuery, setTreeNoteSearchQuery] = useState('');
    const [isSavingTreeNote, setIsSavingTreeNote] = useState(false);
    const treeNoteFormRef = useRef(null);

    // Nový stav pro imagesTool
    const [images, setImages] = useState([]);

    // Stavy pro vyhledávání v poznámkách
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    
    // Helper funkce pro normalizaci skupin (musí být před useMemo)
    const normalizedGroup = (g) => mapGroup(g || 'Next');
    
    // Kombinované vyhledávání a filtrování pro sloučené poznámky, vlákna a projekty
    const unifiedRecordsResults = useMemo(() => {
        const q = noteSearchQuery.trim().toLowerCase();
        
        // Příprava poznámek s typem
        let processedNotes = quickNotes.map(note => ({
            ...note,
            recordType: 'poznámka',
            displayTitle: note.title || note.text,
            searchableContent: `${note.title || note.text || ''} ${note.body || ''} ${note.url || ''}`.toLowerCase()
        }));
        
        // Příprava vláken s typem
        let processedThreads = threads.map(thread => ({
            ...thread,
            recordType: 'vlákno',
            displayTitle: thread.geminiOpinion,
            searchableContent: `${thread.geminiOpinion || ''} ${thread.link || ''} ${thread.group || ''}`.toLowerCase()
        }));
        
        // Příprava projektů s typem
        let processedProjects = projects.map(project => ({
            ...project,
            recordType: 'projekt',
            displayTitle: project.title,
            searchableContent: `${project.title || ''} ${project.body || ''}`.toLowerCase()
        }));
        
        // Kombinace všech záznamů
        let allRecords = [...processedNotes, ...processedThreads, ...processedProjects];
        
        // Filtrování podle typu
        if (recordTypeFilter === 'poznámky') {
            allRecords = allRecords.filter(r => r.recordType === 'poznámka');
        } else if (recordTypeFilter === 'vlákna') {
            allRecords = allRecords.filter(r => r.recordType === 'vlákno');
        } else if (recordTypeFilter === 'projekty') {
            allRecords = allRecords.filter(r => r.recordType === 'projekt');
        }
        
        // Filtrování vláken podle skupiny
        if (recordGroupFilter !== 'Vše') {
            allRecords = allRecords.filter(r => 
                r.recordType !== 'vlákno' || normalizedGroup(r.group) === recordGroupFilter
            );
        }
        
        // Textové vyhledávání
        if (q) {
            allRecords = allRecords.filter(r => {
                if (r.recordType === 'vlákno') {
                    // Pro vlákna - pokročilé vyhledávání včetně posledních 20 znaků URL
                    return r.searchableContent.includes(q) || 
                           (r.link && r.link.slice(-20).toLowerCase().includes(q));
                } else {
                    // Pro poznámky a projekty - standardní vyhledávání
                    return r.searchableContent.includes(q);
                }
            });
        }
        
        return {
            allRecords,
            notes: allRecords.filter(r => r.recordType === 'poznámka'),
            threads: allRecords.filter(r => r.recordType === 'vlákno'),
            projects: allRecords.filter(r => r.recordType === 'projekt'),
            total: allRecords.length
        };
    }, [quickNotes, threads, projects, noteSearchQuery, recordTypeFilter, recordGroupFilter]);

    const filteredNotes = unifiedRecordsResults.notes;

    useEffect(() => {
      if (selectedNoteId && !filteredNotes.some(n => n.id === selectedNoteId)) {
        setSelectedNoteId(null);
      }
    }, [filteredNotes, selectedNoteId]);

    const isNotesSearchActive = noteSearchQuery.trim() !== '';
    const [isSavingNote, setIsSavingNote] = useState(false);
    const noteFormRef = useRef(null);

    // --- Prompts search (MVP) ---
    const [promptSearchQuery, setPromptSearchQuery] = useState('');
    const filteredPrompts = useMemo(() => {
        const q = promptSearchQuery.trim().toLowerCase();
        if (!q) return prompts;
        return prompts.filter(p =>
            ((p.title || '').toLowerCase().includes(q)) ||
            ((p.body || '').toLowerCase().includes(q))
        );
    }, [prompts, promptSearchQuery]);

    useEffect(() => {
        if (selectedPromptId && !filteredPrompts.some(p => p.id === selectedPromptId)) {
            setSelectedPromptId(null);
        }
    }, [filteredPrompts, selectedPromptId]);

    const isPromptsSearchActive = promptSearchQuery.trim() !== '';

    // --- Assistant search (MVP) ---
    const [assistantSearchQuery, setAssistantSearchQuery] = useState('');
    const filteredAssistants = useMemo(() => {
        const q = assistantSearchQuery.trim().toLowerCase();
        if (!q) return assistants;
        return assistants.filter(a =>
            ((a.title || '').toLowerCase().includes(q)) ||
            ((a.body || '').toLowerCase().includes(q))
        );
    }, [assistants, assistantSearchQuery]);

    useEffect(() => {
        if (selectedAssistantId && !filteredAssistants.some(a => a.id === selectedAssistantId)) {
            setSelectedAssistantId(null);
        }
    }, [filteredAssistants, selectedAssistantId]);

    const isAssistantSearchActive = assistantSearchQuery.trim() !== '';

    // --- Project search (MVP) ---
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const isProjectsSearchActive = projectSearchQuery.trim() !== '';
    
    // Unified search pro projekty (projekty + poznámky + vlákna)
    const [projectUnifiedSearchQuery, setProjectUnifiedSearchQuery] = useState('');
    const [projectRecordTypeFilter, setProjectRecordTypeFilter] = useState('vše'); // 'vše', 'projekty', 'poznámky', 'vlákna'
    const [projectRecordGroupFilter, setProjectRecordGroupFilter] = useState('Vše'); // Pro vlákna
    
    // Unified records pro projekty - kombinace všech záznamů s prioritou projektů
    const projectUnifiedRecordsResults = useMemo(() => {
        const q = projectUnifiedSearchQuery.trim().toLowerCase();
        
        // Příprava projektů s typem (priorita)
        let processedProjects = projects.map(project => ({
            ...project,
            recordType: 'projekt',
            displayTitle: project.title,
            searchableContent: `${project.title || ''} ${project.body || ''}`.toLowerCase()
        }));
        
        // Příprava poznámek s typem
        let processedNotes = quickNotes.map(note => ({
            ...note,
            recordType: 'poznámka',
            displayTitle: note.title || note.text,
            searchableContent: `${note.title || note.text || ''} ${note.body || ''} ${note.url || ''}`.toLowerCase()
        }));
        
        // Příprava vláken s typem
        let processedThreads = threads.map(thread => ({
            ...thread,
            recordType: 'vlákno',
            displayTitle: thread.geminiOpinion,
            searchableContent: `${thread.geminiOpinion || ''} ${thread.link || ''} ${thread.group || ''}`.toLowerCase()
        }));
        
        // Kombinace všech záznamů - projekty nejdříve
        let allRecords = [...processedProjects, ...processedNotes, ...processedThreads];
        
        // Filtrování podle typu
        if (projectRecordTypeFilter === 'projekty') {
            allRecords = allRecords.filter(r => r.recordType === 'projekt');
        } else if (projectRecordTypeFilter === 'poznámky') {
            allRecords = allRecords.filter(r => r.recordType === 'poznámka');
        } else if (projectRecordTypeFilter === 'vlákna') {
            allRecords = allRecords.filter(r => r.recordType === 'vlákno');
        }
        
        // Filtrování vláken podle skupiny
        if (projectRecordGroupFilter !== 'Vše') {
            allRecords = allRecords.filter(r => 
                r.recordType !== 'vlákno' || normalizedGroup(r.group) === projectRecordGroupFilter
            );
        }
        
        // Textové vyhledávání
        if (q) {
            allRecords = allRecords.filter(r => {
                if (r.recordType === 'vlákno') {
                    // Pro vlákna - pokročilé vyhledávání včetně posledních 20 znaků URL
                    return r.searchableContent.includes(q) || 
                           (r.link && r.link.slice(-20).toLowerCase().includes(q));
                } else {
                    // Pro poznámky a projekty - standardní vyhledávání
                    return r.searchableContent.includes(q);
                }
            });
        }
        
        return {
            allRecords,
            projects: allRecords.filter(r => r.recordType === 'projekt'),
            notes: allRecords.filter(r => r.recordType === 'poznámka'),
            threads: allRecords.filter(r => r.recordType === 'vlákno'),
            total: allRecords.length
        };
    }, [projects, quickNotes, threads, projectUnifiedSearchQuery, projectRecordTypeFilter, projectRecordGroupFilter, normalizedGroup]);
    
    const filteredProjects = useMemo(() => {
        const q = projectSearchQuery.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter(p =>
            ((p.title || '').toLowerCase().includes(q)) ||
            ((p.body || '').toLowerCase().includes(q))
        );
    }, [projects, projectSearchQuery]);

    useEffect(() => {
        if (selectedProjectId && !filteredProjects.some(p => p.id === selectedProjectId)) {
            setSelectedProjectId(null);
        }
    }, [filteredProjects, selectedProjectId]);

    // --- Threads search & filters (MVP) ---
    const [threadSearchQuery, setThreadSearchQuery] = useState('');
    const [threadGroupFilter, setThreadGroupFilter] = useState('Vše'); // Vše, Data, Dashboard, Design, Business, Coding, Tools, Next
    const [visitedThreadIds, setVisitedThreadIds] = useState(() => new Set());

    useEffect(() => {
        setVisitedThreadIds(new Set());
    }, [currentView]);

    useEffect(() => {
        if (currentView === 'threadsModule') {
            setVisitedThreadIds(new Set());
        }
    }, [threadGroupFilter, threadSearchQuery]);


    // počty pro chipy skupin (stejné zdroje jako na hlavní straně)
    const threadGroupCounts = useMemo(() => {
        const counts = { Vše: threads.length, Data:0, Dashboard:0, Design:0, Business:0, Coding:0, Tools:0, Next:0 };
        threads.forEach(t => {
            const g = normalizedGroup(t.group);
            if (counts[g] !== undefined) counts[g] += 1;
        });
        return counts;
    }, [threads]);

    // Helper funkce pro formatování textu (přesunuto z useMemo kvůli unreachable code)
    const formatTextForPreview = (text = '') => {
        if (!text) return '';
        let s = text; // necháme HTML neescapované kvůli vloženým tagům, ale linkujeme jen v textových částech

        // --- Markdown -> HTML (pořadí je důležité) ---
        // 1) Obrázky: ![alt](url)
        s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4" />');

        // 2) Tučné: **text** (přes více řádků)
        s = s.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');

        // 3) Kurzíva: *text* (nepovolit **, * * nebo uvnitř <strong>)
        s = s.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs, '<em>$1</em>');

        // 4) Nadpisy (základní): ## H2 / # H1
        s = s.replace(/^(#{2})\s+(.+)$/gm, '<h2>$2</h2>')
                 .replace(/^(#{1})\s+(.+)$/gm, '<h1>$2</h1>');

        // 5) Odkazy (www., http…): linkifikuj jen mimo HTML tagy/atributy
        const LINK_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'\]})]+)([)\]}.,])?/g;
        const IMG_EXT_RE = /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i;
        const isImageUrl = (u) => IMG_EXT_RE.test(u) || /firebasestorage|storage\.googleapis\.com/i.test(u);
        s = s
            .split(/(<[^>]+>)/g) // zachovej tagy, linkifikuj jen textové uzly
            .map(part => {
                if (part.startsWith('<')) return part;
                return part.replace(LINK_RE, (_, url, trail = '') => {
                    const href = url.startsWith('http') ? url : `https://${url}`;
                    if (isImageUrl(href)) {
                        return `<img src="${href}" alt="" class="rounded-lg my-4 max-w-full" />${trail || ''}`;
                    }
                    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-orange-500 dark:text-cyan-400 hover:underline break-all">${url}</a>${trail || ''}`;
                });
            })
            .join('');

        // 6) Nové řádky
        s = s.replace(/\n/g, '<br/>');

        return s;
    };

    const filteredThreadsModule = useMemo(() => {
        const q = threadSearchQuery.trim().toLowerCase();
        return threads.filter(t => {
            // group match
            const gOK = (threadGroupFilter === 'Vše') || (normalizedGroup(t.group) === threadGroupFilter);
            // text match (geminiOpinion + link) - vylepšené hledání v URL
            const opinion = (t.geminiOpinion || '').toLowerCase();
            const url = t.link || '';
            const urlLower = url.toLowerCase();
            const last20Chars = url.slice(-20).toLowerCase();
            
            const qOK = q ? (
                opinion.includes(q) || 
                urlLower.includes(q) || 
                last20Chars.includes(q)
            ) : true;
            return gOK && qOK;
        }).sort((a,b) => {
            // zachovej preferenci TOP nahoře (stejně jako stávající logika, ale správně)
            if (!!a.isTop === !!b.isTop) return 0;
            return a.isTop ? -1 : 1;
        });
    }, [threads, threadGroupFilter, threadSearchQuery]);

    // Výběr aktivního boxu vlákna (analogicky k selectedPromptId/selectedAssistantId)
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    useEffect(() => {
        if (selectedThreadId && !filteredThreadsModule.some(t => t.id === selectedThreadId)) {
            setSelectedThreadId(null);
        }
    }, [filteredThreadsModule, selectedThreadId]);

    const isThreadsSearchActive = threadSearchQuery.trim() !== '';

    // --- Kategorie pro filtrování
    const categories = [
      { id: "data", label: "Data" },
      { id: "dashboard", label: "Dashboard" },
      { id: "design", label: "Design" },
      { id: "business", label: "Business" },
      { id: "coding", label: "Coding" },
      { id: "tools", label: "Tools" },
      { id: "next", label: "Next" },
    ];

    // --- Vyhledávání pro Strom ---
    const filteredTreeNotes = useMemo(() => {
        const q = treeNoteSearchQuery.trim().toLowerCase();
        if (!q) return treeNotes;
        return treeNotes.filter(n =>
            ((n.title || n.text || '').toLowerCase().includes(q)) ||
            ((n.body || '').toLowerCase().includes(q))
        );
    }, [treeNotes, treeNoteSearchQuery]);

    useEffect(() => {
        if (selectedTreeNoteId && !filteredTreeNotes.some(n => n.id === selectedTreeNoteId)) {
            setSelectedTreeNoteId(null);
        }
    }, [filteredTreeNotes, selectedTreeNoteId]);
    
    const isTreeNotesSearchActive = treeNoteSearchQuery.trim() !== '';


    // --- Utility funkce ---
    // Normalizace priority hodnot - konzistence boolean/string
    const isMainProject = (project) => {
        if (!project) return false;
        return project.priority === true || project.priority === 'main';
    };

    // Univerzální reorder pro všechny drag&drop operace
    const reorder = async (list, activeId, overId, setList, collectionName) => {
        if (!overId || activeId === overId) return;
        
        const oldIndex = list.findIndex(x => x.id === activeId);
        const newIndex = list.findIndex(x => x.id === overId);
        
        if (oldIndex < 0 || newIndex < 0) return;
        
        const reordered = arrayMove(list, oldIndex, newIndex);
        setList(reordered);
        
        const batch = writeBatch(db);
        reordered.forEach((x, i) => {
            batch.update(doc(db, collectionName, x.id), { position: i });
        });
        
        try {
            await batch.commit();
        } catch (e) {
            console.error(`Reorder error for ${collectionName}:`, e);
            showAlert(`Nepodařilo se uložit nové pořadí ${collectionName}.`);
        }
    };

    // --- Efekty ---
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const settingsRef = doc(db, 'userSettings', currentUser.uid);
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    setTheme(docSnap.data().theme || 'light');
                } else {
                    await setDoc(settingsRef, { theme: 'light' });
                }
            } else {
                signInAnonymously(auth).catch(error => console.error("Chyba při přihlášení:", error));
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Chyba při načítání vláken:", error));
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'quickNotes'), orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQuickNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Chyba při načítání poznámek:", error));
        return () => unsubscribe();
    }, [user]);

    // Načítání dat pro Strom
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'treeNotes'), orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTreeNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Chyba při načítání stromu:", error));
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'prompts'), orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Chyba při načítání promptů:", error));
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'assistants'), orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAssistants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Chyba při načítání asistentů:", error));
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'projects'), orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(allProjects);
            
            // Aktualizuj hierarchii
            const hierarchy = organizeProjectsHierarchy(allProjects);
            setProjectHierarchy(hierarchy);
        }, (error) => console.error("Chyba při načítání projektů:", error));
        return () => unsubscribe();
    }, [user]);

    // Nový useEffect pro imagesTool
    useEffect(() => {
      if (!user || currentView !== 'imagesTool') return;
      const qRef = query(
        collection(db, 'imageTools'),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(qRef, snap => {
        setImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }, [user, currentView]);

    
    const migratedRef = useRef(false);
    useEffect(() => {
      if (!user || !prompts?.length || migratedRef.current) return;
      const toFix = prompts.filter(p =>
        typeof p.body === 'string' && typeof p.title === 'string' && !p.body.startsWith(p.title)
      );
      if (!toFix.length) return;
    
      (async () => {
        try {
          const batch = writeBatch(db);
          toFix.forEach(p => batch.update(doc(db, 'prompts', p.id), { body: `${p.title}\n${p.body}` }));
          await batch.commit();
          migratedRef.current = true;
        } catch (e) {
          console.error('Migrace promptů selhala:', e);
        }
      })();
    }, [user, prompts]);

    const selectedNote = useMemo(() => filteredNotes.find(note => note.id === selectedNoteId), [selectedNoteId, filteredNotes]);
    const selectedTreeNote = useMemo(() => treeNotes.find(note => note.id === selectedTreeNoteId), [selectedTreeNoteId, treeNotes]);
    const selectedPrompt = useMemo(() => prompts.find(prompt => prompt.id === selectedPromptId), [selectedPromptId, prompts]);
    const selectedAssistant = useMemo(() => assistants.find(a => a.id === selectedAssistantId), [selectedAssistantId, assistants]);
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);

    // Rozdělení projektů na dvě skupiny podle priority a hierarchie
    const { mainProjects, regularProjects } = useMemo(() => {
        if (isProjectsSearchActive) {
            // Při vyhledávání zobrazujeme pouze ploché výsledky
            return {
                mainProjects: filteredProjects.filter(p => p.priority === true && !p.parentId),
                regularProjects: filteredProjects.filter(p => p.priority !== true && !p.parentId)
            };
        } else {
            // Normální zobrazení s hierarchií
            return {
                mainProjects: projectHierarchy.main,
                regularProjects: projectHierarchy.regular
            };
        }
    }, [projects, filteredProjects, isProjectsSearchActive, projectHierarchy]);
    

    useEffect(() => {
        if (selectedNote) {
            setEditingNoteBody(selectedNote.body || '');
            setSaveStatus('Uloženo');
        } else {
            setEditingNoteBody('');
        }
    }, [selectedNote]);

    useEffect(() => {
        if (selectedTreeNote) {
            setEditingTreeNoteBody(selectedTreeNote.body || '');
            setSaveStatus('Uloženo');
        } else {
            setEditingTreeNoteBody('');
        }
    }, [selectedTreeNote]);

    useEffect(() => {
        if (selectedPrompt) {
            setEditingPromptBody(selectedPrompt.body || '');
            setIsEditingPrompt(false);
            setSaveStatus('Uloženo');
        } else {
            setEditingPromptBody('');
        }
    }, [selectedPrompt]);
    
    useEffect(() => {
        if (selectedAssistant) {
            setEditingAssistantBody(selectedAssistant.body || '');
            setIsEditingAssistant(false);
            setSaveStatus('Uloženo');
        } else {
            setEditingAssistantBody('');
        }
    }, [selectedAssistant]);

    useEffect(() => {
        if (selectedProject) {
            const original = selectedProject.body || '';
            const cleaned = cleanProjectBody(original, selectedProject.images || []);
            setEditingProjectBody(cleaned);
            setSaveStatus(cleaned !== original ? 'Neuloženo' : 'Uloženo');
        } else {
            setEditingProjectBody('');
        }
    }, [selectedProject]);

    useEffect(() => {
        if (saveStatus === 'Neuloženo') {
            clearTimeout(debounceTimeout.current);
            if (currentView === 'notes' || currentView === 'threads') {
                debounceTimeout.current = setTimeout(() => handleUpdateNoteBody(), 3000);
            } else if (currentView === 'tree') {
                debounceTimeout.current = setTimeout(() => handleUpdateTreeNoteBody(), 3000);
            } else if (currentView === 'prompts') {
                debounceTimeout.current = setTimeout(() => handleUpdatePromptBody(), 3000);
            } else if (currentView === 'assistant') {
                debounceTimeout.current = setTimeout(() => handleUpdateAssistantBody(), 3000);
            } else if (currentView === 'projects') {
                // V projektech může být vybraná poznámka nebo projekt
                if (selectedNoteId) {
                    debounceTimeout.current = setTimeout(() => handleUpdateNoteBody(), 3000);
                } else {
                    debounceTimeout.current = setTimeout(() => handleUpdateProjectBody(), 3000);
                }
            }
        }
        return () => clearTimeout(debounceTimeout.current);
    }, [editingNoteBody, editingTreeNoteBody, editingPromptBody, editingAssistantBody, editingProjectBody, saveStatus]);


    // --- CRUD a pomocné funkce ---
    const showAlert = (message) => setModalState({ isOpen: true, message, type: 'alert', onConfirm: () => setModalState({ isOpen: false }) });
    
    // 🚀 MODERNIZACE: Použití Firebase Cloud Functions místo client-side API volání
    const callGeminiAPI = async (prompt) => {
        try {
            const callGeminiFunction = httpsCallable(functions, 'callGeminiAPI');
            const result = await callGeminiFunction({ prompt });
            
            if (result.data.success) {
                return result.data.text;
            } else {
                throw new Error('API volání nebylo úspěšné');
            }
        } catch (error) {
            console.error("Chyba při volání Gemini API přes Cloud Function:", error);
            showAlert("Došlo k chybě při komunikaci s AI.");
            return null;
        }
    };

    const handleGenerateOpinion = async () => {
        if (!newLink.trim()) {
            showAlert("Nejprve zadejte platný odkaz.");
            return;
        }
        setIsGeneratingOpinion(true);
        const prompt = `Jsi asistent, který pomáhá kategorizovat a shrnovat webové odkazy. Na základě následující URL adresy napiš velmi krátký, výstižný názor nebo shrnutí (maximálně 10 slov), o čem stránka pravděpodobně je. URL: ${newLink}`;
        const opinion = await callGeminiAPI(prompt);
        if (opinion) setNewGeminiOpinion(opinion);
        setIsGeneratingOpinion(false);
    };

    const handleExpandNote = async () => {
        if (!selectedNote) return;
        setIsExpandingNote(true);
        const prompt = `Jsi kreativní asistent. Rozviň následující poznámku. Přidej další detaily, navrhni další kroky nebo rozepiš myšlenku do souvislého textu. Zachovej původní text a plynule na něj navaž.\n\nTitul poznámky: "${selectedNote.title || selectedNote.text}"\nAktuální obsah:\n"${editingNoteBody}"\n\nPokračuj v textu:`;
        const expandedText = await callGeminiAPI(prompt);
        if (expandedText) {
            setEditingNoteBody(expandedText);
            setSaveStatus('Neuloženo');
        }
        setIsExpandingNote(false);
    };
    
    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        if (user) {
            const settingsRef = doc(db, 'userSettings', user.uid);
            try { await setDoc(settingsRef, { theme: newTheme }, { merge: true }); } 
            catch (error) { console.error("Chyba při ukládání tématu:", error); }
        }
    };
    
    const handleChangeGroup = async (threadId, newGroup) => {
      if (newGroup === null || newGroup.trim() === '') return;
      const normalized = mapGroup(newGroup);
      try {
        await updateDoc(doc(db, 'threads', threadId), { group: normalized });
      } catch (error) {
        console.error("Chyba při aktualizaci skupiny:", error);
        showAlert("Chyba při změně skupiny.");
      }
    };

    const handleToggleTop = async (threadId, currentStatus) => {
        try { await updateDoc(doc(db, 'threads', threadId), { isTop: !currentStatus }); } 
        catch (error) { console.error("Chyba při označování TOP vlákna:", error); showAlert("Nepodařilo se označit vlákno."); }
    };
    const handleStartEditing = (thread) => { setEditingThreadId(thread.id); setEditingText(thread.geminiOpinion); };
    const handleCancelEditing = () => { setEditingThreadId(null); setEditingText(''); };
    const handleUpdateOpinion = async (threadId) => {
        if (editingText.trim() === '') { handleCancelEditing(); return; }
        try { await updateDoc(doc(db, 'threads', threadId), { geminiOpinion: editingText.trim() }); } 
        catch (error) { console.error("Chyba při úpravě názvu vlákna:", error); showAlert("Chyba při úpravě názvu vlákna."); } 
        finally { handleCancelEditing(); }
    };

    const handleAddThread = async (e) => {
      e.preventDefault();
      if (newGeminiOpinion.trim() === '' || newLink.trim() === '' || !user) return;
      try {
        await addDoc(collection(db, 'threads'), {
          geminiOpinion: newGeminiOpinion,
          link: newLink,
          group: mapGroup(newThreadGroup) || 'Next',
          createdAt: serverTimestamp(),
          authorId: user.uid,
          isTop: false
        });
        setNewGeminiOpinion('');
        setNewLink('');
        setNewThreadGroup('Next');
      } catch (error) {
        console.error("Chyba při přidávání vlákna:", error);
        showAlert("Chyba při přidávání vlákna.");
      }
    };
    const handleDeleteThread = (threadId) => {
        setModalState({
            isOpen: true, message: 'Opravdu si přejete smazat toto vlákno?', type: 'confirm',
            onConfirm: async () => {
                setModalState({ isOpen: false });
                try { await deleteDoc(doc(db, 'threads', threadId)); } 
                catch (error) { console.error("Chyba při mazání vlákna:", error); showAlert("Chyba při mazání vlákna."); }
            },
            onCancel: () => setModalState({ isOpen: false })
        });
    };

    // Funkce pro kontrolu duplikátů podle posledních 20 znaků URL
    const checkForDuplicates = async (url) => {
        if (!url || url.length < 10) {
            setDuplicateCheck(null);
            return;
        }
        
        const last20Chars = url.slice(-20).toLowerCase();
        
        try {
            // Hledáme v poznámkách
            const notesQuery = query(collection(db, 'quickNotes'));
            const notesSnapshot = await getDocs(notesQuery);
            const duplicateNotes = [];
            
            notesSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.url) {
                    const noteUrl = data.url.toLowerCase();
                    if (noteUrl.includes(last20Chars) || noteUrl.slice(-20) === last20Chars) {
                        duplicateNotes.push({ ...data, id: doc.id, type: 'note' });
                    }
                }
            });
            
            // Hledáme ve vláknech
            const threadsQuery = query(collection(db, 'threads'));
            const threadsSnapshot = await getDocs(threadsQuery);
            const duplicateThreads = [];
            
            threadsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.link) {
                    const threadUrl = data.link.toLowerCase();
                    if (threadUrl.includes(last20Chars) || threadUrl.slice(-20) === last20Chars) {
                        duplicateThreads.push({ ...data, id: doc.id, type: 'thread' });
                    }
                }
            });
            
            const allDuplicates = [...duplicateNotes, ...duplicateThreads];
            
            if (allDuplicates.length > 0) {
                setDuplicateCheck(allDuplicates[0]); // Zobrazíme první nalezený
            } else {
                setDuplicateCheck(null);
            }
        } catch (error) {
            console.error('Chyba při kontrole duplikátů:', error);
            setDuplicateCheck(null);
        }
    };

    // Univerzální funkce pro přidání poznámky nebo vlákna
    const handleAddRecord = async (e) => {
        e.preventDefault();
        if (!user) return;
        
        if (newRecordType === 'poznámka') {
            // Přidání poznámky (původní logika)
            if (newNoteTitle.trim() === '') return;
            try {
                setIsSavingNote(true);
                const newPosition = quickNotes.length > 0 ? Math.max(...quickNotes.map(note => note.position || 0)) + 1 : 0;
                const docRef = await addDoc(collection(db, 'quickNotes'), {
                    title: newNoteTitle.trim(),
                    url: newNoteUrl.trim() || null,
                    body: '',
                    createdAt: serverTimestamp(),
                    position: newPosition,
                    authorId: user?.uid || null
                });
                setNewNoteTitle('');
                setNewNoteUrl('');
                setDuplicateCheck(null);
                setSelectedNoteId(docRef.id);
                setSaveStatus('Uloženo');
            } catch (error) {
                console.error("Chyba při přidávání poznámky:", error);
                showAlert("Nepodařilo se přidat poznámku.");
            } finally {
                setIsSavingNote(false);
            }
        } else if (newRecordType === 'vlákno') {
            // Přidání vlákna (původní logika z handleAddThread)
            if (newGeminiOpinion.trim() === '' || newLink.trim() === '') return;
            try {
                setIsSavingNote(true);
                await addDoc(collection(db, 'threads'), {
                    geminiOpinion: newGeminiOpinion.trim(),
                    link: newLink.trim(),
                    group: newThreadGroup.trim() || 'Next',
                    createdAt: serverTimestamp(),
                    authorId: user?.uid || null,
                    isTop: false
                });
                setNewGeminiOpinion('');
                setNewLink('');
                setNewThreadGroup('Next');
            } catch (error) {
                console.error("Chyba při přidávání vlákna:", error);
                showAlert("Nepodařilo se přidat vlákno.");
            } finally {
                setIsSavingNote(false);
            }
        } else if (newRecordType === 'projekt') {
            // Přidání projektu (původní logika z handleAddProject)
            if (newProjectTitle.trim() === '') return;
            const raw = newProjectTitle.replace(/\r\n/g, '\n');
            const trimmed = raw.trim();
            const [firstLine] = trimmed.split('\n');
            const title = (firstLine || '').trim() || 'Bez názvu';
            
            try {
                setIsSavingNote(true);
                const newPosition = projects.length > 0 ? Math.max(...projects.map(p => p.position ?? 0)) + 1 : 0;
                const docRef = await addDoc(collection(db, 'projects'), {
                    title,
                    body: trimmed,
                    createdAt: serverTimestamp(),
                    position: newPosition,
                    authorId: user.uid,
                    images: []
                });
                setNewProjectTitle('');
                setSelectedProjectId(docRef.id);
            } catch (error) {
                console.error("Chyba při přidávání projektu:", error);
                showAlert("Nepodařilo se přidat projekt.");
            } finally {
                setIsSavingNote(false);
            }
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (newNoteTitle.trim() === '' || !user) return;
        try {
            setIsSavingNote(true);
            const newPosition = quickNotes.length > 0 ? Math.max(...quickNotes.map(note => note.position || 0)) + 1 : 0;
            const docRef = await addDoc(collection(db, 'quickNotes'), {
                title: newNoteTitle.trim(),
                url: newNoteUrl.trim() || null,
                body: '',
                createdAt: serverTimestamp(),
                position: newPosition,
                authorId: user?.uid || null
            });
            setNewNoteTitle('');
            setNewNoteUrl('');
            setDuplicateCheck(null);
            setSelectedNoteId(docRef.id); // po uložení rovnou vyber novou poznámku
            setSaveStatus('Uloženo');
        } catch (error) {
            console.error("Chyba při přidávání poznámky:", error);
            showAlert("Nepodařilo se přidat poznámku.");
        } finally {
            setIsSavingNote(false);
        }
    };
    const handleDeleteNote = async (noteId) => {
        try { 
            await deleteDoc(doc(db, 'quickNotes', noteId));
            if(selectedNoteId === noteId) setSelectedNoteId(null);
        } 
        catch (error) { console.error("Chyba při mazání poznámky:", error); showAlert("Nepodařilo se smazat poznámku."); }
    };
    const handleUpdateNoteBody = async (preserveCursor = true) => {
        if (!selectedNoteId) return;
        
        // Uložení pozice kurzoru před aktualizací
        let cursorPosition = null;
        if (preserveCursor && document.activeElement?.tagName === 'TEXTAREA') {
            cursorPosition = document.activeElement.selectionStart;
        }
        
        setSaveStatus('Ukládání...');
        try {
            const noteRef = doc(db, 'quickNotes', selectedNoteId);
            await updateDoc(noteRef, { body: editingNoteBody });
            setSaveStatus('Uloženo');
            
            // Obnovení pozice kurzoru po uložení
            if (preserveCursor && cursorPosition !== null) {
                setTimeout(() => {
                    const textarea = document.activeElement;
                    if (textarea?.tagName === 'TEXTAREA') {
                        textarea.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }, 0);
            }
        } catch (error) {
            console.error("Chyba při ukládání těla poznámky:", error);
            showAlert("Nepodařilo se uložit změny.");
            setSaveStatus('Neuloženo');
        }
    };

    // --- CRUD pro Strom ---
    const handleAddTreeNote = async (e) => {
        e.preventDefault();
        if (newTreeNoteTitle.trim() === '' || !user) return;
        try {
            setIsSavingTreeNote(true);
            const newPosition = treeNotes.length > 0 ? Math.max(...treeNotes.map(note => note.position || 0)) + 1 : 0;
            const docRef = await addDoc(collection(db, 'treeNotes'), {
                title: newTreeNoteTitle.trim(),
                body: '',
                createdAt: serverTimestamp(),
                position: newPosition,
                authorId: user?.uid || null
            });
            setNewTreeNoteTitle('');
            setSelectedTreeNoteId(docRef.id);
            setSaveStatus('Uloženo');
        } catch (error) {
            console.error("Chyba při přidávání položky stromu:", error);
            showAlert("Nepodařilo se přidat položku stromu.");
        } finally {
            setIsSavingTreeNote(false);
        }
    };
    const handleDeleteTreeNote = async (noteId) => {
        try {
            await deleteDoc(doc(db, 'treeNotes', noteId));
            if (selectedTreeNoteId === noteId) setSelectedTreeNoteId(null);
        }
        catch (error) { console.error("Chyba při mazání položky stromu:", error); showAlert("Nepodařilo se smazat položku stromu."); }
    };
    const handleUpdateTreeNoteBody = async () => {
        if (!selectedTreeNoteId) return;
        setSaveStatus('Ukládání...');
        try {
            const noteRef = doc(db, 'treeNotes', selectedTreeNoteId);
            await updateDoc(noteRef, { body: editingTreeNoteBody });
            setSaveStatus('Uloženo');
        } catch (error) {
            console.error("Chyba při ukládání těla položky stromu:", error);
            showAlert("Nepodařilo se uložit změny.");
            setSaveStatus('Neuloženo');
        }
    };

    const copyToClipboard = async (text) => {
        try {
            // Moderní Clipboard API
            await navigator.clipboard.writeText(text);
            setSaveStatus('Zkopírováno');
            setTimeout(() => setSaveStatus('Uloženo'), 1200);
        } catch {
            // Fallback pro starší prohlížeče
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setSaveStatus('Zkopírováno');
                setTimeout(() => setSaveStatus('Uloženo'), 1200);
            } catch (fallbackErr) {
                console.error('Clipboard failed:', fallbackErr);
                showAlert('Nepodařilo se zkopírovat obsah.');
            }
        }
    };

    const handleAddPrompt = async (e) => {
      e.preventDefault();
      if (!user) return;
    
      const raw = (newPromptTitle ?? '').replace(/\r\n/g, '\n');
      const trimmed = raw.trim();
      if (!trimmed) return;
    
      const [firstLine] = trimmed.split('\n');
      const title = (firstLine || '').trim() || 'Bez názvu';
    
      try {
        setIsSavingPrompt(true);
        const newPosition = prompts.length > 0 ? Math.max(...prompts.map(p => p.position ?? 0)) + 1 : 0;
        const docRef = await addDoc(collection(db, 'prompts'), {
          title,
          body: trimmed,
          createdAt: serverTimestamp(),
          position: newPosition,
          authorId: user.uid
        });
        setNewPromptTitle('');
        setSelectedPromptId(docRef.id);
        setIsEditingPrompt(false);
      } catch (error) {
        console.error('Chyba při přidávání promptu:', error);
        showAlert('Nepodařilo se přidat prompt.');
      } finally {
        setIsSavingPrompt(false);
      }
    };
    const handleDeletePrompt = async (promptId) => {
        try { 
            await deleteDoc(doc(db, 'prompts', promptId));
            if(selectedPromptId === promptId) setSelectedPromptId(null);
        } 
        catch (error) { console.error("Chyba při mazání promptu:", error); showAlert("Nepodařilo se smazat prompt."); }
    };
    const handleUpdatePromptBody = async () => {
        if (!selectedPromptId) return;
        setSaveStatus('Ukládání...');
        try {
            const raw = (editingPromptBody ?? '').replace(/\r\n/g, '\n');
            const firstLine = (raw.split('\n')[0] || '').trim();
            const patch = { body: editingPromptBody };
            if (firstLine) patch.title = firstLine;
            await updateDoc(doc(db, 'prompts', selectedPromptId), patch);
            setSaveStatus('Uloženo');
        } catch (error) {
            console.error('Chyba při ukládání těla promptu:', error);
            showAlert('Nepodařilo se uložit změny.');
            setSaveStatus('Neuloženo');
        }
    };
    const handleCopySelectedPrompt = () => {
      const text = editingPromptBody ?? '';
      copyToClipboard(text);
    };

    // --- CRUD pro Assistant ---
    const handleAddAssistant = async (e) => {
      e.preventDefault();
      if (!user) return;
    
      const raw = (newAssistantTitle ?? '').replace(/\r\n/g, '\n');
      const trimmed = raw.trim();
      if (!trimmed) return;
    
      const [firstLine] = trimmed.split('\n');
      const title = (firstLine || '').trim() || 'Bez názvu';
    
      try {
        setIsSavingAssistant(true);
        const newPosition = assistants.length > 0 ? Math.max(...assistants.map(a => a.position ?? 0)) + 1 : 0;
        const docRef = await addDoc(collection(db, 'assistants'), {
          title,
          body: trimmed,
          createdAt: serverTimestamp(),
          position: newPosition,
          authorId: user.uid
        });
        setNewAssistantTitle('');
        setSelectedAssistantId(docRef.id);
        setIsEditingAssistant(false);
      } catch (error) {
        console.error('Chyba při přidávání asistenta:', error);
        showAlert('Nepodařilo se přidat asistenta.');
      } finally {
        setIsSavingAssistant(false);
      }
    };
    const handleDeleteAssistant = async (assistantId) => {
        try { 
            await deleteDoc(doc(db, 'assistants', assistantId));
            if(selectedAssistantId === assistantId) setSelectedAssistantId(null);
        } 
        catch (error) { console.error("Chyba při mazání asistenta:", error); showAlert("Nepodařilo se smazat asistenta."); }
    };
    const handleUpdateAssistantBody = async () => {
        if (!selectedAssistantId) return;
        setSaveStatus('Ukládání...');
        try {
            const raw = (editingAssistantBody ?? '').replace(/\r\n/g, '\n');
            const firstLine = (raw.split('\n')[0] || '').trim();
            const patch = { body: editingAssistantBody };
            if (firstLine) patch.title = firstLine;
            await updateDoc(doc(db, 'assistants', selectedAssistantId), patch);
            setSaveStatus('Uloženo');
        } catch (error) {
            console.error('Chyba při ukládání těla asistenta:', error);
            showAlert('Nepodařilo se uložit změny.');
            setSaveStatus('Neuloženo');
        }
    };
    const handleCopySelectedAssistant = () => {
      const text = editingAssistantBody ?? '';
      copyToClipboard(text);
    };

    // --- CRUD pro Project ---
    const handleAddProject = async (e) => {
        e.preventDefault();
        if (!user) return;

        const raw = (newProjectTitle ?? '').replace(/\r\n/g, '\n');
        const trimmed = raw.trim();
        if (!trimmed) return;

        const [firstLine] = trimmed.split('\n');
        const title = (firstLine || '').trim() || 'Bez názvu';

        try {
            setIsSavingProject(true);
            const newPosition = projects.length > 0 ? Math.max(...projects.map(p => p.position ?? 0)) + 1 : 0;
            const docRef = await addDoc(collection(db, 'projects'), {
                title,
                body: trimmed,
                createdAt: serverTimestamp(),
                position: newPosition,
                authorId: user.uid,
                images: []
            });
            setNewProjectTitle('');
            setSelectedProjectId(docRef.id);
        } catch (error) {
            console.error('Chyba při přidávání projektu:', error);
            showAlert('Nepodařilo se přidat projekt.');
        } finally {
            setIsSavingProject(false);
        }
    };
    const handleDeleteProject = async (projectId) => {
        try {
            await deleteDoc(doc(db, 'projects', projectId));
            if (selectedProjectId === projectId) setSelectedProjectId(null);
        }
        catch (error) { console.error("Chyba při mazání projektu:", error); showAlert("Nepodařilo se smazat projekt."); }
    };
    const handleUpdateProjectBody = async (preserveCursor = true) => {
        if (!selectedProjectId) return;
        
        // Uložení pozice kurzoru před aktualizací
        let cursorPosition = null;
        if (preserveCursor && document.activeElement?.tagName === 'TEXTAREA') {
            cursorPosition = document.activeElement.selectionStart;
        }
        
        setSaveStatus('Ukládání...');
        try {
            const raw = (editingProjectBody ?? '').replace(/\r\n/g, '\n');
            const firstLine = (raw.split('\n')[0] || '').trim();
            const patch = { body: editingProjectBody };
            if (firstLine) patch.title = firstLine;
            await updateDoc(doc(db, 'projects', selectedProjectId), patch);
            setSaveStatus('Uloženo');
            
            // Obnovení pozice kurzoru po uložení
            if (preserveCursor && cursorPosition !== null) {
                setTimeout(() => {
                    const textarea = document.activeElement;
                    if (textarea?.tagName === 'TEXTAREA') {
                        textarea.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }, 0);
            }
        } catch (error) {
            console.error('Chyba při ukládání těla projektu:', error);
            showAlert('Nepodařilo se uložit změny.');
            setSaveStatus('Neuloženo');
        }
    };
    const handleCopySelectedProject = () => {
        const text = editingProjectBody ?? '';
        copyToClipboard(text);
    };

    // --- Funkce pro nahrávání obrázků do projektu ---
    const handleProjectFiles = async (files) => {
      let targetProjectId = selectedProjectId;

      // fallback: pokud není vybrán projekt, vytvoř ho ad-hoc
      if (!targetProjectId) {
        if (!user) { showAlert('Nejste přihlášen.'); return; }
        try {
          const docRef = await addDoc(collection(db, 'projects'), {
            title: `Projekt ${new Date().toLocaleString()}`,
            body: '',
            createdAt: serverTimestamp(),
            position: projects.length > 0 ? Math.max(...projects.map(p => p.position ?? 0)) + 1 : 0,
            authorId: user.uid
          });
          targetProjectId = docRef.id;
          setSelectedProjectId(docRef.id);
          showAlert('Nebyl vybrán projekt – vytvořil jsem nový a nahrávám do něj.');
        } catch (e) {
          console.error('Auto-create project failed', e);
          showAlert('Nepodařilo se vytvořit nový projekt.');
          return;
        }
      }

      const list = Array.from(files || []).filter(f => {
        const isValid = f.type?.startsWith('image/') || f.type?.startsWith('video/');
        console.log('File:', f.name, 'Type:', f.type, 'Valid:', isValid);
        return isValid;
      });
      console.log('Filtered files:', list.length, 'out of', files?.length || 0);
      if (!list.length) {
        console.log('No valid files selected');
        return;
      }

      for (const file of list) {
        const localId = `${Date.now()}-${file.name}`;
        const previewUrl = URL.createObjectURL(file);
        setProjectUploads(u => [...u, { id: localId, name: file.name, previewUrl, progress: 0 }]);

        try {
          const storageRef = ref(storage, `projects/${targetProjectId}/${file.type?.startsWith('video/') ? 'videos' : 'images'}/${Date.now()}-${file.name}`);
          const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' });

          task.on('state_changed',
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProjectUploads(u => u.map(x => x.id === localId ? { ...x, progress: pct } : x));
            },
            (err) => {
              console.error('[upload] error', err);
              showAlert(`Nahrávání selhalo: ${err?.code || err?.message || err}`);
              setProjectUploads(u => u.filter(x => x.id !== localId));
              URL.revokeObjectURL(previewUrl);
            },
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                let width = null, height = null, duration = null;
                
                if (file.type?.startsWith('image/')) {
                  try { 
                    const img = new Image(); 
                    img.src = url; 
                    await img.decode(); 
                    width = img.width; 
                    height = img.height; 
                  } catch (e) { 
                    console.warn('Nelze zjistit rozměry obrázku:', e); 
                  }
                } else if (file.type?.startsWith('video/')) {
                  try {
                    const video = document.createElement('video');
                    video.src = url;
                    await new Promise((resolve, reject) => {
                      video.onloadedmetadata = () => {
                        width = video.videoWidth;
                        height = video.videoHeight;
                        duration = video.duration;
                        resolve();
                      };
                      video.onerror = reject;
                    });
                  } catch (e) {
                    console.warn('Nelze zjistit metadata videa:', e);
                  }
                }
                
                const newItem = {
                  url,
                  name: file.name || null,
                  size: file.size ?? null,
                  contentType: file.type || null,
                  width, height, duration,
                  createdAt: Timestamp.now()
                };

                const projectRef = doc(db, 'projects', targetProjectId);
                await updateDoc(projectRef, {
                    images: arrayUnion(newItem)
                });

                setProjectUploads(u => u.filter(x => x.id !== localId));
                URL.revokeObjectURL(previewUrl);
              } catch (e) {
                console.error('[firestore] update error', e);
                showAlert(`Uložení do Firestore selhalo: ${e?.message || e}`);
                setProjectUploads(u => u.filter(x => x.id !== localId));
                URL.revokeObjectURL(previewUrl);
              }
            }
          );
        } catch (e) {
          console.error('[upload] outer error', e);
          showAlert(`Nahrávání selhalo (outer): ${e?.message || e}`);
          setProjectUploads(u => u.filter(x => x.id !== localId));
          URL.revokeObjectURL(previewUrl);
        }
      }
    };

    // Funkce pro nahrávání do imagesTools
    async function handleImageUpload(e) {
      try {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1) auth
        if (!auth.currentUser) await signInAnonymously(auth);
        const uid = auth.currentUser?.uid;

        // 2) upload
        const storageRef = ref(
          storage,
          `image-tools/${uid}/${Date.now()}-${file.name}`
        );
        await uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' });
        const url = await getDownloadURL(storageRef);

        // 3) zápis do Firestore
        await addDoc(collection(db, 'imageTools'), {
          url,
          createdAt: serverTimestamp(),
          authorId: uid || null,
        });

        // 4) vyčisti vstup
        e.target.value = '';
      } catch (err) {
        console.error('upload error', err);
        showAlert(`Upload selhal: ${err?.code || err?.message || err}`);
      }
    }


    const handleImportCSV = () => { showAlert('Funkce pro import CSV zatím není implementována.'); };
    const handleReclassifyThreads = async () => {
        if (!user) return;
        setModalState({
          isOpen: true,
          type: 'confirm',
          message: 'Překlasifikovat existující vlákna podle nových názvů? (Neovlivní nic jiného než pole "group".)',
          onCancel: () => setModalState({ isOpen: false }),
          onConfirm: async () => {
            setModalState({ isOpen: false });
            setIsReclassifying(true);
            try {
              const coll = collection(db, 'threads');
              let totalUpdated = 0;
              const entries = Object.entries(GROUP_MAP);
              for (const [oldName, newName] of entries) {
                if (oldName === newName) continue;
                let last = null;
                while (true) {
                  const base = query(coll, where('group', '==', oldName), orderBy('__name__'), limit(400));
                  const q2 = last ? query(base, startAfter(last)) : base;
                  const snap = await getDocs(q2);
                  if (snap.empty) break;
                  const batch = writeBatch(db);
                  snap.docs.forEach(d => { batch.update(d.ref, { group: newName }); });
                  await batch.commit();
                  totalUpdated += snap.size;
                  last = snap.docs[snap.docs.length - 1];
                }
              }
              showAlert(`Hotovo. Aktualizováno ${totalUpdated} dokumentů.`);
            } catch (e) {
              console.error('Překlasifikace selhala:', e);
              showAlert('Překlasifikace selhala. Zkontroluj konzoli.');
            } finally {
              setIsReclassifying(false);
            }
          }
        });
    };
    const threadsToDisplay = useMemo(() => {
        let filteredThreads = threads;
        const queryTrimmed = searchQuery.trim();
        if (queryTrimmed !== '') {
            const q = queryTrimmed.toLowerCase();
            filteredThreads = threads.filter(t => {
              const url = t.link ?? '';
              // Hledáme ve celé URL, ale také zvláště v posledních 20 znacích pro lepší detekci ID
              const urlLower = url.toLowerCase();
              const last20Chars = url.slice(-20).toLowerCase();
              return urlLower.includes(q) || last20Chars.includes(q);
            });
        } else if (selectedGroup !== 'Vše') {
            filteredThreads = threads.filter(thread => mapGroup(thread.group || 'Next') === selectedGroup);
        }
        return filteredThreads.sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0));
    }, [threads, selectedGroup, searchQuery]);
    const allGroupedThreads = useMemo(() => threads.reduce((acc, thread) => {
        const group = mapGroup(thread.group || 'Next') || 'Next';
        if (!acc[group]) acc[group] = [];
        acc[group].push(thread);
        return acc;
    }, {}), [threads]);
    const groupedToDisplay = useMemo(() => threadsToDisplay.reduce((acc, thread) => {
        const group = mapGroup(thread.group || 'Next') || 'Next';
        if (!acc[group]) acc[group] = [];
        acc[group].push(thread);
        return acc;
    }, {}), [threadsToDisplay]);

    // --- Drag & Drop Handlers ---
    // handleNoteDragEnd byl odstraněn - nebyl používán
    const handleTreeNoteDragEnd = async ({ active, over }) => {
        setActiveTreeNoteId(null);
        await reorder(treeNotes, active.id, over?.id, setTreeNotes, 'treeNotes');
    };
    const handlePromptDragEnd = async ({ active, over }) => {
        setActivePromptId(null);
        await reorder(prompts, active.id, over?.id, setPrompts, 'prompts');
    };
    const handleAssistantDragEnd = async ({ active, over }) => {
        setActiveAssistantId(null);
        await reorder(assistants, active.id, over?.id, setAssistants, 'assistants');
    };
    const handleProjectDragEnd = async ({ active, over }) => {
        setActiveProjectId(null);
        if (!over || active.id === over.id) return;

        const activeProject = projects.find(p => p.id === active.id);
        if (!activeProject) return;

        console.log('Drag end - Active:', active.id, 'Over:', over.id, 'Active project:', activeProject);

        // Kontrola, zda jde o drop do drop zóny (změna priority)
        if (over.id === 'main-projects-zone' || over.id === 'regular-projects-zone') {
            const newPriority = over.id === 'main-projects-zone' ? true : false;
            
            console.log('Drop zone detected - New priority:', newPriority, 'Current priority:', activeProject.priority);
            
            // Normalizovaná kontrola současné priority
            const isCurrentlyMain = isMainProject(activeProject);
            
            // Pouze pokud se skutečně mění kategorie
            if ((newPriority && !isCurrentlyMain) || (!newPriority && isCurrentlyMain)) {
                try {
                    console.log('Changing priority for project:', activeProject.title, 'to:', newPriority);
                    
                    await updateDoc(doc(db, 'projects', active.id), { priority: newPriority });
                    
                    // Aktualizuj lokální stav
                    setProjects(prev => prev.map(p => 
                        p.id === active.id 
                            ? { ...p, priority: newPriority }
                            : p
                    ));
                    
                    const targetType = newPriority ? 'hlavní projekty' : 'ostatní projekty';
                    showAlert(`✅ Projekt "${activeProject.title}" byl přesunut do kategorie: ${targetType}`);
                } catch (e) {
                    console.error('Error updating project priority:', e);
                    showAlert('❌ Nepodařilo se změnit skupinu projektu.');
                }
            } else {
                console.log('No priority change needed');
            }
            return;
        }

        // Standardní přeřazení v rámci skupiny - pouze pokud cíl není drop zóna
        const overProject = projects.find(p => p.id === over.id);
        if (!overProject) {
            console.log('Over project not found, skipping reorder');
            return;
        }

        const oldIndex = projects.findIndex(p => p.id === active.id);
        const newIndex = projects.findIndex(p => p.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        
        const reordered = arrayMove(projects, oldIndex, newIndex);
        setProjects(reordered);
        
        const batch = writeBatch(db);
        reordered.forEach((p, i) => { 
            batch.update(doc(db, 'projects', p.id), { position: i }); 
        });
        
        try {
            await batch.commit(); 
        } catch (e) { 
            console.error(e); 
            showAlert('Nepodařilo se uložit nové pořadí projektů.'); 
        }
    };

    const handleProjectImageDragEnd = async ({ active, over }) => {
        setActiveProjectImageId(null);
        if (!over || active.id === over.id || !selectedProject) return;
        
        const oldIndex = parseInt(active.id.split('-')[1]);
        const newIndex = parseInt(over.id.split('-')[1]);
        
        if (oldIndex === newIndex) return;
        
        const reorderedImages = arrayMove(selectedProject.images, oldIndex, newIndex);
        
        // Okamžitě aktualizuj lokální stav pro plynulé UI bez re-renderu
        const optimisticUpdate = projects.map(p => 
            p.id === selectedProject.id 
                ? { ...p, images: reorderedImages }
                : p
        );
        
        // Použij startTransition pro nižší prioritu aktualizace
        startTransition(() => {
            setProjects(optimisticUpdate);
        });
        
        try {
            await updateDoc(doc(db, 'projects', selectedProject.id), {
                images: reorderedImages
            });
        } catch (e) {
            console.error('Chyba při přeřazování obrázků:', e);
            showAlert('Nepodařilo se uložit nové pořadí obrázků.');
            // V případě chyby vrať původní stav
            startTransition(() => {
                setProjects(prev => prev.map(p => 
                    p.id === selectedProject.id 
                        ? { ...p, images: selectedProject.images }
                        : p
                ));
            });
        }
    };

    // Handler pro drag & drop hlavních projektů na dashboardu
    const handleMainProjectsDragEnd = async ({ active, over }) => {
        if (!over || active.id === over.id) return;

        // Najdi dragged projekt
        const draggedProject = projects.find(p => p.id === active.id);
        if (!draggedProject) return;

        // Speciální handling pro drop na "make-regular" zónu
        if (over.id === 'make-regular-zone') {
            // Změň hlavní projekt na ostatní
            try {
                await updateDoc(doc(db, 'projects', active.id), {
                    priority: false
                });
                
                // Aktualizuj lokální stav
                setProjects(prev => prev.map(p => 
                    p.id === active.id 
                        ? { ...p, priority: false }
                        : p
                ));
                
                showAlert(`Projekt "${draggedProject.title}" byl přesunut k ostatním projektům.`);
            } catch (e) {
                console.error('Chyba při změně priority projektu:', e);
                showAlert('Nepodařilo se změnit typ projektu.');
            }
            return;
        }

        // Speciální handling pro drop na "make-main" zónu  
        if (over.id === 'make-main-zone') {
            // Změň ostatní projekt na hlavní
            try {
                await updateDoc(doc(db, 'projects', active.id), {
                    priority: true
                });
                
                // Aktualizuj lokální stav
                setProjects(prev => prev.map(p => 
                    p.id === active.id 
                        ? { ...p, priority: true }
                        : p
                ));
                
                showAlert(`Projekt "${draggedProject.title}" byl přesunut mezi hlavní projekty.`);
            } catch (e) {
                console.error('Chyba při změně priority projektu:', e);
                showAlert('Nepodařilo se změnit typ projektu.');
            }
            return;
        }

        // Normální přeřazování v rámci hlavních projektů
        const mainProjects = projectHierarchy.main;
        const oldIndex = mainProjects.findIndex(p => p.id === active.id);
        const newIndex = mainProjects.findIndex(p => p.id === over.id);
        
        if (oldIndex < 0 || newIndex < 0) return;
        
        // Přeřaď pouze hlavní projekty
        const reorderedMain = arrayMove(mainProjects, oldIndex, newIndex);
        
        // Optimistická aktualizace - přeřaď celý seznam projektů
        const reorderedProjects = projects.map(project => {
            if (isMainProject(project)) {
                const newPos = reorderedMain.findIndex(p => p.id === project.id);
                return newPos >= 0 ? { ...project, position: newPos } : project;
            }
            return project;
        });
        
        setProjects(reorderedProjects);
        
        // Batch update pozic hlavních projektů
        const batch = writeBatch(db);
        reorderedMain.forEach((project, index) => {
            batch.update(doc(db, 'projects', project.id), { position: index });
        });
        
        try {
            await batch.commit();
        } catch (e) {
            console.error('Chyba při přeřazování hlavních projektů:', e);
            showAlert('Nepodařilo se uložit nové pořadí projektů.');
            // V případě chyby vrať původní stav
            setProjects(projects);
        }
    };

    const handleDragStart = (e, threadId) => {
        e.dataTransfer.setData("threadId", threadId);
    };
    const handleDrop = (e, category) => {
        e.preventDefault();
        const threadId = e.dataTransfer.getData("threadId");
        if (threadId) {
            handleChangeGroup(threadId, category);
        }
        setDragOverCategory(null);
    };
    const handleDragOver = (e, category) => {
        e.preventDefault();
        setDragOverCategory(category);
    };

    const getViewTitle = (view) => {
        switch (view) {
            case 'notes': return 'Dashboardy – Poznámky';
            case 'tree': return 'Dashboardy – Strom';
            case 'projects': return 'Dashboardy – Project';
            case 'prompts': return 'Dashboardy – Prompts';
            case 'assistant': return 'Dashboardy – Assistant';
            case 'threadsModule': return 'Dashboardy – Vlákna';
            case 'imagesTool': return 'Dashboardy – Obrázky';
            case 'lab': return 'Dashboardy – Lab';
            default: return 'Dashboardy';
        }
    };


    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white">Načítání...</div>;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-white font-sans transition-colors duration-300">
            <Modal {...modalState} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} fileInputRef={fileInputRef} handleImportCSV={handleImportCSV} isImporting={isImporting} isReclassifying={isReclassifying} handleReclassifyThreads={handleReclassifyThreads} theme={theme} handleThemeChange={handleThemeChange} />
            <div className="container mx-auto p-2 sm:p-4">
                <header className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                        <div>
                            <button onClick={() => { 
                                setCurrentView('threads'); 
                                setSelectedGroup('Vše'); 
                                setSearchQuery(''); 
                                setSelectedProjectId(null); // Reset projektů při návratu na dashboard
                                // Reset stavu vláken při přepnutí na dashboard
                                setThreadGroupFilter('Vše');
                                setThreadSearchQuery('');
                            }} className="text-left transition-opacity hover:opacity-80">
                                <h1 className="text-xl sm:text-2xl font-bold text-orange-500 dark:text-cyan-400">{getViewTitle(currentView)}</h1>
                            </button>
                            {currentView !== 'projects' && (
                                <div className="mt-1 text-gray-500 dark:text-gray-400 flex items-center space-x-3 text-xs">
                                    <span>Zobrazeno: <span className="font-semibold text-gray-800 dark:text-white">{threadsToDisplay.length}</span></span>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <span>Skupin: <span className="font-semibold text-gray-800 dark:text-white">{Object.keys(groupedToDisplay).length}</span></span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                            <button onClick={() => setIsSettingsOpen(true)} title="Nastavení" className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold p-2 rounded-md transition-colors duration-200">
                                <CogIcon />
                            </button>
                            <a 
                                href="https://console.firebase.google.com/u/0/project/central-asset-storage/overview" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                                title="Firebase Console"
                            >
                                firebase
                            </a>
                        </div>
                    </div>
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                        {currentView !== 'projects' && (
                            <div className="flex flex-wrap gap-2 items-center justify-start">
                                <div className="flex flex-wrap gap-2 items-center">
                                    {/* Filtry skupin vláken byly přesunuty do modulu Vlákna */}
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <button onClick={() => { 
                                        setCurrentView('notes'); 
                                        // Reset stavu vláken při přepnutí na jiný modul
                                        if (currentView === 'threadsModule') {
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        }
                                    }}>
                                        <Badge tone="green" count={quickNotes.length} isActive={currentView === 'notes'}>
                                            Poznámky
                                        </Badge>
                                    </button>
                                    <button onClick={() => { 
                                        setCurrentView('tree'); 
                                        // Reset stavu vláken při přepnutí na jiný modul
                                        if (currentView === 'threadsModule') {
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        }
                                    }}>
                                        <Badge tone="violet" count={treeNotes.length} isActive={currentView === 'tree'}>
                                            Strom
                                        </Badge>
                                    </button>
                                    <button onClick={() => { 
                                        setCurrentView('projects'); 
                                        setSelectedProjectId(null); // Reset vybraného projektu
                                        // Reset stavu vláken při přepnutí na jiný modul
                                        if (currentView === 'threadsModule') {
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        }
                                    }}>
                                        <Badge tone="sky" isActive={currentView === 'projects'}>
                                            Project
                                        </Badge>
                                    </button>
                                    <button onClick={() => { 
                                        setCurrentView('prompts'); 
                                        // Reset stavu vláken při přepnutí na jiný modul
                                        if (currentView === 'threadsModule') {
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        }
                                    }}>
                                        <Badge tone="amber" isActive={currentView === 'prompts'}>
                                            Prompts
                                        </Badge>
                                    </button>
                                    <button onClick={() => { 
                                        setCurrentView('assistant'); 
                                        // Reset stavu vláken při přepnutí na jiný modul
                                        if (currentView === 'threadsModule') {
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        }
                                    }}>
                                        <Badge tone="rose" isActive={currentView === 'assistant'}>
                                            Assistant
                                        </Badge>
                                    </button>
                                    <button onClick={() => { 
                                        if (currentView === 'threadsModule') {
                                            // Reset při opětovném kliknutí na stejný modul
                                            setThreadGroupFilter('Vše');
                                            setThreadSearchQuery('');
                                        } else {
                                            setCurrentView('threadsModule');
                                        }
                                    }}>
                                        <Badge tone="slate" isActive={currentView === 'threadsModule'}>
                                            Vlákna
                                        </Badge>
                                    </button>
                                    <button onClick={() => { setCurrentView('imagesTool'); }}>
                                        <Badge tone="violet" count={images.length} isActive={currentView === 'imagesTool'}>
                                            Obrázky
                                        </Badge>
                                    </button>
                                    <button onClick={() => { setCurrentView('firebaseTests'); }}>
                                        <Badge tone="emerald" count={5} isActive={currentView === 'firebaseTests'}>
                                            🧪 Test Firebase
                                        </Badge>
                                    </button>
                                    <button onClick={() => { setCurrentView('codeBrowser'); }}>
                                        <Badge tone="purple" count={85} isActive={currentView === 'codeBrowser'}>
                                            📁 Code Browser
                                        </Badge>
                                    </button>
                                    <button onClick={() => { setCurrentView('lab'); }}>
                                        <Badge tone="indigo" isActive={currentView === 'lab'}>
                                            Lab
                                        </Badge>
                                    </button>
                                </div>
                            </div>
                        )}
                        {currentView === 'projects' && (
                            <div className="flex flex-wrap gap-2 items-center justify-start">
                                <button onClick={() => { 
                                    setCurrentView('notes'); 
                                    // Reset stavu vláken při přepnutí na jiný modul
                                    if (currentView === 'threadsModule') {
                                        setThreadGroupFilter('Vše');
                                        setThreadSearchQuery('');
                                    }
                                }}>
                                    <Badge tone="green" count={quickNotes.length} isActive={currentView === 'notes'}>
                                        Poznámky
                                    </Badge>
                                </button>
                                <button onClick={() => { setCurrentView('tree'); }}>
                                    <Badge tone="violet" count={treeNotes.length} isActive={currentView === 'tree'}>
                                        Strom
                                    </Badge>
                                </button>
                                <button onClick={() => { 
                                    setCurrentView('projects'); 
                                    setSelectedProjectId(null); // Reset vybraného projektu
                                }}>
                                    <Badge tone="sky" isActive={currentView === 'projects'}>
                                        Project
                                    </Badge>
                                </button>
                                <button onClick={() => { setCurrentView('prompts'); }}>
                                    <Badge tone="amber" isActive={currentView === 'prompts'}>
                                        Prompts
                                    </Badge>
                                </button>
                                <button onClick={() => { setCurrentView('assistant'); }}>
                                    <Badge tone="rose" isActive={currentView === 'assistant'}>
                                        Assistant
                                    </Badge>
                                </button>
                                <button onClick={() => { 
                                    if (currentView === 'threadsModule') {
                                        // Reset při opětovném kliknutí na stejný modul
                                        setThreadGroupFilter('Vše');
                                        setThreadSearchQuery('');
                                    } else {
                                        setCurrentView('threadsModule');
                                    }
                                }}>
                                    <Badge tone="slate" isActive={currentView === 'threadsModule'}>
                                        Vlákna
                                    </Badge>
                                </button>
                                <button onClick={() => { setCurrentView('imagesTool'); }}>
                                    <Badge tone="violet" count={images.length} isActive={currentView === 'imagesTool'}>
                                        Obrázky
                                    </Badge>
                                </button>
                                <button onClick={() => { setCurrentView('lab'); }}>
                                    <Badge tone="indigo" isActive={currentView === 'lab'}>
                                        Lab
                                    </Badge>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="space-y-3">

                {currentView === 'threads' && (
                    <>
                        {/* 🔍 UNIVERZÁLNÍ VYHLEDÁVÁNÍ - PRIORITA 1 */}
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">🔍 Univerzální vyhledávání</h3>
                            
                            <div className="relative mb-3">
                                <input
                                    type="text"
                                    value={noteSearchQuery}
                                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                                    placeholder="Hledat v poznámkách, vláknech a projektech…"
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                />
                                {isNotesSearchActive && (
                                    <button 
                                        onClick={() => setNoteSearchQuery('')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm"
                                    >
                                        Zrušit
                                    </button>
                                )}
                            </div>
                            
                            {/* Rychlé filtry */}
                            <div className="flex flex-wrap gap-1.5 items-center mb-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-1">Rychlý přístup:</span>
                                {['vše', 'poznámky', 'vlákna', 'projekty'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setRecordTypeFilter(type)}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                                            recordTypeFilter === type
                                                ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {type === 'vše' ? `Vše (${unifiedRecordsResults.total})` :
                                         type === 'poznámky' ? `📝 Poznámky (${unifiedRecordsResults.notes.length})` :
                                         type === 'vlákna' ? `🔗 Vlákna (${unifiedRecordsResults.threads.length})` :
                                         `📁 Projekty (${unifiedRecordsResults.projects.length})`}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Výsledky vyhledávání - kompaktní zobrazení */}
                            {isNotesSearchActive && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Nalezeno: {unifiedRecordsResults.notes.length} poznámek, {unifiedRecordsResults.threads.length} vláken, {unifiedRecordsResults.projects.length} projektů
                                    </p>
                                    
                                    {unifiedRecordsResults.allRecords.length > 0 ? (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {unifiedRecordsResults.allRecords.slice(0, 10).map(record => (
                                                <div key={`${record.recordType}-${record.id}`} className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                                     onClick={() => {
                                                         if (record.recordType === 'poznámka') {
                                                             setCurrentView('notes');
                                                             setSelectedNoteId(record.id);
                                                         } else if (record.recordType === 'vlákno') {
                                                             setCurrentView('threadsModule');
                                                             setThreadSearchQuery(noteSearchQuery);
                                                         } else if (record.recordType === 'projekt') {
                                                             setCurrentView('projects');
                                                             setSelectedProjectId(record.id);
                                                         }
                                                     }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full">
                                                            {record.recordType === 'poznámka' ? (
                                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">📝</span>
                                                            ) : record.recordType === 'vlákno' ? (
                                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">🔗</span>
                                                            ) : (
                                                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">📁</span>
                                                            )}
                                                        </span>
                                                        <h5 className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate flex-grow">
                                                            {record.displayTitle}
                                                        </h5>
                                                    </div>
                                                    {record.body && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{record.body.substring(0, 60)}...</p>
                                                    )}
                                                </div>
                                            ))}
                                            {unifiedRecordsResults.allRecords.length > 10 && (
                                                <div className="text-center pt-1">
                                                    <button 
                                                        onClick={() => setCurrentView('notes')}
                                                        className="text-xs text-orange-500 dark:text-cyan-400 hover:text-orange-600 dark:hover:text-cyan-300 font-medium"
                                                    >
                                                        Zobrazit všech {unifiedRecordsResults.allRecords.length} výsledků →
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Pro zadané kritéria nebylo nic nalezeno.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 📁 HLAVNÍ PROJEKTY - PRIORITA 2 */}
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-3 sm:p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">📁 Hlavní projekty</h3>
                                <button
                                    onClick={() => {
                                        setNewProjectTitle('');
                                        setCurrentView('projects');
                                    }}
                                    className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors"
                                    title="Přejít do projektů"
                                >
                                    Všechny projekty →
                                </button>
                            </div>
                            
                            {/* Rychlé založení projektu */}
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (newProjectTitle.trim() === '' || !user) return;
                                
                                const handleQuickAddProject = async () => {
                                    try {
                                        setIsSavingProject(true);
                                        const raw = newProjectTitle.trim().replace(/\r\n/g, '\n');
                                        const [firstLine] = raw.split('\n');
                                        const title = (firstLine || '').trim() || 'Bez názvu';
                                        const newPosition = projects.length > 0 ? Math.max(...projects.map(p => p.position || 0)) + 1 : 0;
                                        
                                        const docRef = await addDoc(collection(db, 'projects'), {
                                            title,
                                            body: raw,
                                            createdAt: serverTimestamp(),
                                            position: newPosition,
                                            authorId: user.uid,
                                            images: [],
                                            priority: true // Označit jako hlavní projekt
                                        });
                                        
                                        setNewProjectTitle('');
                                        setSelectedProjectId(docRef.id);
                                        setCurrentView('projects'); // Přepnout na projekty po vytvoření
                                    } catch (error) {
                                        console.error("Chyba při přidávání projektu:", error);
                                        showAlert("Nepodařilo se přidat projekt.");
                                    } finally {
                                        setIsSavingProject(false);
                                    }
                                };
                                
                                handleQuickAddProject();
                            }} className="flex items-center gap-2 mb-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                                <input
                                    type="text"
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="⚡ Rychle založit nový projekt..."
                                    className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-1.5 text-sm focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="flex-shrink-0 flex items-center justify-center bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold w-8 h-8 rounded-md transition-colors duration-200"
                                    disabled={isSavingProject}
                                >
                                    <PlusIcon />
                                </button>
                            </form>
                            
                            {/* Seznam hlavních projektů */}
                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleMainProjectsDragEnd}
                            >
                                <SortableContext 
                                    items={projectHierarchy.main.map(p => p.id)} 
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="flex flex-wrap gap-3">
                                        {projectHierarchy.main.slice(0, 6).map(project => (
                                            <MainProjectBox
                                                key={project.id}
                                                item={project}
                                                selected={selectedProjectId === project.id}
                                                onClick={(id) => {
                                                    setSelectedProjectId(id);
                                                    setCurrentView('projects');
                                                }}
                                                hasChildren={projectHierarchy.children[project.id]?.length > 0}
                                                isExpanded={false} // Na dashboardu nezobrazujeme rozbalené podprojekty
                                                onToggleExpand={() => {}} // Prázdná funkce - rozbalování děláme až v projektech
                                                onCreateSub={() => {}} // Prázdná funkce - vytváření podprojektů až v projektech
                                            />
                                        ))}
                                        
                                        {projectHierarchy.main.length === 0 && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 w-full">
                                                Zatím žádné hlavní projekty. Založte nový projekt výše! 
                                            </p>
                                        )}
                                        
                                        {projectHierarchy.main.length > 6 && (
                                            <div className="w-full text-center pt-3">
                                                <button 
                                                    onClick={() => setCurrentView('projects')}
                                                    className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium"
                                                >
                                                    Zobrazit všech {projectHierarchy.main.length} hlavních projektů →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* Formuláře a seznam vláken zůstávají beze změny */}
                        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm mb-4">
                            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-300 mb-3">Rychlé poznámky</h2>
                            <form onSubmit={handleAddNote} className="flex items-center gap-2 mb-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                                <input type="text" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder="Napiš titulek poznámky..." className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-1 text-sm focus:outline-none" />
                                <button type="submit" className="flex-shrink-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold w-8 h-8 rounded-md transition-colors duration-200"><PlusIcon /></button>
                            </form>
                            <div>
                                <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-2">Náhled poznámek:</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickNotes.slice(0, 5).map(note => (<div key={note.id} className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 py-1 px-2 rounded-full text-xs w-auto max-w-xs truncate">{note.title || note.text}</div>))}
                                    {quickNotes.length === 0 && <p className="text-gray-500 text-xs">Zatím žádné poznámky.</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Vyhledávání podle odkazů */}
                        {currentView !== 'projects' && currentView !== 'notes' && (
                            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm mb-4">
                                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">🔍 Hledat podle odkazu</h3>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        placeholder="Hledat podle odkazu..." 
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" 
                                    />
                                </div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm mb-4">
                            <form onSubmit={handleAddThread} className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3 items-center">
                                    <div className="relative flex-grow w-full">
                                        <input type="text" value={newGeminiOpinion} onChange={(e) => setNewGeminiOpinion(e.target.value)} placeholder="Názor z Gemini..." className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" />
                                        <button type="button" onClick={handleGenerateOpinion} disabled={!newLink.trim() || isGeneratingOpinion} title="Vygenerovat názor z odkazu" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isGeneratingOpinion ? <div className="w-4 h-4 border-2 border-orange-500 dark:border-cyan-500 border-t-transparent rounded-full animate-spin"></div> : <SparkleIcon className="w-4 h-4 text-orange-500 dark:text-cyan-400" />}
                                        </button>
                                    </div>
                                    <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Odkaz (URL)..." className="flex-grow w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3"><input type="text" value={newThreadGroup} onChange={(e) => setNewThreadGroup(e.target.value)} placeholder="Název skupiny (např. Data, Design, Business…)" className="flex-grow sm:w-1/2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" /><button type="submit" className="w-full sm:w-auto flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold px-4 py-2 rounded-md transition-colors duration-200 shadow-sm text-sm"><PlusIcon /><span className="ml-1 sm:inline">Přidat</span></button></div>
                            </form>
                        </div>
                        
                        <main className="space-y-8">
                            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Kategorie pro přetažení</h3>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(allGroupedThreads).sort().map(group => (
                                        <div 
                                            key={group}
                                            onDrop={(e) => handleDrop(e, group)}
                                            onDragOver={(e) => handleDragOver(e, group)}
                                            onDragLeave={() => setDragOverCategory(null)}
                                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 border-2 ${dragOverCategory === group ? 'border-orange-500 dark:border-cyan-500 bg-orange-500/20 dark:bg-cyan-500/20 scale-105 ring-2 ring-orange-500 dark:ring-cyan-500 ring-offset-2 dark:ring-offset-gray-900' : 'border-dashed border-gray-300 dark:border-gray-600'}`}
                                        >
                                            {group}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {Object.keys(groupedToDisplay).length > 0 ? (Object.entries(groupedToDisplay).map(([group, threadsInGroup]) => (<div key={group} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6"><h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">{group}</h2><div className="flex flex-wrap gap-3 items-center">{threadsInGroup.map(thread => (<div key={thread.id} draggable="true" onDragStart={(e) => handleDragStart(e, thread.id)} className={`w-full sm:w-auto bg-gray-100 dark:bg-gray-700/50 px-4 py-2 rounded-full flex justify-between items-center group transition-all duration-300 cursor-grab active:cursor-grabbing ${thread.isTop ? 'ring-2 ring-yellow-400/80' : ''}`}>{editingThreadId === thread.id ? (<input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} onBlur={() => handleUpdateOpinion(thread.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateOpinion(thread.id); if (e.key === 'Escape') handleCancelEditing(); }} className="bg-transparent text-gray-800 dark:text-white focus:outline-none flex-grow" autoFocus />) : (<p onDoubleClick={() => handleStartEditing(thread)} className="text-gray-800 dark:text-gray-200 text-sm truncate max-w-xs sm:max-w-md" title={thread.geminiOpinion}>{thread.geminiOpinion}</p>)}<div className="flex items-center space-x-1 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><button onClick={(e) => {e.stopPropagation(); handleToggleTop(thread.id, thread.isTop)}} title={thread.isTop ? 'Odebrat z TOP' : 'Označit jako TOP'} className={`p-1.5 rounded-full transition-colors ${thread.isTop ? 'text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}><StarIcon isTop={thread.isTop} /></button><a href={thread.link} target="_blank" rel="noopener noreferrer" title="Otevřít odkaz" className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-cyan-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><LinkIcon /></a><button onClick={() => handleDeleteThread(thread.id)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-300 hover:bg-red-500 hover:text-white transition-colors" title="Smazat vlákno"><TrashIcon /></button></div></div>))}</div></div>))) : (<div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg"><p className="text-gray-500 dark:text-gray-400">{searchQuery ? 'Pro zadaný odkaz nebylo nic nalezeno.' : 'Pro vybraný filtr nebyly nalezeny žádné záznamy.'}</p></div>)}
                        </main>
                    </>
                )}

                {currentView === 'threadsModule' && (
                    <main className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md mb-8">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Vlákna</h2>
                            <form onSubmit={handleAddThread} className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative flex-grow w-full">
                                        <input type="text" value={newGeminiOpinion} onChange={(e) => setNewGeminiOpinion(e.target.value)} placeholder="Názor z Gemini..." className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" />
                                        <button type="button" onClick={handleGenerateOpinion} disabled={!newLink.trim() || isGeneratingOpinion} title="Vygenerovat názor z odkazu" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isGeneratingOpinion ? <div className="w-5 h-5 border-2 border-orange-500 dark:border-cyan-500 border-t-transparent rounded-full animate-spin"></div> : <SparkleIcon className="w-5 h-5 text-orange-500 dark:text-cyan-400" />}
                                        </button>
                                    </div>
                                    <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Odkaz (URL)..." className="flex-grow w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4"><input type="text" value={newThreadGroup} onChange={(e) => setNewThreadGroup(e.target.value)} placeholder="Název skupiny (např. Data, Design, Business…)" className="flex-grow sm:w-1/2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" /><button type="submit" className="w-full sm:w-auto flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold px-6 py-3 rounded-md transition-colors duration-200 shadow-md"><PlusIcon /><span className="ml-2 sm:inline">Přidat</span></button></div>
                            </form>
                        </div>
                        
                        {/* Nová jednotná filtrace pro vlákna */}
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <div className="space-y-4">
                                {/* Skupinové filtry */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <button onClick={() => setThreadGroupFilter('Vše')} className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center ${threadGroupFilter === 'Vše' ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                        Vše 
                                        <span className={`ml-1.5 text-xs font-bold rounded-full px-2 py-0.5 ${threadGroupFilter === 'Vše' ? 'bg-orange-400/50 dark:bg-cyan-400/50' : 'bg-gray-300 dark:bg-gray-800/50'}`}>
                                            {threads.length}
                                        </span>
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setThreadGroupFilter(cat.label)}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center ${
                                                threadGroupFilter === cat.label
                                                  ? "bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900"
                                                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                            }`}
                                        >
                                            {cat.label}
                                            <span className={`ml-1.5 text-xs font-bold rounded-full px-2 py-0.5 ${threadGroupFilter === cat.label ? 'bg-orange-400/50 dark:bg-cyan-400/50' : 'bg-gray-300 dark:bg-gray-600/50'}`}>
                                                {threads.filter(t => mapGroup(t.group || 'Next') === cat.label).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Vyhledávací pole */}
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={threadSearchQuery} 
                                        onChange={(e) => setThreadSearchQuery(e.target.value)} 
                                        placeholder="Hledat podle odkazu nebo názoru..." 
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {isThreadsSearchActive || threadGroupFilter !== 'Vše'
                                    ? `Nalezeno: ${filteredThreadsModule.length}` 
                                    : `Celkem vláken: ${threads.length}`
                                }
                            </p>

                            <div className="flex flex-wrap gap-2 pb-4">
                                {filteredThreadsModule.length > 0 ? (
                                    filteredThreadsModule.map(thread => (
                                        <ThreadBox
                                            key={thread.id}
                                            thread={thread}
                                            selected={selectedThreadId === thread.id}
                                            visited={visitedThreadIds.has(thread.id)}
                                            onClick={() => {
                                                if (thread?.id) {
                                                    setVisitedThreadIds(prev => new Set(prev).add(thread.id));
                                                }
                                                if (thread?.link) {
                                                    window.open(thread.link, '_blank', 'noopener,noreferrer');
                                                } else {
                                                    setSelectedThreadId(thread.id);
                                                }
                                            }}
                                        />
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm w-full">Žádný výsledek.</p>
                                )}
                            </div>
                            
                            {selectedThreadId && (
                                <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                    {/* Zde by mohl být detail vybraného vlákna */}
                                </div>
                            )}
                        </div>
                    </main>
                )}

                {currentView === 'notes' && (
                    <main className="space-y-4">
                           <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Poznámky, Vlákna & Projekty</h2>
                            
                            <form ref={noteFormRef} onSubmit={handleAddRecord} className="space-y-4 mb-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                {/* Výběr typu záznamu */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewRecordType('poznámka')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            newRecordType === 'poznámka'
                                                ? 'bg-green-500 text-white dark:bg-green-600'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                    >
                                        📝 Poznámka
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRecordType('vlákno')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            newRecordType === 'vlákno'
                                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                    >
                                        🔗 Vlákno
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRecordType('projekt')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            newRecordType === 'projekt'
                                                ? 'bg-purple-500 text-white dark:bg-purple-600'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                    >
                                        📁 Projekt
                                    </button>
                                </div>

                                {newRecordType === 'poznámka' ? (
                                    /* Formulář pro poznámku */
                                    <>
                                        <div className="flex items-start gap-4">
                                            <textarea
                                                value={newNoteTitle}
                                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                                placeholder="Napiš novou poznámku..."
                                                className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); noteFormRef.current?.requestSubmit(); } }}
                                            />
                                            <button type="submit" className="flex-shrink-0 flex items-center justify-center bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white font-bold w-10 h-10 rounded-lg transition-colors duration-200" disabled={isSavingNote}>
                                                <PlusIcon />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="url"
                                                value={newNoteUrl}
                                                onChange={(e) => {
                                                    setNewNoteUrl(e.target.value);
                                                    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
                                                    debounceTimeout.current = setTimeout(() => {
                                                        checkForDuplicates(e.target.value);
                                                    }, 500);
                                                }}
                                                placeholder="Volitelně přidej odkaz..."
                                                className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-400 px-2 py-1 focus:outline-none border-b border-gray-300 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400"
                                            />
                                            {duplicateCheck && (
                                                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                                    Nalezen podobný {duplicateCheck.type === 'note' ? 'záznam' : 'vlákno'}: {duplicateCheck.title || duplicateCheck.opinion || 'Bez názvu'}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : newRecordType === 'projekt' ? (
                                    /* Formulář pro projekt */
                                    <>
                                        <div className="flex items-start gap-4">
                                            <textarea
                                                value={newProjectTitle}
                                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                                placeholder="Napiš nový projekt..."
                                                className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); noteFormRef.current?.requestSubmit(); } }}
                                            />
                                            <button type="submit" className="flex-shrink-0 flex items-center justify-center bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold w-10 h-10 rounded-lg transition-colors duration-200" disabled={isSavingNote}>
                                                <PlusIcon />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* Formulář pro vlákno */
                                    <>
                                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                                            <div className="relative flex-grow w-full">
                                                <input 
                                                    type="text" 
                                                    value={newGeminiOpinion} 
                                                    onChange={(e) => setNewGeminiOpinion(e.target.value)} 
                                                    placeholder="Názor z Gemini..." 
                                                    className="w-full bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-3 focus:outline-none border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400" 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={handleGenerateOpinion} 
                                                    disabled={!newLink.trim() || isGeneratingOpinion} 
                                                    title="Vygenerovat názor z odkazu" 
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isGeneratingOpinion ? <div className="w-5 h-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div> : <SparkleIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                                                </button>
                                            </div>
                                            <input 
                                                type="url" 
                                                value={newLink} 
                                                onChange={(e) => setNewLink(e.target.value)} 
                                                placeholder="Odkaz (URL)..." 
                                                className="flex-grow w-full bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-3 focus:outline-none border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400" 
                                            />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <input 
                                                type="text" 
                                                value={newThreadGroup} 
                                                onChange={(e) => setNewThreadGroup(e.target.value)} 
                                                placeholder="Název skupiny (např. Data, Design, Business…)" 
                                                className="flex-grow sm:w-1/2 bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-3 focus:outline-none border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400" 
                                            />
                                            <button type="submit" className="w-full sm:w-auto flex items-center justify-center bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-md transition-colors duration-200 shadow-md" disabled={isSavingNote}>
                                                <PlusIcon />
                                                <span className="ml-2 sm:inline">Přidat vlákno</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>

                            {/* Filtry pro sloučené zobrazení */}
                            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 mb-4">
                                <div className="space-y-3">
                                    {/* Filtr podle typu */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Typ:</span>
                                        {['vše', 'poznámky', 'vlákna', 'projekty'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setRecordTypeFilter(type)}
                                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                                                    recordTypeFilter === type
                                                        ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {type === 'vše' ? `Vše (${unifiedRecordsResults.total})` :
                                                 type === 'poznámky' ? `📝 Poznámky (${unifiedRecordsResults.notes.length})` :
                                                 type === 'vlákna' ? `🔗 Vlákna (${unifiedRecordsResults.threads.length})` :
                                                 `📁 Projekty (${unifiedRecordsResults.projects.length})`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Filtr podle skupin vláken (pouze když jsou zobrazena vlákna) */}
                                    {(recordTypeFilter === 'vše' || recordTypeFilter === 'vlákna') && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Skupina vláken:</span>
                                            <button 
                                                onClick={() => setRecordGroupFilter('Vše')} 
                                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                                                    recordGroupFilter === 'Vše' 
                                                        ? 'bg-blue-500 dark:bg-blue-600 text-white' 
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                Vše ({threads.length})
                                            </button>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setRecordGroupFilter(cat.label)}
                                                    className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                                                        recordGroupFilter === cat.label
                                                            ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {cat.label} ({threads.filter(t => normalizedGroup(t.group || 'Next') === cat.label).length})
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={noteSearchQuery}
                                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                                    placeholder="Hledat v poznámkách, vláknech a projektech…"
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                />
                                {isNotesSearchActive && (
                                    <button 
                                        onClick={() => setNoteSearchQuery('')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm"
                                    >
                                        Zrušit
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {isNotesSearchActive 
                                    ? `Nalezeno: ${unifiedRecordsResults.notes.length} poznámek${unifiedRecordsResults.threads.length > 0 ? `, ${unifiedRecordsResults.threads.length} vláken` : ''}${unifiedRecordsResults.projects.length > 0 ? `, ${unifiedRecordsResults.projects.length} projektů` : ''}` 
                                    : `Celkem: ${unifiedRecordsResults.notes.length} poznámek, ${unifiedRecordsResults.threads.length} vláken, ${unifiedRecordsResults.projects.length} projektů`
                                }
                            </p>

                            {/* Sloučené zobrazení všech záznamů */}
                            <div className="space-y-4">
                                {unifiedRecordsResults.allRecords.length > 0 ? (
                                    unifiedRecordsResults.allRecords.map(record => (
                                        <div key={`${record.recordType}-${record.id}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full">
                                                            {record.recordType === 'poznámka' ? (
                                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">📝 Poznámka</span>
                                                            ) : record.recordType === 'vlákno' ? (
                                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">🔗 Vlákno ({record.group || 'Next'})</span>
                                                            ) : (
                                                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">📁 Projekt</span>
                                                            )}
                                                        </span>
                                                        {record.recordType === 'vlákno' && record.isTop && (
                                                            <span className="text-yellow-500">⭐</span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1 cursor-pointer" 
                                                        onClick={() => {
                                                            if (record.recordType === 'poznámka') {
                                                                setSelectedNoteId(record.id);
                                                            } else if (record.recordType === 'projekt') {
                                                                setSelectedProjectId(record.id);
                                                                setCurrentView('projects');
                                                            }
                                                        }}>
                                                        {record.displayTitle}
                                                    </h4>
                                                    {(record.url || record.link) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{record.url || record.link}</p>
                                                    )}
                                                    {record.body && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{record.body.substring(0, 100)}...</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 ml-4">
                                                    {record.recordType === 'vlákno' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    if (record?.id) {
                                                                        setVisitedThreadIds(prev => new Set(prev).add(record.id));
                                                                    }
                                                                    if (record?.link) {
                                                                        window.open(record.link, '_blank', 'noopener,noreferrer');
                                                                    }
                                                                }}
                                                                className="text-orange-500 dark:text-cyan-400 hover:text-orange-600 dark:hover:text-cyan-500 transition-colors p-1"
                                                                title="Otevřít odkaz"
                                                            >
                                                                <LinkIcon />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); 
                                                                    handleToggleTop(record.id, record.isTop)
                                                                }} 
                                                                title={record.isTop ? 'Odebrat z TOP' : 'Označit jako TOP'} 
                                                                className={`p-1.5 rounded-full transition-colors ${record.isTop ? 'text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                            >
                                                                <StarIcon isTop={record.isTop} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {record.recordType === 'poznámka' && record.url && (
                                                        <a 
                                                            href={record.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-orange-500 dark:text-cyan-400 hover:text-orange-600 dark:hover:text-cyan-500 transition-colors p-1"
                                                            title="Otevřít odkaz"
                                                        >
                                                            <LinkIcon />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (record.recordType === 'poznámka') {
                                                                handleDeleteNote(record.id);
                                                            } else if (record.recordType === 'vlákno') {
                                                                handleDeleteThread(record.id);
                                                            } else if (record.recordType === 'projekt') {
                                                                handleDeleteProject(record.id);
                                                            }
                                                        }}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                                                        title="Smazat"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        <p className="text-gray-500 dark:text-gray-400">
                                            {isNotesSearchActive ? 'Pro zadané kritéria nebylo nic nalezeno.' : 'Žádné záznamy.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Detail vybrané poznámky */}
                            
                            {/* Detail vybrané poznámky */}
                            {selectedNoteId && selectedNote ? (
                                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">{selectedNote.title || selectedNote.text}</h3>
                                            <button onClick={handleExpandNote} disabled={isExpandingNote} title="Rozvinout poznámku pomocí AI" className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isExpandingNote ? <div className="w-5 h-5 border-2 border-orange-500 dark:border-cyan-500 border-t-transparent rounded-full animate-spin"></div> : <SparkleIcon className="w-5 h-5 text-orange-500 dark:text-cyan-400" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400 italic">{saveStatus}</span>
                                            <button onClick={() => handleDeleteNote(selectedNote.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white transition-colors" title="Smazat poznámku">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Debug info */}
                                    <div className="text-xs text-gray-500 mb-2">
                                        Debug: selectedNoteId={selectedNoteId}, editingNoteBody.length={editingNoteBody?.length || 0}, recordType={selectedNote.recordType}
                                    </div>
                                    <textarea 
                                        value={editingNoteBody}
                                        onChange={(e) => {
                                            setEditingNoteBody(e.target.value);
                                            setSaveStatus('Neuloženo');
                                        }}
                                        placeholder="Napište obsah poznámky..."
                                        className="w-full min-h-[200px] p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-none transition"
                                    />
                                </div>
                            ) : selectedNoteId ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 dark:text-gray-400">Načítání poznámky...</p>
                                </div>
                            ) : null}
                        </div>
                    </main>
                )}

                {currentView === 'tree' && (
                    <main className="space-y-4">
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Strom</h2>
                            
                            <form ref={treeNoteFormRef} onSubmit={handleAddTreeNote} className="flex items-start gap-4 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <textarea
                                    value={newTreeNoteTitle}
                                    onChange={(e) => setNewTreeNoteTitle(e.target.value)}
                                    placeholder="Napiš novou položku stromu..."
                                    className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); treeNoteFormRef.current?.requestSubmit(); } }}
                                />
                                <button type="submit" className="flex-shrink-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold w-10 h-10 rounded-lg transition-colors duration-200" disabled={isSavingTreeNote}>
                                    <PlusIcon />
                                </button>
                            </form>

                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={treeNoteSearchQuery}
                                    onChange={(e) => setTreeNoteSearchQuery(e.target.value)}
                                    placeholder="Hledat ve stromu…"
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                />
                                {isTreeNotesSearchActive && (
                                    <button 
                                        onClick={() => setTreeNoteSearchQuery('')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm"
                                    >
                                        Zrušit
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {isTreeNotesSearchActive 
                                    ? `Nalezeno: ${filteredTreeNotes.length}` 
                                    : `Celkem položek: ${treeNotes.length}`
                                }
                            </p>

                            {isTreeNotesSearchActive ? (
                                <div className="flex flex-wrap gap-2 pb-4">
                                    {filteredTreeNotes.length > 0 ? (
                                        filteredTreeNotes.map(note => (
                                            <button
                                                key={note.id}
                                                onClick={() => setSelectedTreeNoteId(note.id)}
                                                className={`py-1 px-3 rounded-full text-sm w-auto max-w-xs truncate select-none ${selectedTreeNoteId === note.id ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                            >
                                                {note.title || note.text}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm w-full">Žádný výsledek.</p>
                                    )}
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={({active}) => setActiveTreeNoteId(active.id)}
                                    onDragEnd={handleTreeNoteDragEnd}
                                    onDragCancel={() => setActiveTreeNoteId(null)}
                                >
                                    <SortableContext items={treeNotes.map(n => n.id)} strategy={rectSortingStrategy}>
                                        <div className="flex flex-wrap gap-2 pb-4">
                                            {treeNotes.map(note => (
                                                <TreeNoteBox
                                                    key={note.id}
                                                    note={note}
                                                    selected={selectedTreeNoteId === note.id}
                                                    onClick={setSelectedTreeNoteId}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay dropAnimation={null}>
                                        {activeTreeNoteId ? (
                                            <div className="py-1 px-3 rounded-full text-sm bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900 shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105">
                                                {(treeNotes.find(n => n.id === activeTreeNoteId)?.title
                                                  || treeNotes.find(n => n.id === activeTreeNoteId)?.text) ?? ''}
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}

                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                {selectedTreeNote ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold">{selectedTreeNote.title || selectedTreeNote.text}</h3>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-400 italic">{saveStatus}</span>
                                                <button onClick={() => handleDeleteTreeNote(selectedTreeNote.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white transition-colors" title="Smazat položku"><TrashIcon /></button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={editingTreeNoteBody}
                                            onChange={(e) => {
                                                setEditingTreeNoteBody(e.target.value);
                                                setSaveStatus('Neuloženo');
                                            }}
                                            placeholder="Napište obsah položky..."
                                            className="w-full min-h-[200px] p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-none transition"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">Vyberte položku ze seznamu výše pro zobrazení a úpravu detailů.</p>
                                    </div>
                                )}
                            </div>
                           </div>
                    </main>
                )}

                {currentView === 'projects' && (
                    <main className="space-y-4">
                           <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Project</h2>
                            <form ref={projectFormRef} onSubmit={handleAddProject} className="flex items-start gap-4 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <textarea
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="Napiš nový projekt..."
                                    className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            projectFormRef.current?.requestSubmit();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="flex-shrink-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold w-10 h-10 rounded-lg transition-colors duration-200"
                                    disabled={isSavingProject}
                                >
                                    <PlusIcon />
                                </button>
                            </form>

                            {selectedProjectId && (
                              <>
                                {/* Obrázky – upload + DnD */}
                                <div className="mb-4">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Vybraný projekt: <span className="font-semibold text-gray-800 dark:text-white">{selectedProject.title}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => projectFileInputRef.current?.click()}
                                      className={`px-3 py-2 text-sm font-semibold rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white`}
                                      title='Nahrát soubory'
                                    >
                                      Nahrát soubory
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setIsProjectImagesWide(v => !v)}
                                      className={`px-3 py-2 text-sm font-semibold rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white`}
                                      title={isProjectImagesWide ? 'Zmenšit na 3/řádek' : 'Zvětšit na plnou šířku'}
                                    >
                                      <EyeIcon />
                                    </button>

                                    <input
                                      ref={projectFileInputRef}
                                      type="file"
                                      accept="image/*,video/*"
                                      multiple
                                      hidden
                                      onChange={(e) => handleProjectFiles(e.target.files)}
                                    />
                                  </div>

                                  <div
                                    onDragOver={(e)=>{ e.preventDefault(); setIsDndActive(true);}}
                                    onDragLeave={()=>setIsDndActive(false)}
                                    onDrop={(e)=>{ e.preventDefault(); setIsDndActive(false); handleProjectFiles(e.dataTransfer.files);}}
                                    className={`rounded-xl border-2 border-dashed p-4 text-sm transition-colors duration-200 ${
                                      isDndActive ? 'border-orange-500 dark:border-cyan-500 ring-2 ring-orange-500 dark:ring-cyan-500 bg-orange-50/30 dark:bg-cyan-900/30' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    Přetáhni sem obrázky nebo klikni na „Nahrát obrázky“.
                                  </div>

                                  {projectUploads?.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                      {projectUploads.map(up => (
                                        <div key={up.id} className="rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2">
                                          <img src={up.previewUrl} alt={up.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded">
                                            <div style={{width:`${up.progress}%`}} className="h-2 bg-orange-500 dark:bg-cyan-500 rounded"></div>
                                          </div>
                                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">{up.name} – {up.progress}%</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            <div className="mb-3">
                                {/* Toggle mezi standardním a unified search */}
                                <div className="flex items-center gap-2 mb-3">
                                    <button
                                        onClick={() => setProjectUnifiedSearchQuery('')}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                            !projectUnifiedSearchQuery.trim() ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        📁 Pouze projekty
                                    </button>
                                    <button
                                        onClick={() => setProjectSearchQuery('')}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                            projectUnifiedSearchQuery.trim() ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        🔍 Univerzální hledání
                                    </button>
                                </div>

                                {projectUnifiedSearchQuery.trim() ? (
                                    /* Unified search interface */
                                    <>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={projectUnifiedSearchQuery}
                                                onChange={(e) => setProjectUnifiedSearchQuery(e.target.value)}
                                                placeholder="Hledat v projektech, poznámkách i vláknech…"
                                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <button
                                                onClick={() => setProjectUnifiedSearchQuery('')}
                                                className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                title="Zrušit unified search"
                                            >
                                                Zrušit
                                            </button>
                                        </div>
                                        
                                        {/* Filtry pro unified search */}
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Typ:</span>
                                            {['vše', 'projekty', 'poznámky', 'vlákna'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setProjectRecordTypeFilter(type)}
                                                    className={`px-2 py-1 rounded text-xs font-medium transition ${
                                                        projectRecordTypeFilter === type
                                                            ? 'bg-purple-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {type === 'vše' ? '🔍 Vše' : 
                                                     type === 'projekty' ? '📁 Projekty' :
                                                     type === 'poznámky' ? '📝 Poznámky' : '🔗 Vlákna'}
                                                    {projectUnifiedRecordsResults[type === 'vše' ? 'total' : type === 'projekty' ? 'projects' : type === 'poznámky' ? 'notes' : 'threads']?.length > 0 && 
                                                     ` (${type === 'vše' ? projectUnifiedRecordsResults.total : 
                                                          type === 'projekty' ? projectUnifiedRecordsResults.projects.length :
                                                          type === 'poznámky' ? projectUnifiedRecordsResults.notes.length : 
                                                          projectUnifiedRecordsResults.threads.length})`}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Filtry pro vlákna */}
                                        {projectRecordTypeFilter === 'vlákna' && (
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Skupina:</span>
                                                {[{label: 'Vše', key: 'Vše'}, ...threadGroupCounts].map(cat => (
                                                    <button
                                                        key={cat.label}
                                                        onClick={() => setProjectRecordGroupFilter(cat.label)}
                                                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                                                            projectRecordGroupFilter === cat.label
                                                                ? 'bg-purple-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                        }`}
                                                    >
                                                        {cat.label} ({cat.label === 'Vše' ? projectUnifiedRecordsResults.threads.length : projectUnifiedRecordsResults.threads.filter(t => normalizedGroup(t.group || 'Next') === cat.label).length})
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Nalezeno: <span className="font-semibold">{projectUnifiedRecordsResults.total}</span> záznamů
                                            {projectUnifiedRecordsResults.projects.length > 0 && ` • ${projectUnifiedRecordsResults.projects.length} projektů`}
                                            {projectUnifiedRecordsResults.notes.length > 0 && ` • ${projectUnifiedRecordsResults.notes.length} poznámek`}
                                            {projectUnifiedRecordsResults.threads.length > 0 && ` • ${projectUnifiedRecordsResults.threads.length} vláken`}
                                        </div>
                                    </>
                                ) : (
                                    /* Standardní project search */
                                    <>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                placeholder="Hledat v projektech…"
                                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                            />
                                            {isProjectsSearchActive && (
                                                <button
                                                    onClick={() => setProjectSearchQuery('')}
                                                    className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    title="Zrušit filtr"
                                                >
                                                    Zrušit
                                                </button>
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {isProjectsSearchActive
                                                ? <>Nalezeno: <span className="font-semibold">{filteredProjects.length}</span></>
                                                : <>Celkem: <span className="font-semibold">{projects.length}</span></>}
                                        </div>
                                    </>
                                )}
                            </div>

                            {projectUnifiedSearchQuery.trim() ? (
                                /* Unified search results */
                                <div className="space-y-4">
                                    {projectUnifiedRecordsResults.total > 0 ? (
                                        <div className="space-y-3">
                                            {projectUnifiedRecordsResults.allRecords.map(record => (
                                                <div 
                                                    key={`${record.recordType}-${record.id}`}
                                                    onClick={() => {
                                                        if (record.recordType === 'projekt') {
                                                            setSelectedProjectId(record.id);
                                                        } else if (record.recordType === 'poznámka') {
                                                            setSelectedNoteId(record.id);
                                                            setCurrentView('threads'); // Přepni na unified modul pro poznámky
                                                        } else if (record.recordType === 'vlákno') {
                                                            setSelectedThreadId(record.id);
                                                            setCurrentView('threadsModule'); // Přepni na threads modul
                                                        }
                                                    }}
                                                    className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-lg">
                                                                    {record.recordType === 'projekt' ? '📁' : 
                                                                     record.recordType === 'poznámka' ? '📝' : '🔗'}
                                                                </span>
                                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                                    {record.displayTitle}
                                                                </h4>
                                                                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                                                    {record.recordType === 'projekt' ? 'Projekt' : 
                                                                     record.recordType === 'poznámka' ? 'Poznámka' : 'Vlákno'}
                                                                </span>
                                                                {record.recordType === 'vlákno' && (
                                                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                                                        {normalizedGroup(record.group)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(record.body || record.link) && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                                                    {record.recordType === 'vlákno' && record.link ? 
                                                                        `🔗 ${record.link}` : 
                                                                        (record.body || '').substring(0, 150) + (record.body?.length > 150 ? '...' : '')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
                                                            →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-8">
                                            {projectUnifiedSearchQuery.trim() ? 'Pro zadané kritéria nebylo nic nalezeno.' : 'Začněte psát pro vyhledávání...'}
                                        </p>
                                    )}
                                </div>
                            ) : isProjectsSearchActive ? (
                                <div className="flex flex-wrap gap-2 pb-4">
                                    {filteredProjects.length > 0 ? (
                                        filteredProjects.map(p => (
                                            <ProjectBox
                                                key={p.id}
                                                item={p}
                                                selected={selectedProjectId === p.id}
                                                onClick={(id) => { setSelectedProjectId(id); }}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm w-full">Žádný výsledek.</p>
                                    )}
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={({ active }) => setActiveProjectId(String(active.id))}
                                    onDragEnd={handleProjectDragEnd}
                                    onDragCancel={() => setActiveProjectId(null)}
                                >
                                    <div className="space-y-6">
                                        {/* Záložkový systém */}
                                        <div className="flex items-center gap-4 mb-6">
                                            {/* Home/Všechny */}
                                            <button
                                                onClick={() => setProjectViewMode('all')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    projectViewMode === 'all'
                                                        ? 'bg-blue-500 text-white dark:bg-blue-600'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                                </svg>
                                                Všechny
                                            </button>

                                            {/* Hlavní projekty */}
                                            <button
                                                onClick={() => setProjectViewMode('main')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    projectViewMode === 'main'
                                                        ? 'bg-orange-500 text-white dark:bg-orange-600'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                                Hlavní projekty
                                            </button>

                                            {/* Ostatní projekty */}
                                            <button
                                                onClick={() => setProjectViewMode('regular')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    projectViewMode === 'regular'
                                                        ? 'bg-green-500 text-white dark:bg-green-600'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                Ostatní projekty
                                            </button>
                                        </div>

                                        {/* Jednoduchá breadcrumb navigace */}
                                        {selectedProjectId && (() => {
                                            const selectedProject = projects.find(p => p.id === selectedProjectId);
                                            if (!selectedProject) return null;
                                            
                                            const breadcrumbs = [];
                                            
                                            // Přidej kategorii
                                            if (selectedProject.priority) {
                                                breadcrumbs.push('Hlavní projekty');
                                            } else if (!selectedProject.parentId) {
                                                breadcrumbs.push('Ostatní projekty');
                                            }
                                            
                                            // Pokud je to podprojekt, přidej rodiče
                                            if (selectedProject.parentId) {
                                                const parentProject = projects.find(p => p.id === selectedProject.parentId);
                                                if (parentProject) {
                                                    // Přidej kategorii rodiče
                                                    if (parentProject.priority) {
                                                        breadcrumbs.push('Hlavní projekty');
                                                    } else {
                                                        breadcrumbs.push('Ostatní projekty');
                                                    }
                                                    // Přidej rodiče
                                                    breadcrumbs.push(parentProject.title);
                                                }
                                            }
                                            
                                            // Přidej aktuální projekt
                                            breadcrumbs.push(selectedProject.title);
                                            
                                            return (
                                                <div className="mb-4 px-1">
                                                    <nav className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                        {breadcrumbs.map((item, index) => (
                                                            <div key={index} className="flex items-center">
                                                                {index > 0 && (
                                                                    <svg className="w-3 h-3 mx-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                )}
                                                                <span className={index === breadcrumbs.length - 1 ? 'text-blue-700 dark:text-blue-300 font-semibold' : ''}>
                                                                    {item}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </nav>
                                                </div>
                                            );
                                        })()}

                                        {/* Hlavní projekty - zobrazit když je 'all' nebo 'main' */}
                                        {(projectViewMode === 'all' || projectViewMode === 'main') && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Hlavní projekty</h3>
                                                    <button
                                                        onClick={toggleAllMainSubprojects}
                                                        className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                        title={showAllMainSubprojects ? "Sbalit všechny podprojekty" : "Rozbalit všechny podprojekty"}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {showAllMainSubprojects ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                            )}
                                                        </svg>
                                                    </button>
                                                </div>
                                                <ProjectDropZone 
                                                    id="main-projects-zone" 
                                                    title="Hlavní projekty"
                                                    isEmpty={mainProjects.length === 0}
                                                >
                                                    <SortableContext items={mainProjects.map(p => p.id)} strategy={rectSortingStrategy}>
                                                        <div className="flex flex-wrap gap-4">
                                                            {mainProjects.map(p => (
                                                                <div key={p.id} className="space-y-2">
                                                                    <MainProjectBox
                                                                        item={p}
                                                                        selected={selectedProjectId === p.id}
                                                                        onClick={handleProjectClick}
                                                                        onCreateSub={createSubProject}
                                                                        hasChildren={projectHierarchy.children[p.id] && projectHierarchy.children[p.id].length > 0}
                                                                        isExpanded={expandedProjects.has(p.id)}
                                                                        onToggleExpand={toggleProjectExpand}
                                                                    />
                                                                    
                                                                    {/* Podprojekty hlavního projektu */}
                                                                    {projectHierarchy.children[p.id] && projectHierarchy.children[p.id].length > 0 && expandedProjects.has(p.id) && (
                                                                        <div className="mt-3 grid grid-cols-2 gap-2 w-48">
                                                                            {projectHierarchy.children[p.id].map(sub => (
                                                                                <SubProjectBox
                                                                                    key={sub.id}
                                                                                    item={sub}
                                                                                    selected={selectedProjectId === sub.id}
                                                                                    onClick={(id) => { setSelectedProjectId(id); }}
                                                                                    onCreateSub={createSubProject}
                                                                                    hasChildren={projectHierarchy.children[sub.id] && projectHierarchy.children[sub.id].length > 0}
                                                                                    isExpanded={expandedProjects.has(sub.id)}
                                                                                    onToggleExpand={toggleProjectExpand}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </ProjectDropZone>
                                            </div>
                                        )}

                                        {/* Oddělovač - zobrazit pouze když jsou vidět obě sekce */}
                                        {projectViewMode === 'all' && (
                                            <div className="border-t border-gray-300 dark:border-gray-600"></div>
                                        )}

                                        {/* Ostatní projekty - zobrazit když je 'all' nebo 'regular' */}
                                        {(projectViewMode === 'all' || projectViewMode === 'regular') && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Ostatní projekty</h3>
                                                    <button
                                                        onClick={toggleAllRegularSubprojects}
                                                        className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                        title={showAllRegularSubprojects ? "Sbalit všechny podprojekty" : "Rozbalit všechny podprojekty"}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {showAllRegularSubprojects ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                            )}
                                                        </svg>
                                                    </button>
                                                </div>
                                                <ProjectDropZone 
                                                    id="regular-projects-zone" 
                                                    title="Ostatní projekty"
                                                    isEmpty={regularProjects.length === 0}
                                                >
                                                    <SortableContext items={regularProjects.map(p => p.id)} strategy={rectSortingStrategy}>
                                                        <div className="flex flex-wrap gap-2">
                                                            {regularProjects.map(p => (
                                                                <div key={p.id} className="space-y-1">
                                                                    <ProjectBox
                                                                        item={p}
                                                                        selected={selectedProjectId === p.id}
                                                                        onClick={handleProjectClick}
                                                                        onCreateSub={createSubProject}
                                                                        hasChildren={projectHierarchy.children[p.id] && projectHierarchy.children[p.id].length > 0}
                                                                        isExpanded={expandedProjects.has(p.id)}
                                                                        onToggleExpand={toggleProjectExpand}
                                                                    />
                                                                    
                                                                    {/* Podprojekty běžného projektu */}
                                                                    {projectHierarchy.children[p.id] && projectHierarchy.children[p.id].length > 0 && expandedProjects.has(p.id) && (
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            {projectHierarchy.children[p.id].map(sub => (
                                                                                <SubProjectBox
                                                                                    key={sub.id}
                                                                                    item={sub}
                                                                                    selected={selectedProjectId === sub.id}
                                                                                    onClick={(id) => { setSelectedProjectId(id); }}
                                                                                    onCreateSub={createSubProject}
                                                                                    hasChildren={projectHierarchy.children[sub.id] && projectHierarchy.children[sub.id].length > 0}
                                                                                    isExpanded={expandedProjects.has(sub.id)}
                                                                                    onToggleExpand={toggleProjectExpand}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </ProjectDropZone>
                                            </div>
                                        )}
                                    </div>

                                    <DragOverlay dropAnimation={null}>
                                        {activeProjectId ? (
                                            <div className="py-1 px-3 rounded-full text-sm bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900 shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105">
                                                {String(projects.find(p => p.id === activeProjectId)?.title || 'Projekt')}
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}

                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                {selectedProject ? (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold max-w-full sm:max-w-2xl truncate" title={selectedProject.title}>
                                            {selectedProject.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleCopySelectedProject}
                                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                title="Zkopírovat celý obsah"
                                            >
                                                <CopyIcon />
                                            </button>
                                            <button onClick={() => handleDeleteProject(selectedProject.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white transition-colors" title="Smazat projekt">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>                                                                                {/* START: Řada obrázků v detailu projektu s drag & drop */}
                                                                                {(selectedProject?.images?.length > 0) && (
                                                                                    <DndContext
                                                                                        sensors={sensors}
                                                                                        collisionDetection={closestCenter}
                                                                                        onDragStart={({active}) => setActiveProjectImageId(active.id)}
                                                                                        onDragEnd={handleProjectImageDragEnd}
                                                                                        onDragCancel={() => setActiveProjectImageId(null)}
                                                                                    >
                                                                                        <SortableContext items={selectedProject.images.map((_, i) => `img-${i}`)} strategy={rectSortingStrategy}>
                                                                                            <div className="flex flex-wrap gap-3 mb-4">
                                                                                                {selectedProject.images.map((img, i) => (
                                                                                                    <ProjectImageItem
                                                                                                        key={`img-${i}`}
                                                                                                        id={`img-${i}`}
                                                                                                        img={img}
                                                                                                        index={i}
                                                                                                    />
                                                                                                ))}
                                                                                            </div>
                                                                                        </SortableContext>
                                                                                        <DragOverlay dropAnimation={null}>
                                                                                            {activeProjectImageId ? (() => {
                                                                                                const draggedItem = selectedProject.images[parseInt(activeProjectImageId.split('-')[1])];
                                                                                                const isVideo = draggedItem?.contentType?.startsWith('video/');
                                                                                                return (
                                                                                                    <div className="w-40 aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105">
                                                                                                        {isVideo ? (
                                                                                                            <video
                                                                                                                src={draggedItem?.url}
                                                                                                                className="w-full h-full object-cover"
                                                                                                                muted
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <img
                                                                                                                src={draggedItem?.url}
                                                                                                                alt=""
                                                                                                                className="w-full h-full object-cover"
                                                                                                            />
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })() : null}
                                                                                        </DragOverlay>
                                                                                    </DndContext>
                                                                                )}
                                                                                {/* END: Řada obrázků v detailu projektu */}

                                        {/* Moderní editor */}
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                            <EditorToolbar
                                                mode={projectEditorMode}
                                                onModeChange={(mode) => setProjectEditorMode(mode)}
                                                saveStatus={projectSaveStatus}
                                                lastSaved={projectLastSaved}
                                                onManualSave={() => handleUpdateProjectBody(false)}
                                            />
                                            <div className="h-96">
                                                <ModernEditor
                                                    content={editingProjectBody}
                                                    onChange={(value) => {
                                                        handleProjectEditorChange(value);
                                                    }}
                                                    mode={projectEditorMode}
                                                    placeholder="Napište obsah projektu..."
                                                    projectImages={selectedProject?.images || []}
                                                    cleanProjectBodyFn={cleanProjectBody}
                                                    onSave={() => handleUpdateProjectBody(false)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">Vyberte projekt ze seznamu výše pro zobrazení a úpravu detailů.</p>
                                    </div>
                                )}
                            </div>
                           </div>
                    </main>
                )}

                {currentView === 'prompts' && (
                    <main className="space-y-4">
                           <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Prompts</h2>
                            <form ref={promptFormRef} onSubmit={handleAddPrompt} className="flex items-start gap-4 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <textarea
                                    value={newPromptTitle}
                                    onChange={(e) => setNewPromptTitle(e.target.value)}
                                    placeholder="Napiš nový prompt..."
                                    className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            promptFormRef.current?.requestSubmit();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="flex-shrink-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold w-10 h-10 rounded-lg transition-colors duration-200"
                                    disabled={isSavingPrompt}
                                >
                                    <PlusIcon />
                                </button>
                            </form>
                            
                            <div className="mb-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={promptSearchQuery}
                                        onChange={(e) => setPromptSearchQuery(e.target.value)}
                                        placeholder="Hledat v promptech…"
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                    />
                                    {isPromptsSearchActive && (
                                        <button
                                            onClick={() => setPromptSearchQuery('')}
                                            className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                            title="Zrušit filtr"
                                        >
                                            Zrušit
                                        </button>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {isPromptsSearchActive
                                        ? <>Nalezeno: <span className="font-semibold">{filteredPrompts.length}</span></>
                                        : <>Celkem: <span className="font-semibold">{prompts.length}</span></>}
                                </div>
                            </div>

                            {isPromptsSearchActive ? (
                                <div className="flex flex-wrap gap-2 pb-4">
                                    {filteredPrompts.length > 0 ? (
                                        filteredPrompts.map(p => (
                                            <PromptBox
                                                key={p.id}
                                                item={p}
                                                selected={selectedPromptId === p.id}
                                                onClick={setSelectedPromptId}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm w-full">Žádný výsledek.</p>
                                    )}
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={({ active }) => setActivePromptId(String(active.id))}
                                    onDragEnd={handlePromptDragEnd}
                                    onDragCancel={() => setActivePromptId(null)}
                                >
                                    <SortableContext items={prompts.map(p => p.id)} strategy={rectSortingStrategy}>
                                        <div className="flex flex-wrap gap-2 pb-4">
                                            {prompts.map(p => (
                                                <PromptBox
                                                    key={p.id}
                                                    item={p}
                                                    selected={selectedPromptId === p.id}
                                                    onClick={setSelectedPromptId}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay dropAnimation={null}>
                                        {activePromptId ? (
                                            <div className="py-1 px-3 rounded-full text-sm bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900 shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105">
                                                {prompts.find(p => p.id === activePromptId)?.title ?? ''}
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}

                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                {selectedPrompt ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-bold max-w-full sm:max-w-2xl truncate" title={selectedPrompt.title}>
                                                {selectedPrompt.title}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <div className="inline-flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                                                    <button
                                                        onClick={() => setIsEditingPrompt(true)}
                                                        className={`px-3 py-1 text-sm ${isEditingPrompt ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-transparent'}`}
                                                    >
                                                        Upravit
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingPrompt(false)}
                                                        className={`px-3 py-1 text-sm ${!isEditingPrompt ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-transparent'}`}
                                                    >
                                                        Náhled
                                                    </button>
                                                </div>
                                                <span className="text-xs text-gray-400 italic">{saveStatus}</span>
                                                <button
                                                    onClick={handleCopySelectedPrompt}
                                                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title="Zkopírovat celý obsah"
                                                >
                                                    <CopyIcon />
                                                </button>
                                                <button onClick={() => handleDeletePrompt(selectedPrompt.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white transition-colors" title="Smazat prompt">
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>

                                        {isEditingPrompt ? (
                                            <textarea
                                                value={editingPromptBody}
                                                onChange={(e) => { setEditingPromptBody(e.target.value); setSaveStatus('Neuloženo'); }}
                                                placeholder="Napište obsah promptu..."
                                                className="w-full min-h-[240px] p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                        ) : (
                                            <div
                                                className="mt-4 break-words prose prose-sm dark:prose-invert max-w-none [strong]:font-bold [em]:italic"
                                                dangerouslySetInnerHTML={{ __html: formatTextForPreview(editingPromptBody || '') }}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">Vyberte prompt ze seznamu výše pro zobrazení a úpravu detailů.</p>
                                    </div>
                                )}
                            </div>
                           </div>
                    </main>
                )}

                {currentView === 'imagesTool' && (
                  <main className="space-y-4">
                    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">
                        Obrázky
                      </h2>

                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleImageUpload}
                        className="mb-4"
                      />

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {images.map(img => {
                          const isVideo = img.url?.includes('.mp4') || img.url?.includes('.mov') || img.url?.includes('.avi');
                          return (
                            <div key={img.id} className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              {isVideo ? (
                                <video 
                                  src={img.url} 
                                  className="w-full h-40 object-cover" 
                                  controls 
                                  preload="metadata"
                                />
                              ) : (
                                <img 
                                  src={img.url} 
                                  alt="" 
                                  className="w-full h-40 object-cover" 
                                  loading="lazy" 
                                />
                              )}
                            </div>
                          );
                        })}
                        {images.length === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Zatím žádné soubory.</p>
                        )}
                      </div>
                    </div>
                  </main>
                )}

                {currentView === 'assistant' && (
                    <main className="space-y-4">
                           <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">Assistant</h2>
                            <form ref={assistantFormRef} onSubmit={handleAddAssistant} className="flex items-start gap-4 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <textarea
                                    value={newAssistantTitle}
                                    onChange={(e) => setNewAssistantTitle(e.target.value)}
                                    placeholder="Napiš nový záznam pro asistenta..."
                                    className="flex-grow bg-transparent text-gray-800 dark:text-white placeholder-gray-500 px-2 py-2 focus:outline-none resize-y min-h-[80px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            assistantFormRef.current?.requestSubmit();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="flex-shrink-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-gray-900 font-bold w-10 h-10 rounded-lg transition-colors duration-200"
                                    disabled={isSavingAssistant}
                                >
                                    <PlusIcon />
                                </button>
                            </form>
                            
                            <div className="mb-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={assistantSearchQuery}
                                        onChange={(e) => setAssistantSearchQuery(e.target.value)}
                                        placeholder="Hledat v asistentovi…"
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
                                    />
                                    {isAssistantSearchActive && (
                                        <button
                                            onClick={() => setAssistantSearchQuery('')}
                                            className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                            title="Zrušit filtr"
                                        >
                                            Zrušit
                                        </button>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {isAssistantSearchActive
                                        ? <>Nalezeno: <span className="font-semibold">{filteredAssistants.length}</span></>
                                        : <>Celkem: <span className="font-semibold">{assistants.length}</span></>}
                                </div>
                            </div>

                            {isAssistantSearchActive ? (
                                <div className="flex flex-wrap gap-2 pb-4">
                                    {filteredAssistants.length > 0 ? (
                                        filteredAssistants.map(a => (
                                            <AssistantBox
                                                key={a.id}
                                                item={a}
                                                selected={selectedAssistantId === a.id}
                                                onClick={setSelectedAssistantId}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm w-full">Žádný výsledek.</p>
                                    )}
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={({ active }) => setActiveAssistantId(String(active.id))}
                                    onDragEnd={handleAssistantDragEnd}
                                    onDragCancel={() => setActiveAssistantId(null)}
                                >
                                    <SortableContext items={assistants.map(a => a.id)} strategy={rectSortingStrategy}>
                                        <div className="flex flex-wrap gap-2 pb-4">
                                            {assistants.map(a => (
                                                <AssistantBox
                                                    key={a.id}
                                                    item={a}
                                                    selected={selectedAssistantId === a.id}
                                                    onClick={setSelectedAssistantId}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay dropAnimation={null}>
                                        {activeAssistantId ? (
                                            <div className="py-1 px-3 rounded-full text-sm bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900 shadow-2xl ring-2 ring-orange-300 dark:ring-cyan-300 scale-105">
                                                {assistants.find(a => a.id === activeAssistantId)?.title ?? ''}
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}

                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                {selectedAssistant ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-bold max-w-full sm:max-w-2xl truncate" title={selectedAssistant.title}>
                                                {selectedAssistant.title}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <div className="inline-flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                                                    <button
                                                        onClick={() => setIsEditingAssistant(true)}
                                                        className={`px-3 py-1 text-sm ${isEditingAssistant ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-transparent'}`}
                                                    >
                                                        Upravit
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingAssistant(false)}
                                                        className={`px-3 py-1 text-sm ${!isEditingAssistant ? 'bg-orange-500 dark:bg-cyan-500 text-white dark:text-gray-900' : 'bg-transparent'}`}
                                                    >
                                                        Náhled
                                                    </button>
                                                </div>
                                                <span className="text-xs text-gray-400 italic">{saveStatus}</span>
                                                <button
                                                    onClick={handleCopySelectedAssistant}
                                                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title="Zkopírovat celý obsah"
                                                >
                                                    <CopyIcon />
                                                </button>
                                                <button onClick={() => handleDeleteAssistant(selectedAssistant.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white transition-colors" title="Smazat záznam">
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>

                                        {isEditingAssistant ? (
                                            <textarea
                                                value={editingAssistantBody}
                                                onChange={(e) => { setEditingAssistantBody(e.target.value); setSaveStatus('Neuloženo'); }}
                                                placeholder="Napište obsah..."
                                                className="w-full min-h-[240px] p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                        ) : (
                                            <div
                                                className="mt-4 break-words prose prose-sm dark:prose-invert max-w-none [strong]:font-bold [em]:italic"
                                                dangerouslySetInnerHTML={{ __html: formatTextForPreview(editingAssistantBody || '') }}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">Vyberte záznam ze seznamu výše pro zobrazení a úpravu detailů.</p>
                                    </div>
                                )}
                            </div>
                           </div>
                    </main>
                )}

                {currentView === 'firebaseTests' && (
                  <main className="space-y-4">
                    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-4">
                        🧪 Firebase Test Files
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Kolekce HTML souborů pro testování Firebase funkcionalit. Klikněte na kartu pro otevření v novém okně.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          {
                            name: 'firebase-test-complete.html',
                            title: '🔧 Complete Test',
                            description: 'Kompletní test Firebase funkcionalit včetně Firestore, Storage a Authentication'
                          },
                          {
                            name: 'firebase-test-fixed.html', 
                            title: '✅ Fixed Version',
                            description: 'Opravená verze s vyřešenými bugs a optimalizacemi'
                          },
                          {
                            name: 'firebase-test-with-video.html',
                            title: '🎥 Video Support',
                            description: 'Test s podporou video uploadu a metadata extrakce'
                          },
                          {
                            name: 'firebase-test-video-backup.html',
                            title: '💾 Video Backup',
                            description: 'Záložní verze video funkcionality'
                          },
                          {
                            name: 'firebase-test-fixed-backup.html',
                            title: '🗂️ Fixed Backup', 
                            description: 'Záložní verze opravené implementace'
                          }
                        ].map(file => (
                          <div 
                            key={file.name}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={() => window.open(`/${file.name}`, '_blank')}
                          >
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                              {file.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {file.description}
                            </p>
                            <div className="text-xs font-mono text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">💡 Tip:</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Tyto soubory obsahují různé testovací scénáře pro Firebase. Můžete je použít jako referenci 
                          pro implementaci nových funkcí nebo debugging existujících problémů.
                        </p>
                      </div>
                    </div>
                  </main>
                )}

                {currentView === 'codeBrowser' && (
                  <main className="space-y-4">
                    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-6">
                        📁 Code Browser
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Přehled všech HTML, JS a jiných kódů v projektu. Organizováno podle kategorií pro snadné procházení.
                      </p>

                      {/* 🔥 Firebase Tests */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                          🔥 Firebase Tests <span className="ml-2 text-sm bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">5 souborů</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'firebase-test-complete.html', desc: 'Kompletní Firebase test', path: '/firebase-test-complete.html' },
                            { name: 'firebase-test-fixed.html', desc: 'Opravená verze Firebase testu', path: '/firebase-test-fixed.html' },
                            { name: 'firebase-test-with-video.html', desc: 'Firebase + video upload', path: '/firebase-test-with-video.html' },
                            { name: 'firebase-test-video-backup.html', desc: 'Záloha video funkce', path: '/firebase-test-video-backup.html' },
                            { name: 'firebase-test-fixed-backup.html', desc: 'Záloha opravené verze', path: '/firebase-test-fixed-backup.html' }
                          ].map(file => (
                            <div key={file.name} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer transition-colors"
                                 onClick={() => window.open(file.path, '_blank')}>
                              <div className="text-sm font-mono text-orange-800 dark:text-orange-300 mb-1">{file.name}</div>
                              <div className="text-xs text-orange-600 dark:text-orange-400">{file.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 🎨 Design Files */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                          🎨 Design & UI <span className="ml-2 text-sm bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">8 souborů</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'design-selector.html', desc: 'Výběr z více designů', type: 'src/' },
                            { name: 'design-minimal.html', desc: 'Minimalistický design', type: 'src/' },
                            { name: 'design-dark.html', desc: 'Tmavý design', type: 'src/' },
                            { name: 'webpage.html', desc: 'Hlavní webová stránka', type: 'src/' },
                            { name: 'design-01.html', desc: 'Design varianta 1', type: 'src/designs/' },
                            { name: 'design-02.html', desc: 'Design varianta 2', type: 'src/designs/' },
                            { name: 'design-03.html', desc: 'Design varianta 3', type: 'src/designs/' },
                            { name: 'design-02-backup.html', desc: 'Záloha design 2', type: 'src/designs/' }
                          ].map(file => (
                            <div key={file.name} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer transition-colors"
                                 onClick={() => window.open(`https://raw.githubusercontent.com/MichalD73/myApp/main/${file.type}${file.name}`, '_blank')}>
                              <div className="text-sm font-mono text-purple-800 dark:text-purple-300 mb-1">{file.name}</div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">{file.desc}</div>
                              <div className="text-xs text-gray-500 mt-1">{file.type}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 🛠️ Tools */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                          🛠️ Tools & Utilities <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">4 soubory</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'XLS_tool.html', desc: 'Excel nástroj pro zpracování dat', type: 'src/' },
                            { name: 'video-uploader.html', desc: 'Video upload interface', type: 'src/' },
                            { name: 'preview.html', desc: 'Náhled stránky', type: 'src/' },
                            { name: 'VideoUploader.jsx', desc: 'React video komponenta', type: '' }
                          ].map(file => (
                            <div key={file.name} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                                 onClick={() => window.open(`https://raw.githubusercontent.com/MichalD73/myApp/main/${file.type}${file.name}`, '_blank')}>
                              <div className="text-sm font-mono text-blue-800 dark:text-blue-300 mb-1">{file.name}</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">{file.desc}</div>
                              <div className="text-xs text-gray-500 mt-1">{file.type || 'root/'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ⚡ JavaScript & React */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-4 flex items-center">
                          ⚡ JavaScript & React <span className="ml-2 text-sm bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">12 souborů</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'pokus.js', desc: 'Hlavní 5131 řádků dashboard', type: 'src/', size: '5131 lines' },
                            { name: 'ThreadsDashboard.jsx', desc: 'Dashboard komponenta', type: 'src/', size: '2732 lines' },
                            { name: 'myCode2.js', desc: 'Další kód', type: 'src/' },
                            { name: 'firebase-config.js', desc: 'Firebase konfigurace', type: 'src/' },
                            { name: 'useAutosave.js', desc: 'Hook pro auto-save', type: 'src/hooks/' },
                            { name: 'useFirestore.js', desc: 'Hook pro Firestore', type: 'src/hooks/' },
                            { name: 'formatters.js', desc: 'Formátovací funkce', type: 'src/utils/' },
                            { name: 'constants.js', desc: 'Konstanty aplikace', type: 'src/utils/' },
                            { name: 'generate-thumbnails.js', desc: 'Generování náhledů', type: 'src/' },
                            { name: 'full-dashboard.js', desc: 'Kompletní dashboard', type: 'Templates/Firebase-Video-System/' },
                            { name: 'index.js', desc: 'Firebase Functions', type: 'functions/' },
                            { name: 'App.jsx', desc: 'Hlavní App komponenta', type: 'src/' }
                          ].map(file => (
                            <div key={file.name} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer transition-colors"
                                 onClick={() => window.open(`https://raw.githubusercontent.com/MichalD73/myApp/main/${file.type}${file.name}`, '_blank')}>
                              <div className="text-sm font-mono text-yellow-800 dark:text-yellow-300 mb-1">{file.name}</div>
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">{file.desc}</div>
                              <div className="flex justify-between items-center mt-1">
                                <div className="text-xs text-gray-500">{file.type || 'root/'}</div>
                                {file.size && <div className="text-xs text-yellow-500 font-semibold">{file.size}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 📱 Landing & Index */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                          📱 Landing & Entry Points <span className="ml-2 text-sm bg-green-100 dark:bg-green-900 px-2 py-1 rounded">4 soubory</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'index.html', desc: 'Hlavní entry point', type: '' },
                            { name: 'Landing.html', desc: 'Landing page', type: 'src/' },
                            { name: 'index.html', desc: 'Src index', type: 'src/' },
                            { name: 'index-backup.html', desc: 'Záloha index', type: 'src/' }
                          ].map(file => (
                            <div key={`${file.type}${file.name}`} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                                 onClick={() => window.open(`https://raw.githubusercontent.com/MichalD73/myApp/main/${file.type}${file.name}`, '_blank')}>
                              <div className="text-sm font-mono text-green-800 dark:text-green-300 mb-1">{file.name}</div>
                              <div className="text-xs text-green-600 dark:text-green-400">{file.desc}</div>
                              <div className="text-xs text-gray-500 mt-1">{file.type || 'root/'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 📊 Statistics */}
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3">📊 Přehled kódů</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                          <div className="text-sm">
                            <div className="text-orange-500 font-bold text-lg">5</div>
                            <div className="text-gray-600 dark:text-gray-400">Firebase</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-purple-500 font-bold text-lg">8</div>
                            <div className="text-gray-600 dark:text-gray-400">Design</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-blue-500 font-bold text-lg">4</div>
                            <div className="text-gray-600 dark:text-gray-400">Tools</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-yellow-500 font-bold text-lg">12</div>
                            <div className="text-gray-600 dark:text-gray-400">JS/React</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-green-500 font-bold text-lg">4</div>
                            <div className="text-gray-600 dark:text-gray-400">Landing</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-lg text-gray-800 dark:text-gray-200">33</span> celkem souborů
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                )}

                </div>
            </div>
        </div>
    );
}

export default ThreadsDashboard;
