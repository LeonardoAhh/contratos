/**
 * Script para recalcular las fechas de fin de contrato
 * Actualiza todos los empleados existentes con la duración de 89 días
 * 
 * Ejecutar: node recalculate-contracts.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBeaxgsJG60gD1yj2_zuDgavnzS1Qyeg1g",
    authDomain: "capacitacion-33413.firebaseapp.com",
    projectId: "capacitacion-33413",
    storageBucket: "capacitacion-33413.firebasestorage.app",
    messagingSenderId: "87624642907",
    appId: "1:87624642907:web:4de9e4e637052770da2a7e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Duración del contrato: 89 días
const DIAS_CONTRATO = 89;

/**
 * Calcula la fecha de fin de contrato
 */
function calcularFinContrato(fechaIngreso) {
    if (!fechaIngreso) return null;
    const startDate = fechaIngreso.toDate ? fechaIngreso.toDate() : new Date(fechaIngreso);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + DIAS_CONTRATO);
    return endDate;
}

/**
 * Formatea fecha para mostrar
 */
function formatDate(date) {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  RECÁLCULO DE FECHAS DE CONTRATO - 89 DÍAS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📁 Obteniendo empleados de Firebase...');
    const snapshot = await getDocs(collection(db, 'employees'));

    console.log(`   ✓ ${snapshot.size} empleados encontrados\n`);

    let actualizados = 0;
    let sinCambios = 0;
    let errores = 0;

    console.log('🔄 Recalculando fechas de contrato...\n');

    for (const docSnap of snapshot.docs) {
        const emp = docSnap.data();
        const empId = docSnap.id;

        try {
            if (!emp.startDate) {
                console.log(`   ⚠ ${emp.fullName || empId}: Sin fecha de ingreso`);
                sinCambios++;
                continue;
            }

            // Calcular nueva fecha de fin de contrato
            const nuevaFechaFin = calcularFinContrato(emp.startDate);

            // Obtener fecha actual de fin de contrato
            const fechaActual = emp.contractEndDate
                ? (emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate))
                : null;

            // Comparar si son diferentes
            const fechasIguales = fechaActual && nuevaFechaFin &&
                fechaActual.toDateString() === nuevaFechaFin.toDateString();

            if (fechasIguales) {
                console.log(`   ⏭ ${emp.fullName}: Ya tiene fecha correcta (${formatDate(nuevaFechaFin)})`);
                sinCambios++;
                continue;
            }

            // Actualizar en Firebase
            await updateDoc(doc(db, 'employees', empId), {
                contractEndDate: Timestamp.fromDate(nuevaFechaFin),
                contractRecalculatedAt: Timestamp.now()
            });

            console.log(`   ✓ ${emp.fullName}`);
            console.log(`      Ingreso: ${formatDate(emp.startDate)}`);
            console.log(`      Anterior: ${formatDate(fechaActual)} → Nueva: ${formatDate(nuevaFechaFin)}`);

            actualizados++;

        } catch (error) {
            console.log(`   ❌ ${emp.fullName || empId}: ${error.message}`);
            errores++;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   📊 Total empleados:    ${snapshot.size}`);
    console.log(`   ✓ Actualizados:       ${actualizados}`);
    console.log(`   ⏭ Sin cambios:        ${sinCambios}`);
    console.log(`   ❌ Errores:            ${errores}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
