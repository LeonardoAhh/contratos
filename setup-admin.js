/**
 * Script para crear el primer administrador
 * 
 * Ejecutar en la consola del navegador después de abrir la aplicación:
 * 1. Abre la app en http://localhost:5173
 * 2. Abre DevTools (F12) > Console
 * 3. Pega y ejecuta este código
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './src/firebase/firebase.js';

async function createFirstAdmin(email, password, name) {
    try {
        // Crear usuario en Firebase Auth
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Crear documento de admin en Firestore
        await setDoc(doc(db, 'admins', result.user.uid), {
            email,
            name,
            createdAt: Timestamp.now(),
            createdBy: 'system'
        });

        console.log('✅ Administrador creado exitosamente');
        console.log('Email:', email);
        console.log('UID:', result.user.uid);

        return { success: true, uid: result.user.uid };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error: error.message };
    }
}

// Exportar para uso en consola
window.createFirstAdmin = createFirstAdmin;

console.log('📋 Script de setup cargado');
console.log('Usa: createFirstAdmin("email@ejemplo.com", "contraseña", "Nombre")');
