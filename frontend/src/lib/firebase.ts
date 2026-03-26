import { FirebaseApp, getApps, initializeApp } from 'firebase/app';

let firebaseClientApp: FirebaseApp | null = null;

export function initFirebaseClient(): FirebaseApp | null {
    if (firebaseClientApp) return firebaseClientApp;

    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
    const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
    if (!projectId || !apiKey) {
        return null;
    }

    const config = {
        apiKey,
        authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim() || undefined,
        projectId,
        storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim() || undefined,
        messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim() || undefined,
        appId: String(import.meta.env.VITE_FIREBASE_APP_ID || '').trim() || undefined,
    };

    if (!getApps().length) {
        firebaseClientApp = initializeApp(config);
    } else {
        firebaseClientApp = getApps()[0];
    }

    return firebaseClientApp;
}

export function isFirebaseClientConfigured(): boolean {
    return Boolean(String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim() && String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim());
}
