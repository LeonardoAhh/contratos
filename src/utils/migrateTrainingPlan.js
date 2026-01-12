import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateTrainingPlanDueDate } from '../utils/trainingPlanHelpers';

/**
 * Migración para agregar campo trainingPlan a empleados existentes
 * Calcula automáticamente la fecha límite según departamento/área
 */
export async function migrateEmployeesTrainingPlan() {
    console.log('🚀 Iniciando migración de Plan de Formación...');

    try {
        const employeesRef = collection(db, 'employees');
        const snapshot = await getDocs(employeesRef);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const docSnapshot of snapshot.docs) {
            const employee = docSnapshot.data();

            // Skip si ya tiene el campo nuevo
            if (employee.trainingPlan && employee.trainingPlan.dueDate) {
                skipped++;
                continue;
            }

            try {
                const startDate = employee.startDate?.toDate ? employee.startDate.toDate() : new Date(employee.startDate);
                const { dueDate, dueDays } = calculateTrainingPlanDueDate(
                    startDate,
                    employee.department,
                    employee.area
                );

                const trainingPlan = {
                    delivered: employee.formRGREC048Delivered || false,
                    deliveredAt: employee.formRGREC048Delivered ? Timestamp.now() : null,
                    dueDate: Timestamp.fromDate(dueDate),
                    dueDays: dueDays,
                    migratedAt: Timestamp.now()
                };

                await updateDoc(doc(db, 'employees', docSnapshot.id), {
                    trainingPlan
                });

                updated++;
                console.log(`✅ ${employee.fullName} - ${employee.department}/${employee.area} - ${dueDays} días`);
            } catch (error) {
                errors++;
                console.error(`❌ Error en ${employee.fullName}:`, error);
            }
        }

        const result = {
            total: snapshot.docs.length,
            updated,
            skipped,
            errors
        };

        console.log('\n📊 Resultado de migración:');
        console.log(`  Total empleados: ${result.total}`);
        console.log(`  ✅ Actualizados: ${result.updated}`);
        console.log(`  ⏭️  Omitidos: ${result.skipped}`);
        console.log(`  ❌ Errores: ${result.errors}`);

        return result;
    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    }
}
