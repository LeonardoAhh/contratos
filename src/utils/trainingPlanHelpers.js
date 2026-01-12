import trainingPlanRules from '../data/trainingPlanRules.json';

/**
 * Calcula la fecha límite para entregar el plan de formación RG-REC-048
 * basándose en el departamento y área del empleado
 * 
 * @param {Date} startDate - Fecha de ingreso del empleado
 * @param {string} department - Departamento del empleado
 * @param {string} area - Área del empleado
 * @returns {Object} { dueDate: Date, dueDays: number }
 */
export function calculateTrainingPlanDueDate(startDate, department, area) {
    if (!startDate || !department || !area) {
        return { dueDate: null, dueDays: 60 }; // Default: 2 meses
    }

    // Buscar la regla correspondiente
    const rule = trainingPlanRules.find(r =>
        r.DEPARTAMENTO.toUpperCase() === department.toUpperCase() &&
        r.ÁREA.toUpperCase() === area.toUpperCase()
    );

    let dueDays = 60; // Default: 2 meses

    if (rule) {
        const tiempo = rule.TIEMPO.toUpperCase();

        if (tiempo.includes('7 DÍAS') || tiempo.includes('7 DIAS')) {
            dueDays = 7;
        } else if (tiempo.includes('3 MESES')) {
            dueDays = 90;
        } else if (tiempo.includes('2 MESES')) {
            dueDays = 60;
        }
    }

    // Calcular fecha límite
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + dueDays);

    return { dueDate, dueDays };
}

/**
 * Verifica si el plan de formación está vencido
 * 
 * @param {Date} dueDate - Fecha límite
 * @param {boolean} delivered - Si ya fue entregado
 * @returns {boolean}
 */
export function isTrainingPlanOverdue(dueDate, delivered) {
    if (delivered || !dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    return today > due;
}

/**
 * Calcula días restantes hasta la fecha límite
 * 
 * @param {Date} dueDate - Fecha límite
 * @returns {number} Días restantes (negativo si está vencido)
 */
export function getDaysUntilDue(dueDate) {
    if (!dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene el estado del plan de formación
 * 
 * @param {boolean} delivered
 * @param {Date} dueDate
 * @returns {Object} { status: 'delivered' | 'pending' | 'overdue', label: string, color: string }
 */
export function getTrainingPlanStatus(delivered, dueDate) {
    if (delivered) {
        return {
            status: 'delivered',
            label: 'Entregado',
            color: 'success'
        };
    }

    if (isTrainingPlanOverdue(dueDate, delivered)) {
        return {
            status: 'overdue',
            label: 'Vencido',
            color: 'danger'
        };
    }

    const daysLeft = getDaysUntilDue(dueDate);
    if (daysLeft <= 3 && daysLeft >= 0) {
        return {
            status: 'warning',
            label: 'Próximo a vencer',
            color: 'warning'
        };
    }

    return {
        status: 'pending',
        label: 'Pendiente',
        color: 'info'
    };
}

/**
 * Agrupa empleados por departamento y área para el indicador
 * 
 * @param {Array} employees - Lista de empleados
 * @returns {Object} Datos agrupados con estadísticas
 */
export function getTrainingPlanStats(employees) {
    const stats = {};

    employees.forEach(emp => {
        if (!emp.department || !emp.area) return;

        const deptKey = emp.department;
        if (!stats[deptKey]) {
            stats[deptKey] = {
                department: emp.department,
                areas: {},
                total: 0,
                delivered: 0,
                overdue: 0
            };
        }

        const areaKey = emp.area;
        if (!stats[deptKey].areas[areaKey]) {
            stats[deptKey].areas[areaKey] = {
                area: emp.area,
                employees: [],
                total: 0,
                delivered: 0,
                overdue: 0
            };
        }

        const isDelivered = emp.trainingPlan?.delivered || emp.formRGREC048Delivered || false;
        const dueDate = emp.trainingPlan?.dueDate?.toDate ? emp.trainingPlan.dueDate.toDate() : null;
        const isOverdue = isTrainingPlanOverdue(dueDate, isDelivered);

        stats[deptKey].areas[areaKey].employees.push({
            id: emp.id,
            name: emp.fullName,
            delivered: isDelivered,
            overdue: isOverdue,
            dueDate
        });

        stats[deptKey].areas[areaKey].total++;
        stats[deptKey].total++;

        if (isDelivered) {
            stats[deptKey].areas[areaKey].delivered++;
            stats[deptKey].delivered++;
        }

        if (isOverdue) {
            stats[deptKey].areas[areaKey].overdue++;
            stats[deptKey].overdue++;
        }
    });

    return stats;
}
