/**
 * Utilidades para cálculo de contratos
 * La duración del contrato es de 89 días a partir de la fecha de ingreso
 */

// Duración del contrato en días
export const CONTRACT_DURATION_DAYS = 89;

/**
 * Calcula la fecha de fin de contrato basándose en la fecha de ingreso
 * @param {Date|string} startDate - Fecha de ingreso
 * @returns {Date|null} - Fecha de fin de contrato (89 días después)
 */
export function calculateContractEndDate(startDate) {
    if (!startDate) return null;

    const start = startDate instanceof Date ? startDate : new Date(startDate);

    if (isNaN(start.getTime())) return null;

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + CONTRACT_DURATION_DAYS);

    return endDate;
}

/**
 * Calcula los días restantes del contrato
 * @param {Date|string|object} contractEndDate - Fecha de fin de contrato
 * @returns {number|null} - Días restantes (negativo si ya venció)
 */
export function getDaysUntilContractEnd(contractEndDate) {
    if (!contractEndDate) return null;

    // Manejar Firestore Timestamp
    const endDate = contractEndDate.toDate
        ? contractEndDate.toDate()
        : new Date(contractEndDate);

    if (isNaN(endDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Obtiene el estado del contrato basándose en los días restantes
 * @param {number} daysRemaining - Días restantes
 * @returns {object} - { status, color, label }
 */
export function getContractStatus(daysRemaining) {
    if (daysRemaining === null) {
        return { status: 'unknown', color: 'neutral', label: 'Sin fecha' };
    }

    if (daysRemaining < 0) {
        return { status: 'expired', color: 'danger', label: 'Vencido' };
    }

    if (daysRemaining <= 7) {
        return { status: 'critical', color: 'danger', label: 'Por vencer' };
    }

    if (daysRemaining <= 15) {
        return { status: 'warning', color: 'warning', label: 'Próximo a vencer' };
    }

    return { status: 'active', color: 'success', label: 'Vigente' };
}

/**
 * Formatea una fecha al formato local mexicano
 * @param {Date|string|object} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export function formatDate(date) {
    if (!date) return '-';

    const d = date.toDate ? date.toDate() : new Date(date);

    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
