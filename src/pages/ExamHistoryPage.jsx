import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    onSnapshot,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    Timestamp,
    orderBy,
    where
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    Home,
    LogOut,
    Users,
    Layers,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    Award,
    Plus,
    Trash2,
    AlertTriangle,
    Calendar,
    FileText,
    RefreshCw
} from 'lucide-react';
import CapacitacionSidebar from '../components/CapacitacionSidebar';
import promotionRules from '../data/promotionRules.json';

export default function ExamHistoryPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [examRecords, setExamRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Formulario para nuevo examen
    const [examForm, setExamForm] = useState({
        examDate: '',
        grade: '',
        passed: false
    });

    // Cargar empleados
    useEffect(() => {
        const q = query(collection(db, 'employees_capacitacion'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Cargar historial de exámenes
    useEffect(() => {
        const q = query(collection(db, 'exam_categories'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setExamRecords(data);
        });
        return unsubscribe;
    }, []);

    // Crear mapa de reglas por posición
    const rulesMap = useMemo(() => {
        const map = {};
        promotionRules.forEach(rule => {
            const normalizedPosition = rule["current position"].trim().toUpperCase();
            map[normalizedPosition] = {
                examGrade: parseInt(rule["exam grade"]) || 0,
                promotion: rule.promotion
            };
        });
        return map;
    }, []);

    // Obtener calificación mínima para un puesto
    const getMinExamGrade = useCallback((position) => {
        const normalized = (position || '').trim().toUpperCase();
        return rulesMap[normalized]?.examGrade || 70; // Default 70 si no hay regla
    }, [rulesMap]);

    // Obtener exámenes de un empleado específico
    const getEmployeeExams = useCallback((employeeId) => {
        return examRecords
            .filter(record => record.employeeId === employeeId)
            .sort((a, b) => {
                const dateA = a.examDate?.seconds ? a.examDate.seconds : new Date(a.examDate).getTime() / 1000;
                const dateB = b.examDate?.seconds ? b.examDate.seconds : new Date(b.examDate).getTime() / 1000;
                return dateB - dateA; // Más recientes primero
            });
    }, [examRecords]);

    // Calcular cuándo puede volver a presentar el examen
    const calculateNextExamDate = useCallback((employeeId) => {
        const exams = getEmployeeExams(employeeId);
        const failedExams = exams.filter(e => !e.passed);

        if (failedExams.length === 0) {
            return { canTakeExam: true, nextDate: null, waitMonths: 0 };
        }

        const lastFailedExam = failedExams[0]; // El más reciente
        const lastExamDate = lastFailedExam.examDate?.seconds
            ? new Date(lastFailedExam.examDate.seconds * 1000)
            : new Date(lastFailedExam.examDate);

        // Si es el primer reprobado, esperar 1 mes; si es el segundo o más, esperar 6 meses
        const waitMonths = failedExams.length === 1 ? 1 : 6;

        const nextDate = new Date(lastExamDate);
        nextDate.setMonth(nextDate.getMonth() + waitMonths);

        const today = new Date();
        const canTakeExam = today >= nextDate;

        return {
            canTakeExam,
            nextDate,
            waitMonths,
            failedCount: failedExams.length,
            daysRemaining: canTakeExam ? 0 : Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))
        };
    }, [getEmployeeExams]);

    // Guardar nuevo examen
    const handleSaveExam = async () => {
        if (!selectedEmployee || !examForm.examDate) return;

        setSaving(true);
        try {
            const minGrade = getMinExamGrade(selectedEmployee.position);
            const grade = parseFloat(examForm.grade) || 0;
            const passed = grade >= minGrade;

            await addDoc(collection(db, 'exam_categories'), {
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                position: selectedEmployee.position,
                examDate: examForm.examDate,
                grade: grade,
                minGradeRequired: minGrade,
                passed: passed,
                createdAt: Timestamp.now()
            });

            setShowModal(false);
            setExamForm({ examDate: '', grade: '', passed: false });
            setSelectedEmployee(null);
        } catch (error) {
            console.error('Error saving exam:', error);
        } finally {
            setSaving(false);
        }
    };

    // Actualizar todos los registros existentes con la lógica de passed
    const handleUpdateAllRecords = async () => {
        if (!confirm('¿Actualizar todos los registros existentes con la calificación mínima correcta?')) return;

        setUpdating(true);
        try {
            for (const record of examRecords) {
                const minGrade = getMinExamGrade(record.position);
                const grade = parseFloat(record.grade) || 0;
                const passed = grade >= minGrade;

                // Solo actualizar si hay diferencia
                if (record.passed !== passed || record.minGradeRequired !== minGrade) {
                    await updateDoc(doc(db, 'exam_categories', record.id), {
                        passed: passed,
                        minGradeRequired: minGrade
                    });
                }
            }
            alert('Registros actualizados correctamente');
        } catch (error) {
            console.error('Error updating records:', error);
            alert('Error al actualizar registros');
        } finally {
            setUpdating(false);
        }
    };

    // Eliminar registro de examen
    const handleDeleteExam = async (examId) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            await deleteDoc(doc(db, 'exam_categories', examId));
        } catch (error) {
            console.error('Error deleting exam:', error);
        }
    };

    // Filtrar empleados
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        const q = searchQuery.toLowerCase();
        return employees.filter(emp =>
            emp.name?.toLowerCase().includes(q) ||
            emp.position?.toLowerCase().includes(q) ||
            emp.employeeId?.toString().includes(q)
        );
    }, [employees, searchQuery]);

    // Formatear fecha
    const formatDate = (dateValue) => {
        if (!dateValue) return '-';
        if (typeof dateValue === 'string') {
            return new Date(dateValue + 'T00:00:00').toLocaleDateString('es-MX');
        }
        if (dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleDateString('es-MX');
        }
        return '-';
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <>
            <CapacitacionSidebar />
            <div className="capacitacion-layout with-sidebar">
                {/* Header */}
                <header className="capacitacion-header">
                    <div className="capacitacion-header-content">
                        <div className="capacitacion-header-left">
                            <div className="capacitacion-logo">
                                <GraduationCap size={24} strokeWidth={1.5} />
                            </div>
                            <h1 className="capacitacion-title">Historial de Exámenes</h1>
                        </div>
                        <div className="capacitacion-header-right">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/')}
                                title="Cambiar módulo"
                            >
                                <Home size={18} />
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleLogout}
                                title="Cerrar sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="capacitacion-main" style={{ display: 'block', padding: 'var(--spacing-lg)' }}>
                    {/* Search Premium */}
                    <div className="search-container">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar empleado por nombre, puesto o ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Section Header Premium */}
                    <div className="section-header-premium">
                        <h2>
                            Empleados
                            <span className="count-badge">{filteredEmployees.length}</span>
                        </h2>
                        <button
                            className="filter-pill"
                            onClick={handleUpdateAllRecords}
                            disabled={updating}
                            title="Actualizar registros existentes"
                        >
                            <RefreshCw size={14} className={updating ? 'spinning' : ''} />
                            {updating ? 'Actualizando...' : 'Recalcular'}
                        </button>
                    </div>

                    {/* Employee Table Premium */}
                    <div className="employee-table-premium">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Puesto</th>
                                        <th>Exámenes</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map(emp => {
                                        const exams = getEmployeeExams(emp.id);
                                        const examStatus = calculateNextExamDate(emp.id);
                                        const passedExams = exams.filter(e => e.passed).length;
                                        const failedExams = exams.filter(e => !e.passed).length;

                                        return (
                                            <tr key={emp.id}>
                                                <td><span style={{ fontFamily: 'SF Mono, Monaco, monospace', fontSize: '0.8125rem' }}>{emp.employeeId}</span></td>
                                                <td><strong>{emp.name}</strong></td>
                                                <td>{emp.position}</td>
                                                <td>
                                                    <div className="exam-stats-display">
                                                        <span className="passed-count">
                                                            <CheckCircle2 size={14} /> {passedExams}
                                                        </span>
                                                        <span className="divider">/</span>
                                                        <span className="failed-count">
                                                            <XCircle size={14} /> {failedExams}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {exams.length === 0 ? (
                                                        <span className="badge-premium idle">
                                                            Sin exámenes
                                                        </span>
                                                    ) : examStatus.canTakeExam ? (
                                                        <span className="badge-premium success">
                                                            <CheckCircle2 size={12} />
                                                            Puede presentar
                                                        </span>
                                                    ) : (
                                                        <span className="badge-premium warning">
                                                            <Clock size={12} />
                                                            {examStatus.daysRemaining}d restantes
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn primary"
                                                            onClick={() => {
                                                                setSelectedEmployee(emp);
                                                                setShowModal(true);
                                                            }}
                                                            title="Agregar examen"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}
                                                            title="Ver historial"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Historial Premium del empleado seleccionado */}
                    {selectedEmployee && !showModal && (
                        <div className="exam-history-panel">
                            {/* History Header */}
                            <div className="history-header">
                                <div className="history-header-info">
                                    <div className="history-header-avatar">
                                        {selectedEmployee.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="history-header-text">
                                        <h3>{selectedEmployee.name}</h3>
                                        <span>{selectedEmployee.position}</span>
                                    </div>
                                </div>
                                <button
                                    className="action-btn"
                                    onClick={() => setSelectedEmployee(null)}
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>

                            {(() => {
                                const status = calculateNextExamDate(selectedEmployee.id);
                                return status.failedCount > 0 && (
                                    <div className={`exam-status-banner ${status.canTakeExam ? 'can-take' : 'must-wait'}`}>
                                        {status.canTakeExam ? (
                                            <>
                                                <CheckCircle2 size={20} />
                                                <span>El empleado puede presentar el examen nuevamente.</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={20} />
                                                <span>
                                                    Debe esperar hasta el {status.nextDate?.toLocaleDateString('es-MX')}
                                                    ({status.daysRemaining} días restantes).
                                                    {status.failedCount >= 2 && ' (Penalización de 6 meses por múltiples reprobados)'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="exam-records">
                                {getEmployeeExams(selectedEmployee.id).length === 0 ? (
                                    <div className="empty-state">
                                        <Award size={32} />
                                        <p>No hay exámenes registrados</p>
                                    </div>
                                ) : (
                                    getEmployeeExams(selectedEmployee.id).map(exam => (
                                        <div key={exam.id} className={`exam-record ${exam.passed ? 'passed' : 'failed'}`}>
                                            <div className="exam-record-icon">
                                                {exam.passed ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                                            </div>
                                            <div className="exam-record-info">
                                                <div className="exam-record-date">
                                                    <Calendar size={13} />
                                                    {formatDate(exam.examDate)}
                                                </div>
                                                <div className="exam-record-grade">
                                                    {exam.grade}%
                                                </div>
                                                <div className="exam-record-status">
                                                    {exam.passed ? 'Aprobado' : 'Reprobado'}
                                                </div>
                                            </div>
                                            <button
                                                className="action-btn exam-record-delete"
                                                onClick={() => handleDeleteExam(exam.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </main>

                {/* Modal para agregar examen */}
                {showModal && selectedEmployee && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Registrar Examen</h2>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                                    Empleado: <strong>{selectedEmployee.name}</strong>
                                </p>

                                <div className="form-group">
                                    <label>Fecha del Examen</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={examForm.examDate}
                                        onChange={(e) => setExamForm(prev => ({ ...prev, examDate: e.target.value }))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Calificación (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        max="100"
                                        value={examForm.grade}
                                        onChange={(e) => setExamForm(prev => ({ ...prev, grade: e.target.value }))}
                                        placeholder="Ej: 85"
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Mínimo requerido: {getMinExamGrade(selectedEmployee.position)}%
                                    </span>
                                </div>

                                {/* Indicador automático de aprobado/reprobado */}
                                {examForm.grade && (
                                    <div className={`exam-status-banner ${parseFloat(examForm.grade) >= getMinExamGrade(selectedEmployee.position) ? 'can-take' : 'must-wait'}`}
                                        style={{ padding: '12px', fontSize: '0.875rem' }}>
                                        {parseFloat(examForm.grade) >= getMinExamGrade(selectedEmployee.position) ? (
                                            <><CheckCircle2 size={18} /> <span>APROBADO - Cumple con el mínimo requerido</span></>
                                        ) : (
                                            <><XCircle size={18} /> <span>REPROBADO - No alcanza el mínimo de {getMinExamGrade(selectedEmployee.position)}%</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveExam}
                                    disabled={saving || !examForm.examDate}
                                >
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation */}
                <nav className="app-nav app-nav--capacitacion">
                    <button onClick={() => navigate('/capacitacion')} className="nav-item">
                        <GraduationCap size={22} />
                        <span>Inicio</span>
                    </button>
                    <button onClick={() => navigate('/capacitacion/employees')} className="nav-item">
                        <Users size={22} />
                        <span>Empleados</span>
                    </button>
                    <button onClick={() => navigate('/capacitacion/categorias')} className="nav-item">
                        <Layers size={22} />
                        <span>Categorías</span>
                    </button>
                    <button className="nav-item active">
                        <Award size={22} />
                        <span>Exámenes</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
