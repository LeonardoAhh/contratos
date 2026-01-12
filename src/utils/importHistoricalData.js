import { collection, getDocs, doc, setDoc, addDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateTrainingPlanDueDate } from './trainingPlanHelpers';

/**
 * Normaliza nombres de departamentos para que coincidan con las reglas
 */
const normalizeDepartment = (dept) => {
    const normalizations = {
        'ALMACEN': 'ALMACÉN',
        'TALLER DE MOLDES': 'TALLER DE MOLDES'
    };
    return normalizations[dept] || dept;
};

/**
 * Normaliza nombres de áreas
 */
const normalizeArea = (area) => {
    // Agregar normalizaciones si es necesario
    return area;
};

/**
 * Parsea fecha en formato MM/DD/YYYY a Date object
 */
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [month, day, year] = dateStr.split('/');
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
};

/**
 * Busca un empleado por número
 */
const findEmployeeByNumber = async (employeeNumber) => {
    try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('employeeNumber', '==', String(employeeNumber)));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error(`Error buscando empleado ${employeeNumber}:`, error);
        return null;
    }
};

/**
 * Importa datos históricos del plan de formación desde datos.json
 * - Actualiza empleados existentes con estado de entrega
 * - Crea nuevos empleados si no existen
 */
export async function importHistoricalTrainingPlanData() {
    console.log('🚀 Iniciando importación de datos históricos...');

    try {
        // Cargar datos.json dinámicamente desde public/ para evitar caché de módulos ES6
        console.log('📥 Cargando datos.json desde /datos.json...');
        const response = await fetch('/datos.json');

        if (!response.ok) {
            throw new Error(`Error cargando datos.json: ${response.status} ${response.statusText}`);
        }

        const datosHistoricos = await response.json();
        console.log(`📊 Total de registros cargados del archivo: ${datosHistoricos.length}`);

        if (!Array.isArray(datosHistoricos)) {
            throw new Error('datos.json no contiene un array válido');
        }

        if (datosHistoricos.length === 0) {
            throw new Error('datos.json está vacío');
        }

        let updated = 0;
        let created = 0;
        let skipped = 0;
        let errors = 0;
        const errorDetails = [];

        for (const emp of datosHistoricos) {
            try {
                const employeeNumber = String(emp["No Empleado"]);
                const fullName = emp["Nombre completo"];
                const department = normalizeDepartment(emp["Departamento"]);
                const area = normalizeArea(emp["Área"]);
                const position = emp["Puesto"] || '';
                const startDate = parseDate(emp["Fecha Ingreso"]);
                const isDelivered = emp["RG-REC-048"] === "Entregado";

                if (!startDate) {
                    console.warn(`⚠️ Fecha inválida para empleado ${employeeNumber}`);
                    skipped++;
                    continue;
                }

                // Buscar empleado existente
                const existing = await findEmployeeByNumber(employeeNumber);

                if (existing) {
                    // ACTUALIZAR empleado existente
                    await setDoc(doc(db, 'employees', existing.id), {
                        ...existing,
                        trainingPlan: {
                            ...existing.trainingPlan,
                            delivered: isDelivered,
                            deliveredAt: isDelivered ? Timestamp.now() : null,
                            importedFrom: 'datos.json',
                            importedAt: Timestamp.now()
                        },
                        formRGREC048Delivered: isDelivered // Mantener compatibilidad
                    });

                    updated++;
                    console.log(`✅ Actualizado: ${fullName} (${employeeNumber}) - ${isDelivered ? 'Entregado' : 'Pendiente'}`);
                } else {
                    // CREAR nuevo empleado
                    const { dueDate, dueDays } = calculateTrainingPlanDueDate(startDate, department, area);

                    const newEmployee = {
                        employeeNumber,
                        fullName,
                        department,
                        area,
                        position,
                        shift: '', // No disponible en datos.json
                        startDate: Timestamp.fromDate(startDate),
                        contractEndDate: null, // Solo plan de formación, sin contrato
                        status: 'active',
                        trainingPlan: {
                            delivered: isDelivered,
                            deliveredAt: isDelivered ? Timestamp.now() : null,
                            dueDate: Timestamp.fromDate(dueDate),
                            dueDays,
                            importedFrom: 'datos.json',
                            importedAt: Timestamp.now()
                        },
                        formRGREC048Delivered: isDelivered,
                        evaluations: {
                            day30: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
                            day60: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
                            day75: { score: null, requiresFollowUp: false, notes: '', completedAt: null }
                        },
                        createdAt: Timestamp.now(),
                        importedAt: Timestamp.now()
                    };

                    // Usar addDoc para que Firestore genere el ID automáticamente
                    const employeesRef = collection(db, 'employees');
                    await addDoc(employeesRef, newEmployee);

                    created++;
                    console.log(`➕ Creado: ${fullName} (${employeeNumber}) - ${department}/${area}`);
                }
            } catch (error) {
                errors++;
                const empInfo = `${emp["Nombre completo"]} (${emp["No Empleado"]})`;
                errorDetails.push({ employee: empInfo, error: error.message });
                console.error(`❌ Error con ${empInfo}:`, error);
            }
        }

        const result = {
            total: datosHistoricos.length,
            updated,
            created,
            skipped,
            errors,
            errorDetails
        };

        console.log('\n📊 Resultado de importación:');
        console.log(`  Total registros: ${result.total}`);
        console.log(`  ✅ Actualizados: ${result.updated}`);
        console.log(`  ➕ Creados: ${result.created}`);
        console.log(`  ⏭️  Omitidos: ${result.skipped}`);
        console.log(`  ❌ Errores: ${result.errors}`);

        if (errorDetails.length > 0) {
            console.log('\n❌ Detalles de errores:');
            errorDetails.forEach(({ employee, error }) => {
                console.log(`  - ${employee}: ${error}`);
            });
        }

        return result;
    } catch (error) {
        console.error('❌ Error crítico en importación:', error);
        throw error;
    }
}
