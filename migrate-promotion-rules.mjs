/**
 * Script para migrar las reglas de promoción del archivo JSON a Firebase
 * Colección: rules_promotion
 * 
 * Uso: node migrate-promotion-rules.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Configuración de Firebase (usa las mismas credenciales del proyecto)
const firebaseConfig = {
    apiKey: "AIzaSyDZPzq8VCFL2P7jn_0mAoFTuXy-mCMSalk",
    authDomain: "gestion-contratos-a41b8.firebaseapp.com",
    projectId: "gestion-contratos-a41b8",
    storageBucket: "gestion-contratos-a41b8.firebasestorage.app",
    messagingSenderId: "855aborrar26787616",
    appId: "1:855026787616:web:e6f09d4f1b9e76d2f7fd04"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Leer las reglas del archivo JSON
const rulesJson = JSON.parse(readFileSync('./src/data/promotionRules.json', 'utf8'));

async function migrateRules() {
    console.log('🚀 Iniciando migración de reglas de promoción...');
    console.log(`📋 Total de reglas a migrar: ${rulesJson.length}`);

    // Primero, verificar si ya existen reglas
    const existingRules = await getDocs(collection(db, 'rules_promotion'));
    if (!existingRules.empty) {
        console.log(`⚠️  Ya existen ${existingRules.size} reglas en Firebase.`);
        console.log('¿Deseas borrar las existentes y recargar? (El script continuará en 5 segundos...)');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Borrar reglas existentes
        console.log('🗑️  Borrando reglas existentes...');
        for (const docSnap of existingRules.docs) {
            await deleteDoc(doc(db, 'rules_promotion', docSnap.id));
        }
        console.log('✅ Reglas existentes borradas.');
    }

    // Migrar cada regla
    let migrated = 0;
    for (const rule of rulesJson) {
        const ruleData = {
            currentPosition: rule["current position"].trim().toUpperCase(),
            promotion: rule.promotion.trim().toUpperCase(),
            lastChange: parseInt(rule["last change"]) || 6,
            examGrade: parseInt(rule["exam grade"]) || 80,
            courseCoverage: parseInt(rule["course coverage"]) || 60,
            performanceRating: parseInt(rule["performance rating"]) || 80,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        try {
            await addDoc(collection(db, 'rules_promotion'), ruleData);
            migrated++;
            if (migrated % 10 === 0) {
                console.log(`   Migradas ${migrated}/${rulesJson.length} reglas...`);
            }
        } catch (error) {
            console.error(`❌ Error migrando regla "${rule["current position"]}":`, error.message);
        }
    }

    console.log(`\n✅ Migración completada: ${migrated}/${rulesJson.length} reglas migradas a 'rules_promotion'`);
    process.exit(0);
}

migrateRules().catch(error => {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
});
