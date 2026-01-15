/**
 * Script de Importación de Empleados para Módulo de Capacitación
 * Carga datos del archivo employees.json a la colección employees_capacitacion
 * 
 * Ejecutar: node import-employees-capacitacion.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';

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

// Colección de destino
const COLLECTION_NAME = 'employees_capacitacion';

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

/**
 * Parsea fecha en formato M/D/YY o MM/DD/YY
 */
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;

    // Limpiar la cadena
    let fecha = fechaStr.replace(/\\/g, '/').trim();

    // Formato M/D/YY
    const partes = fecha.split('/');
    if (partes.length === 3) {
        let [mes, dia, año] = partes.map(p => parseInt(p, 10));

        // Ajustar año de 2 dígitos
        if (año < 100) {
            año = año >= 0 && año <= 30 ? 2000 + año : 1900 + año;
        }

        // Validar rangos
        if (mes < 1 || mes > 12) return null;
        if (dia < 1 || dia > 31) return null;

        return new Date(año, mes - 1, dia);
    }

    return null;
}

/**
 * Formatear nombre a Title Case
 */
function formatearNombre(nombre) {
    if (!nombre) return '';
    return nombre.split(' ').map(word => {
        if (word.length === 0) return '';
        const minusculas = ['de', 'del', 'la', 'las', 'los', 'el', 'y'];
        if (minusculas.includes(word.toLowerCase())) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

/**
 * Formatear departamento
 */
function formatearDepartamento(depto) {
    if (!depto) return '';
    return depto.charAt(0).toUpperCase() + depto.slice(1).toLowerCase();
}

/**
 * Transforma un registro del JSON al formato de Firestore
 */
function transformarEmpleado(emp) {
    const fechaIngreso = parsearFecha(emp.hireDate);

    return {
        employeeId: emp.id,
        name: formatearNombre(emp.name),
        position: emp.position || '',
        category: emp.category || '',
        department: formatearDepartamento(emp.deparment || ''), // Nota: typo en JSON original
        hireDate: fechaIngreso ? Timestamp.fromDate(fechaIngreso) : null,
        status: 'active',
        // Campos para capacitación
        trainings: [],
        certifications: [],
        notes: '',
        createdAt: Timestamp.now(),
        importedAt: Timestamp.now()
    };
}

// =============================================
// PROCESO PRINCIPAL
// =============================================

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  IMPORTADOR - Empleados Capacitación');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Leer archivo
    console.log('📁 Leyendo archivo src/data/employees.json...');
    let datos;
    try {
        const contenido = readFileSync('./src/data/employees.json', 'utf8');
        datos = JSON.parse(contenido);
    } catch (error) {
        console.error(`❌ Error al leer archivo: ${error.message}`);
        process.exit(1);
    }
    console.log(`   ✓ ${datos.length} registros encontrados\n`);

    // 2. Transformar datos
    console.log('🔄 Transformando datos...');
    const empleadosTransformados = datos.map(transformarEmpleado);

    // Mostrar preview
    console.log('\n📋 PREVIEW DE DATOS TRANSFORMADOS:');
    console.log('─────────────────────────────────────────────────────────');
    empleadosTransformados.slice(0, 3).forEach(emp => {
        console.log(`   ID: ${emp.employeeId} | ${emp.name}`);
        console.log(`      Puesto: ${emp.position}`);
        console.log(`      Depto: ${emp.department} | Cat: ${emp.category}`);
        console.log(`      Ingreso: ${emp.hireDate?.toDate().toLocaleDateString('es-MX') || 'N/A'}`);
        console.log('');
    });
    if (empleadosTransformados.length > 3) {
        console.log(`   ... y ${empleadosTransformados.length - 3} más\n`);
    }

    // 3. Verificar duplicados existentes
    console.log('🔍 Verificando duplicados en Firebase...');
    const existingSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const existingIds = new Set();
    existingSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.employeeId) {
            existingIds.add(data.employeeId);
        }
    });
    console.log(`   ✓ ${existingIds.size} empleados ya existen en la colección\n`);

    // 4. Cargar a Firebase
    console.log(`☁️ Cargando a Firebase (colección: ${COLLECTION_NAME})...`);
    let importados = 0;
    let duplicados = 0;
    let erroresFirebase = 0;

    for (const emp of empleadosTransformados) {
        try {
            // Verificar si ya existe
            if (existingIds.has(emp.employeeId)) {
                duplicados++;
                continue;
            }

            // Crear documento
            const docId = `cap_emp_${emp.employeeId}`;
            await setDoc(doc(db, COLLECTION_NAME, docId), emp);
            console.log(`   ✓ ${emp.employeeId} - ${emp.name}`);
            importados++;

        } catch (error) {
            console.log(`   ❌ Error con ${emp.employeeId}: ${error.message}`);
            erroresFirebase++;
        }
    }

    // 5. Resumen final
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESUMEN DE IMPORTACIÓN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   📊 Total en archivo:     ${datos.length}`);
    console.log(`   ✓ Importados:           ${importados}`);
    console.log(`   ⏭ Duplicados omitidos:  ${duplicados}`);
    console.log(`   ❌ Errores Firebase:     ${erroresFirebase}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Guardar reporte
    const reporte = {
        fecha: new Date().toISOString(),
        archivo: 'src/data/employees.json',
        coleccion: COLLECTION_NAME,
        totalRegistros: datos.length,
        importados,
        duplicados,
        erroresFirebase
    };

    writeFileSync('./import-capacitacion-report.json', JSON.stringify(reporte, null, 2));
    console.log('📄 Reporte guardado en: import-capacitacion-report.json\n');

    process.exit(0);
}

// Ejecutar
main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
