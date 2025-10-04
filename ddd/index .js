const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * 🤖 GEMINI API CLOUD FUNCTION
 * Přeneseno z client-side pro bezpečnost
 */
exports.callGeminiAPI = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Není přihlášen');
    }

    const { prompt } = data;
    if (!prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Prompt je povinný');
    }

    try {
        const apiKey = functions.config().gemini?.api_key;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
        });

        const result = await response.json();
        return { 
            success: true, 
            text: result.candidates[0].content.parts[0].text.trim()
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 🔍 UNIFIED SEARCH
 * Vyhledávání napříč kolekcemi
 */
exports.unifiedSearch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Není přihlášen');
    }

    const { query } = data;
    const uid = context.auth.uid;

    // Implementace unified search...
    return { success: true, results: [] };
});
