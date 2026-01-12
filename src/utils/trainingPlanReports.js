/**
 * Funciones de exportación para reportes del Plan de Formación RG-REC-048
 * Utiliza APIs nativas del navegador para generar archivos sin dependencias externas
 */

/**
 * Formatea fecha para mostrar en reportes
 */
const formatDate = (date) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Obtiene el mes y año de una fecha
 */
const getMonthYear = (date) => {
    if (!date) return 'Sin fecha';
    const d = date.toDate ? date.toDate() : new Date(date);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Obtiene el estado del plan de formación
 */
const getStatus = (emp) => {
    const delivered = emp.trainingPlan?.delivered || emp.formRGREC048Delivered;
    if (delivered) return 'Entregado';

    const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
    if (!dueDate) return 'Pendiente';

    const now = new Date();
    if (new Date(dueDate) < now) return 'Vencido';
    return 'Pendiente';
};

/**
 * Prepara datos agrupados por mes y departamento
 */
export const prepareReportData = (employees) => {
    const data = {};

    employees.forEach(emp => {
        const dueDate = emp.trainingPlan?.dueDate;
        const monthKey = getMonthYear(dueDate);
        const dept = emp.department || 'SIN DEPARTAMENTO';

        if (!data[monthKey]) {
            data[monthKey] = {};
        }

        if (!data[monthKey][dept]) {
            data[monthKey][dept] = [];
        }

        data[monthKey][dept].push({
            employeeNumber: emp.employeeNumber || '',
            fullName: emp.fullName || '',
            area: emp.area || '',
            position: emp.position || '',
            startDate: formatDate(emp.startDate),
            dueDate: formatDate(emp.trainingPlan?.dueDate),
            status: getStatus(emp)
        });
    });

    return data;
};

/**
 * Exporta a CSV (compatible con Excel)
 */
export const exportToExcel = (employees, filename = 'reporte_plan_formacion') => {
    const data = prepareReportData(employees);

    // Header
    let csv = 'Mes,Departamento,No. Empleado,Nombre Completo,Área,Puesto,Fecha Ingreso,Fecha Límite,Estado\n';

    // Sort months chronologically
    const sortedMonths = Object.keys(data).sort((a, b) => {
        const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });

    sortedMonths.forEach(month => {
        const departments = Object.keys(data[month]).sort();

        departments.forEach(dept => {
            data[month][dept].forEach(emp => {
                // Escapar comillas y comas en campos
                const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;

                csv += [
                    escape(month),
                    escape(dept),
                    escape(emp.employeeNumber),
                    escape(emp.fullName),
                    escape(emp.area),
                    escape(emp.position),
                    escape(emp.startDate),
                    escape(emp.dueDate),
                    escape(emp.status)
                ].join(',') + '\n';
            });
        });
    });

    // Agregar BOM para UTF-8 (para que Excel reconozca acentos)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Genera estadísticas por departamento
 */
const getDepartmentStats = (employees) => {
    const stats = {};

    employees.forEach(emp => {
        const dept = emp.department || 'SIN DEPARTAMENTO';
        if (!stats[dept]) {
            stats[dept] = { total: 0, delivered: 0, pending: 0, overdue: 0 };
        }

        stats[dept].total++;
        const status = getStatus(emp);
        if (status === 'Entregado') stats[dept].delivered++;
        else if (status === 'Vencido') stats[dept].overdue++;
        else stats[dept].pending++;
    });

    return stats;
};

/**
 * Exporta a PDF usando API nativa del navegador
 */
export const exportToPDF = (employees, filename = 'reporte_plan_formacion') => {
    const data = prepareReportData(employees);
    const stats = getDepartmentStats(employees);

    // Crear contenido HTML para imprimir
    const printWindow = window.open('', '_blank');

    const today = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    // Calcular totales globales
    const globalStats = Object.values(stats).reduce((acc, s) => ({
        total: acc.total + s.total,
        delivered: acc.delivered + s.delivered,
        pending: acc.pending + s.pending,
        overdue: acc.overdue + s.overdue
    }), { total: 0, delivered: 0, pending: 0, overdue: 0 });

    const percentage = globalStats.total > 0
        ? Math.round((globalStats.delivered / globalStats.total) * 100)
        : 0;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reporte Plan de Formación RG-REC-048</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px;
                font-size: 11px;
            }
            h1 { 
                text-align: center; 
                color: #333;
                font-size: 18px;
                margin-bottom: 5px;
            }
            .subtitle {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-bottom: 20px;
            }
            .summary {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .summary h2 {
                margin: 0 0 10px 0;
                font-size: 14px;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            .summary-item {
                text-align: center;
            }
            .summary-number {
                font-size: 24px;
                font-weight: bold;
            }
            .summary-label {
                font-size: 10px;
                color: #666;
            }
            .success { color: #22c55e; }
            .warning { color: #f59e0b; }
            .danger { color: #ef4444; }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px;
                font-size: 10px;
            }
            th { 
                background: #333; 
                color: white;
                padding: 8px 4px;
                text-align: left;
            }
            td { 
                border: 1px solid #ddd; 
                padding: 6px 4px;
            }
            tr:nth-child(even) { background: #f9f9f9; }
            .month-header {
                background: #0066cc;
                color: white;
                padding: 10px;
                margin: 20px 0 10px 0;
                font-weight: bold;
            }
            .dept-header {
                background: #e0e0e0;
                padding: 8px;
                font-weight: bold;
                margin: 10px 0 5px 0;
            }
            .status-entregado { color: #22c55e; font-weight: bold; }
            .status-pendiente { color: #f59e0b; }
            .status-vencido { color: #ef4444; font-weight: bold; }
            .dept-stats {
                margin-bottom: 20px;
            }
            .dept-stats table {
                font-size: 11px;
            }
            @media print {
                .no-print { display: none; }
                body { margin: 0; }
            }
        </style>
    </head>
    <body>
        <h1>Reporte Plan de Formación RG-REC-048</h1>
        <p class="subtitle">Generado el ${today}</p>
        
        <div class="summary">
            <h2>Resumen Global</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-number">${globalStats.total}</div>
                    <div class="summary-label">Total Empleados</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number success">${globalStats.delivered}</div>
                    <div class="summary-label">Entregados</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number warning">${globalStats.pending}</div>
                    <div class="summary-label">Pendientes</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number danger">${globalStats.overdue}</div>
                    <div class="summary-label">Vencidos</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <strong>Cumplimiento Global: ${percentage}%</strong>
            </div>
        </div>
        
        <div class="dept-stats">
            <h2>Estadísticas por Departamento</h2>
            <table>
                <thead>
                    <tr>
                        <th>Departamento</th>
                        <th>Total</th>
                        <th>Entregados</th>
                        <th>Pendientes</th>
                        <th>Vencidos</th>
                        <th>Cumplimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0])).map(([dept, s]) => `
                        <tr>
                            <td><strong>${dept}</strong></td>
                            <td>${s.total}</td>
                            <td class="success">${s.delivered}</td>
                            <td class="warning">${s.pending}</td>
                            <td class="danger">${s.overdue}</td>
                            <td>${s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <h2>Detalle por Mes y Departamento</h2>
    `;

    // Sort months
    const sortedMonths = Object.keys(data).sort((a, b) => {
        const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });

    sortedMonths.forEach(month => {
        html += `<div class="month-header">📅 ${month}</div>`;

        const departments = Object.keys(data[month]).sort();

        departments.forEach(dept => {
            const deptEmps = data[month][dept];
            const deptDelivered = deptEmps.filter(e => e.status === 'Entregado').length;

            html += `
                <div class="dept-header">
                    ${dept} (${deptDelivered}/${deptEmps.length} entregados)
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">No. Emp</th>
                            <th style="width: 180px;">Nombre</th>
                            <th>Área</th>
                            <th>Puesto</th>
                            <th style="width: 70px;">F. Límite</th>
                            <th style="width: 60px;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deptEmps.map(emp => `
                            <tr>
                                <td>${emp.employeeNumber}</td>
                                <td>${emp.fullName}</td>
                                <td>${emp.area}</td>
                                <td>${emp.position}</td>
                                <td>${emp.dueDate}</td>
                                <td class="status-${emp.status.toLowerCase()}">${emp.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        });
    });

    html += `
        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 10px;">
            Sistema de Gestión de Contratos - ${today}
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="
                background: #0066cc;
                color: white;
                border: none;
                padding: 10px 30px;
                font-size: 14px;
                cursor: pointer;
                border-radius: 5px;
            ">
                📄 Imprimir / Guardar como PDF
            </button>
            <button onclick="window.close()" style="
                background: #666;
                color: white;
                border: none;
                padding: 10px 30px;
                font-size: 14px;
                cursor: pointer;
                border-radius: 5px;
                margin-left: 10px;
            ">
                ✕ Cerrar
            </button>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
