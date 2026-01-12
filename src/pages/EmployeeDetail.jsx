import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import { usePermissions } from '../components/PermissionGuard';
import {
    calculateTrainingPlanDueDate,
    getTrainingPlanStatus,
    getDaysUntilDue
} from '../utils/trainingPlanHelpers';
import {
    ArrowLeft,
    Edit,
    Trash2,
    CheckCircle,
    AlertCircle,
    Clock,
    FileText,
    Users,
    Bell,
    Settings,
    RefreshCw,
    Star
} from 'lucide-react';

export default function EmployeeDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { canEditEmployees, canDeleteEmployees, canRenewContracts, canManageEvaluations } = usePermissions();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEvalModal, setShowEvalModal] = useState(null);
    const [evalForm, setEvalForm] = useState({ score: '', requiresFollowUp: false, notes: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewDays, setRenewDays] = useState(90);
    const [markingPlanDelivered, setMarkingPlanDelivered] = useState(false);

    useEffect(() => {
        loadEmployee();
    }, [id]);

    const loadEmployee = async () => {
        try {
            const docRef = doc(db, 'employees', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setEmployee(data);
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Error loading employee:', error);
        }
        setLoading(false);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getEvaluationDate = (startDate, days) => {
        if (!startDate) return null;
        const d = startDate.toDate ? startDate.toDate() : new Date(startDate);
        d.setDate(d.getDate() + days);
        return d;
    };

    const getEvaluationStatus = (eval_, targetDate) => {
        if (eval_?.score !== null && eval_?.score !== undefined) {
            return 'completed';
        }

        const today = new Date();
        const target = targetDate;

        if (!target) return 'future';

        const daysUntil = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return 'overdue';
        if (daysUntil <= 5) return 'pending';
        return 'future';
    };

    const handleSaveEvaluation = async () => {
        if (!evalForm.score || evalForm.score < 0 || evalForm.score > 100) {
            alert('Por favor ingresa una calificación válida (0-100)');
            return;
        }

        try {
            const evalKey = `day${showEvalModal}`;
            const updatedEvaluations = {
                ...employee.evaluations,
                [evalKey]: {
                    score: parseInt(evalForm.score),
                    requiresFollowUp: evalForm.requiresFollowUp,
                    notes: evalForm.notes,
                    completedAt: Timestamp.now()
                }
            };

            await updateDoc(doc(db, 'employees', id), {
                evaluations: updatedEvaluations
            });

            setEmployee(prev => ({
                ...prev,
                evaluations: updatedEvaluations
            }));

            setShowEvalModal(null);
            setEvalForm({ score: '', requiresFollowUp: false, notes: '' });
        } catch (error) {
            console.error('Error saving evaluation:', error);
            alert('Error al guardar la evaluación');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, 'employees', id));
            navigate('/');
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Error al eliminar el empleado');
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateDoc(doc(db, 'employees', id), { status: newStatus });
            setEmployee(prev => ({ ...prev, status: newStatus }));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Renovar contrato
    const handleRenewContract = async () => {
        try {
            const currentEndDate = employee.contractEndDate?.toDate
                ? employee.contractEndDate.toDate()
                : new Date(employee.contractEndDate || Date.now());

            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + parseInt(renewDays));

            await updateDoc(doc(db, 'employees', id), {
                contractEndDate: Timestamp.fromDate(newEndDate),
                status: 'active',
                renewedAt: Timestamp.now(),
                previousContractEnd: employee.contractEndDate
            });

            setEmployee(prev => ({
                ...prev,
                contractEndDate: Timestamp.fromDate(newEndDate),
                status: 'active'
            }));

            setShowRenewModal(false);
            alert('Contrato renovado exitosamente');
        } catch (error) {
            console.error('Error renewing contract:', error);
            alert('Error al renovar el contrato');
        }
    };

    // Toggle favorito
    const toggleFavorite = async () => {
        try {
            await updateDoc(doc(db, 'employees', id), {
                isFavorite: !employee.isFavorite
            });
            setEmployee(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    // Marcar plan de formación como entregado
    const handleMarkTrainingPlanDelivered = async () => {
        setMarkingPlanDelivered(true);
        try {
            await updateDoc(doc(db, 'employees', id), {
                'trainingPlan.delivered': true,
                'trainingPlan.deliveredAt': Timestamp.now(),
                formRGREC048Delivered: true // Mantener compatibilidad
            });
            setEmployee(prev => ({
                ...prev,
                trainingPlan: {
                    ...prev.trainingPlan,
                    delivered: true,
                    deliveredAt: Timestamp.now()
                },
                formRGREC048Delivered: true
            }));
            alert('Plan de formación marcado como entregado');
        } catch (error) {
            console.error('Error marking training plan as delivered:', error);
            alert('Error al marcar el plan como entregado');
        }
        setMarkingPlanDelivered(false);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!employee) return null;

    const evaluations = [
        { day: 30, label: 'First evaluation', key: 'day30' },
        { day: 60, label: 'Second evaluation', key: 'day60' },
        { day: 75, label: 'Third evaluation', key: 'day75' }
    ];

    // Calcular días restantes del contrato
    const daysRemaining = employee.contractEndDate
        ? Math.ceil((
            (employee.contractEndDate.toDate ? employee.contractEndDate.toDate() : new Date(employee.contractEndDate))
            - new Date()
        ) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="app-layout">
            <Sidebar />

            <header className="app-header">
                <div className="app-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/')}
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="app-title">Detalle</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={toggleFavorite}
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <Star
                                size={18}
                                fill={employee.isFavorite ? 'var(--warning)' : 'none'}
                                color={employee.isFavorite ? 'var(--warning)' : 'white'}
                            />
                        </button>
                        {canEditEmployees ? (
                            <Link
                                to={`/employee/${id}/edit`}
                                className="btn btn-icon"
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                <Edit size={18} />
                            </Link>
                        ) : (
                            <span
                                className="btn btn-icon"
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', opacity: 0.5, cursor: 'not-allowed' }}
                                title="No tienes permiso para editar"
                            >
                                <Edit size={18} />
                            </span>
                        )}
                        {canDeleteEmployees ? (
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="btn btn-icon"
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        ) : (
                            <span
                                className="btn btn-icon"
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', opacity: 0.5, cursor: 'not-allowed' }}
                                title="No tienes permiso para eliminar"
                            >
                                <Trash2 size={18} />
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Employee Info Card */}
                <div className="card">
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <div className="employee-avatar" style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}>
                                {employee.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{employee.fullName}</h2>
                                <p className="text-sm text-muted">{employee.employeeNumber}</p>
                            </div>
                            {employee.isFavorite && (
                                <Star size={20} fill="var(--warning)" color="var(--warning)" />
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Área</span>
                                <span style={{ fontWeight: 500 }}>{employee.area}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Departamento</span>
                                <span style={{ fontWeight: 500 }}>{employee.department}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Puesto</span>
                                <span style={{ fontWeight: 500 }}>{employee.position || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Turno</span>
                                <span style={{ fontWeight: 500 }}>{employee.shift}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Fecha de ingreso</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(employee.startDate)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">Fin de contrato</span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 500 }}>{formatDate(employee.contractEndDate)}</span>
                                    {daysRemaining !== null && daysRemaining > 0 && (
                                        <div className={`text-xs ${daysRemaining <= 7 ? 'text-danger' : daysRemaining <= 15 ? 'text-warning' : 'text-muted'}`}>
                                            {daysRemaining} días restantes
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">Estado</span>
                                <span className={`badge badge-${employee.status === 'active' ? 'success' : employee.status === 'terminated' ? 'danger' : 'warning'}`}>
                                    {employee.status === 'active' ? 'Activo' : employee.status === 'terminated' ? 'Baja' : 'Indeterminado'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">Plan RG-REC-048</span>
                                {employee.formRGREC048Delivered ? (
                                    <span className="badge badge-success">
                                        <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                        Entregado
                                    </span>
                                ) : (
                                    <span className="badge badge-warning">
                                        <AlertCircle size={14} style={{ marginRight: '4px' }} />
                                        Pendiente
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Training Plan RG-REC-048 */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>Plan de Formación RG-REC-048</h3>
                    </div>
                    <div className="card-body">
                        {(() => {
                            // Calcular información del plan
                            const startDate = employee.startDate?.toDate ? employee.startDate.toDate() : new Date(employee.startDate);
                            const { dueDate, dueDays } = calculateTrainingPlanDueDate(
                                startDate,
                                employee.department,
                                employee.area
                            );

                            const delivered = employee.trainingPlan?.delivered || employee.formRGREC048Delivered || false;
                            const deliveredAt = employee.trainingPlan?.deliveredAt;
                            const planStatus = getTrainingPlanStatus(delivered, dueDate);
                            const daysUntilDue = getDaysUntilDue(dueDate);

                            return (
                                <>
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="text-muted">Estado</span>
                                            <span className={`badge badge-${planStatus.color}`}>
                                                {planStatus.status === 'delivered' && <CheckCircle size={14} style={{ marginRight: '4px' }} />}
                                                {planStatus.status === 'overdue' && <AlertCircle size={14} style={{ marginRight: '4px' }} />}
                                                {planStatus.status === 'warning' && <Clock size={14} style={{ marginRight: '4px' }} />}
                                                {planStatus.label}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Plazo de entrega</span>
                                            <span style={{ fontWeight: 500 }}>{dueDays} días</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Fecha límite</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontWeight: 500 }}>{formatDate(dueDate)}</span>
                                                {!delivered && (
                                                    <div className={`text-xs ${planStatus.status === 'overdue' ? 'text-danger' :
                                                        planStatus.status === 'warning' ? 'text-warning' : 'text-muted'
                                                        }`}>
                                                        {planStatus.status === 'overdue'
                                                            ? `Vencido hace ${Math.abs(daysUntilDue)} días`
                                                            : `${daysUntilDue} días restantes`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {delivered && deliveredAt && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">Fecha de entrega</span>
                                                <span style={{ fontWeight: 500 }}>{formatDate(deliveredAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {!delivered && canEditEmployees && (
                                        <button
                                            className="btn btn-primary btn-full"
                                            style={{ marginTop: '16px' }}
                                            onClick={handleMarkTrainingPlanDelivered}
                                            disabled={markingPlanDelivered}
                                        >
                                            <CheckCircle size={16} />
                                            {markingPlanDelivered ? 'Marcando...' : 'Marcar como entregado'}
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>Acciones rápidas</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Botón de renovar contrato */}
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => canRenewContracts ? setShowRenewModal(true) : alert('No tienes permiso para renovar contratos')}
                            style={!canRenewContracts ? { opacity: 0.5 } : {}}
                            title={!canRenewContracts ? 'No tienes permiso' : ''}
                        >
                            <RefreshCw size={16} />
                            Renovar contrato
                        </button>

                        {employee.status === 'active' && canEditEmployees && (
                            <>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleStatusChange('indefinite')}
                                >
                                    Marcar indeterminado
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleStatusChange('terminated')}
                                >
                                    Solicitar baja
                                </button>
                            </>
                        )}
                        {employee.status === 'indefinite' && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStatusChange('active')}
                            >
                                Reactivar contrato
                            </button>
                        )}
                        {employee.status === 'terminated' && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStatusChange('active')}
                            >
                                Cancelar baja
                            </button>
                        )}
                    </div>
                </div>

                {/* Evaluations Timeline */}
                <div style={{ marginTop: '24px' }}>
                    <h3 className="section-title">Evaluaciones de desempeño</h3>

                    <div className="evaluation-timeline">
                        {evaluations.map(({ day, label, key }) => {
                            const eval_ = employee.evaluations?.[key];
                            const targetDate = getEvaluationDate(employee.startDate, day);
                            const status = getEvaluationStatus(eval_, targetDate);

                            return (
                                <div
                                    key={key}
                                    className={`evaluation-card ${status === 'completed' ? 'completed' : status === 'pending' || status === 'overdue' ? 'pending' : ''}`}
                                >
                                    <div className="evaluation-content">
                                        <div className="evaluation-header">
                                            <span className="evaluation-title">{label}</span>
                                            <span className="evaluation-date">
                                                {targetDate ? formatDate(targetDate) : '-'}
                                            </span>
                                        </div>

                                        {eval_?.score !== null && eval_?.score !== undefined ? (
                                            <>
                                                <div className="evaluation-score">{eval_.score}</div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                    {eval_.requiresFollowUp && (
                                                        <span className="badge badge-warning">Requiere seguimiento</span>
                                                    )}
                                                </div>
                                                {eval_.notes && (
                                                    <p className="text-sm text-muted" style={{ marginTop: '8px' }}>{eval_.notes}</p>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ marginTop: '8px' }}>
                                                <span className={`badge badge-${status === 'overdue' ? 'danger' : status === 'pending' ? 'warning' : 'neutral'}`}>
                                                    {status === 'overdue' ? 'Vencida' : status === 'pending' ? 'Próxima' : 'Pendiente'}
                                                </span>
                                                {(status === 'pending' || status === 'overdue') && canManageEvaluations && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        style={{ marginTop: '12px', width: '100%' }}
                                                        onClick={() => {
                                                            setEvalForm({ score: '', requiresFollowUp: false, notes: '' });
                                                            setShowEvalModal(day);
                                                        }}
                                                    >
                                                        Capturar calificación
                                                    </button>
                                                )}
                                                {(status === 'pending' || status === 'overdue') && !canManageEvaluations && (
                                                    <span
                                                        className="btn btn-primary btn-sm"
                                                        style={{ marginTop: '12px', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                                                        title="No tienes permiso para capturar evaluaciones"
                                                    >
                                                        Capturar calificación
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <Link to="/" className="nav-item">
                    <Users size={22} />
                    <span>Inicio</span>
                </Link>
                <Link to="/notifications" className="nav-item">
                    <Bell size={22} />
                    <span>Alertas</span>
                </Link>
                <Link to="/reports" className="nav-item">
                    <FileText size={22} />
                    <span>Reportes</span>
                </Link>
                <Link to="/settings" className="nav-item">
                    <Settings size={22} />
                    <span>Ajustes</span>
                </Link>
            </nav>

            {/* Renew Contract Modal */}
            {showRenewModal && (
                <div className="modal-overlay" onClick={() => setShowRenewModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Renovar contrato</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowRenewModal(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px' }}>
                                Extender el contrato de <strong>{employee.fullName}</strong>
                            </p>
                            <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>
                                Fecha actual de fin: <strong>{formatDate(employee.contractEndDate)}</strong>
                            </p>
                            <div className="form-group">
                                <label className="form-label">Días a extender</label>
                                <select
                                    className="form-input form-select"
                                    value={renewDays}
                                    onChange={(e) => setRenewDays(e.target.value)}
                                >
                                    <option value="30">First evaluation (30 days)</option>
                                    <option value="60">Second evaluation (60 days)</option>
                                    <option value="90">90 días (3 meses)</option>
                                    <option value="180">180 días (6 meses)</option>
                                    <option value="365">365 días (1 año)</option>
                                </select>
                            </div>
                            <div className="badge badge-primary" style={{ marginTop: '16px', padding: '12px', display: 'block', textAlign: 'center' }}>
                                Nueva fecha de fin: {
                                    (() => {
                                        const current = employee.contractEndDate?.toDate
                                            ? employee.contractEndDate.toDate()
                                            : new Date(employee.contractEndDate || Date.now());
                                        const newDate = new Date(current);
                                        newDate.setDate(newDate.getDate() + parseInt(renewDays));
                                        return formatDate(newDate);
                                    })()
                                }
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRenewModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleRenewContract}>
                                <RefreshCw size={16} />
                                Renovar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            {showEvalModal && (
                <div className="modal-overlay" onClick={() => setShowEvalModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Evaluación {showEvalModal} días</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowEvalModal(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Calificación (0-100) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    max="100"
                                    placeholder="85"
                                    value={evalForm.score}
                                    onChange={(e) => setEvalForm(prev => ({ ...prev, score: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="checkbox"
                                    id="followUp"
                                    className="form-checkbox"
                                    checked={evalForm.requiresFollowUp}
                                    onChange={(e) => setEvalForm(prev => ({ ...prev, requiresFollowUp: e.target.checked }))}
                                />
                                <label htmlFor="followUp">Requiere seguimiento</label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Observaciones</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Notas adicionales..."
                                    value={evalForm.notes}
                                    onChange={(e) => setEvalForm(prev => ({ ...prev, notes: e.target.value }))}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowEvalModal(null)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEvaluation}>
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Eliminar empleado</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteModal(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>¿Estás seguro de eliminar a <strong>{employee.fullName}</strong>?</p>
                            <p className="text-sm text-muted" style={{ marginTop: '8px' }}>Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
