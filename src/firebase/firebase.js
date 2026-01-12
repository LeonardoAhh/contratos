import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración de Firebase
// En producción puedes usar variables de entorno:
// import.meta.env.VITE_FIREBASE_API_KEY
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBeaxgsJG60gD1yj2_zuDgavnzS1Qyeg1g",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "capacitacion-33413.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "capacitacion-33413",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "capacitacion-33413.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "87624642907",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:87624642907:web:4de9e4e637052770da2a7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
