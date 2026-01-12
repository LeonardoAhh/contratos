import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { getTrainingPlanStats } from '../utils/trainingPlanHelpers';

export default function TrainingPlanIndicator({ employees }) {
    const stats = getTrainingPlanStats(employees);

    // Ordenar departamentos por cantidad de planes vencidos (mayor a menor)
    const departments = Object.values(stats).sort((a, b) => b.overdue - a.overdue);

    if (departments.length === 0) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>Plan de Formación RG-REC-048</h3>
                </div>
                <div className="card-body">
                    <p className="text-sm text-muted">No hay empleados registrados</p>
                </div>
            </div>
        );
    }

    // Calcular totales globales
    const globalTotal = departments.reduce((sum, dept) => sum + dept.total, 0);
    const globalDelivered = departments.reduce((sum, dept) => sum + dept.delivered, 0);
    const globalOverdue = departments.reduce((sum, dept) => sum + dept.overdue, 0);
    const globalPercentage = globalTotal > 0 ? Math.round((globalDelivered / globalTotal) * 100) : 0;

    return (
        <div className="card">
            <div className="card-header">
                <h3>Indicador Plan de Formación RG-REC-048</h3>
            </div>
            <div className="card-body">
                {/* Resumen global */}
                <div style={{
                    padding: '16px',
                    background: 'var(--neutral-50)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Global</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{globalDelivered}/{globalTotal}</div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: globalPercentage >= 80 ? 'var(--success)' : globalPercentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                            {globalPercentage}%
                        </div>
                    </div>

                    {/* Barra de progreso global */}
                    <div style={{
                        height: '8px',
                        background: 'var(--neutral-200)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${globalPercentage}%`,
                            background: globalPercentage >= 80 ? 'var(--success)' : globalPercentage >= 50 ? 'var(--warning)' : 'var(--danger)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>

                    {globalOverdue > 0 && (
                        <div className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                            <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                            {globalOverdue} vencidos sin entregar
                        </div>
                    )}
                </div>

                {/* Lista de departamentos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {departments.map(dept => {
                        const percentage = dept.total > 0 ? Math.round((dept.delivered / dept.total) * 100) : 0;
                        const areas = Object.values(dept.areas);

                        return (
                            <div key={dept.department} style={{
                                padding: '12px',
                                background: 'var(--neutral-50)',
                                borderRadius: '8px',
                                border: dept.overdue > 0 ? '1px solid var(--danger)' : '1px solid var(--neutral-200)'
                            }}>
                                {/* Header del departamento */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{dept.department}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {dept.delivered}/{dept.total} entregados
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        color: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                        {percentage}%
                                    </div>
                                </div>

                                {/* Barra de progreso del departamento */}
                                <div style={{
                                    height: '6px',
                                    background: 'var(--neutral-200)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${percentage}%`,
                                        background: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>

                                {/* Áreas del departamento */}
                                {areas.length > 1 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                        {areas.map(area => (
                                            <div key={area.area} style={{ marginBottom: '4px' }}>
                                                • {area.area}: {area.delivered}/{area.total}
                                                {area.overdue > 0 && (
                                                    <span className="text-danger" style={{ marginLeft: '4px' }}>
                                                        ({area.overdue} vencido{area.overdue > 1 ? 's' : ''})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Badge de vencidos */}
                                {dept.overdue > 0 && (
                                    <div className="badge badge-danger" style={{ fontSize: '0.7rem', marginTop: '8px' }}>
                                        <AlertTriangle size={10} style={{ marginRight: '4px' }} />
                                        {dept.overdue} vencido{dept.overdue > 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
