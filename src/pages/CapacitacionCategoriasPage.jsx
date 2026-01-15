import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    Timestamp
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
    BookOpen,
    Award,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Save,
    Filter
} from 'lucide-react';
import CapacitacionSidebar from '../components/CapacitacionSidebar';
import promotionRules from '../data/promotionRules.json';

export default function CapacitacionCategoriasPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [saving, setSaving] = useState({});

    // State para guardar los datos ingresados por empleado
    const [employeeData, setEmployeeData] = useState({});

    // Filtros
    const [statusFilter, setStatusFilter] = useState('all'); // all, eligible, canTake, notEligible
    const [positionFilter, setPositionFilter] = useState('all');

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

    // Cargar datos de categories_data
    useEffect(() => {
        const loadCategoriesData = async () => {
            const q = query(collection(db, 'categories_data'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const dataMap = {};
                snapshot.docs.forEach(doc => {
                    dataMap[doc.id] = doc.data();
                });
                setEmployeeData(dataMap);
            });
            return unsubscribe;
        };
        loadCategoriesData();
    }, []);

    // Crear un mapa de reglas por posición (normalizado)
    const rulesMap = useMemo(() => {
        const map = {};
        promotionRules.forEach(rule => {
            const normalizedPosition = rule["current position"].trim().toUpperCase();
            map[normalizedPosition] = {
                promotion: rule.promotion,
                lastChange: parseInt(rule["last change"]) || 0,
                examGrade: parseInt(rule["exam grade"]) || 0,
                courseCoverage: parseInt(rule["course coverage"]) || 0,
                performanceRating: parseInt(rule["performance rating"]) || 0
            };
        });
        return map;
    }, []);

    // Filtrar empleados que aplican (tienen una regla de promoción)
    const eligibleEmployees = useMemo(() => {
        return employees.filter(emp => {
            const position = (emp.position || '').trim().toUpperCase();
            return rulesMap[position] !== undefined;
        });
    }, [employees, rulesMap]);

    // Filtrar por búsqueda
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return eligibleEmployees;
        const q = searchQuery.toLowerCase();
        return eligibleEmployees.filter(emp =>
            emp.name?.toLowerCase().includes(q) ||
            emp.position?.toLowerCase().includes(q) ||
            emp.employeeId?.toString().includes(q)
        );
    }, [eligibleEmployees, searchQuery]);

    // Función para obtener la regla de un empleado
    const getRule = (employee) => {
        const position = (employee.position || '').trim().toUpperCase();
        return rulesMap[position];
    };

    // Función para calcular meses desde una fecha
    const calculateMonths = (dateValue) => {
        if (!dateValue) return 0;

        let startDate;

        // Si es un string (formato YYYY-MM-DD del input type="date")
        if (typeof dateValue === 'string') {
            const parts = dateValue.split('-');
            if (parts.length !== 3) return 0;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);

            if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;
            if (year < 1900 || year > 2100) return 0;

            startDate = new Date(year, month, day);
        }
        // Si es un Timestamp de Firebase
        else if (dateValue.seconds) {
            startDate = new Date(dateValue.seconds * 1000);
        }
        // Si ya es un Date
        else if (dateValue instanceof Date) {
            startDate = dateValue;
        }
        else {
            return 0;
        }

        const today = new Date();

        // Si la fecha es futura, retornar 0
        if (startDate > today) return 0;

        // Si la fecha es inválida
        if (isNaN(startDate.getTime())) return 0;

        const months = (today.getFullYear() - startDate.getFullYear()) * 12 +
            (today.getMonth() - startDate.getMonth());
        return Math.max(0, months);
    };

    // Función para calcular elegibilidad
    const calculateEligibility = (employee, data) => {
        const rule = getRule(employee);
        if (!rule) return { step: 0, eligible: false, canTakeExam: false };

        const {
            performanceRating = 0,
            positionDate = '',
            courseCoverage = 0,
            examGrade = 0
        } = data || {};

        // Calcular meses automáticamente desde la fecha
        const monthsInPosition = calculateMonths(positionDate);

        // Step 1: Performance Rating
        const passesPerformance = performanceRating >= rule.performanceRating;
        if (!passesPerformance) {
            return { step: 1, eligible: false, canTakeExam: false, failedAt: 'performance' };
        }

        // Step 2: Time in Position (Last Change)
        const passesTime = monthsInPosition >= rule.lastChange;
        if (!passesTime) {
            return { step: 2, eligible: false, canTakeExam: false, failedAt: 'time' };
        }

        // Step 3: Course Coverage
        const passesCourses = courseCoverage >= rule.courseCoverage;
        if (!passesCourses) {
            return { step: 3, eligible: false, canTakeExam: false, failedAt: 'courses' };
        }

        // Step 4: Can take exam
        if (examGrade === 0) {
            return { step: 4, eligible: false, canTakeExam: true, failedAt: null };
        }

        // Step 5: Exam Grade
        const passesExam = examGrade >= rule.examGrade;
        if (passesExam) {
            return { step: 5, eligible: true, canTakeExam: false, failedAt: null };
        } else {
            return { step: 5, eligible: false, canTakeExam: true, failedAt: 'exam' };
        }
    };

    // Guardar datos en Firebase
    const saveToFirebase = useCallback(async (employeeId, data, employee) => {
        setSaving(prev => ({ ...prev, [employeeId]: true }));
        try {
            const rule = getRule(employee);
            const eligibility = calculateEligibility(employee, data);

            await setDoc(doc(db, 'categories_data', employeeId), {
                employeeId: employee.employeeId,
                employeeName: employee.name,
                position: employee.position,
                promotion: rule?.promotion || '',
                performanceRating: data.performanceRating || 0,
                positionDate: data.positionDate || '',
                monthsInPosition: calculateMonths(data.positionDate),
                courseCoverage: data.courseCoverage || 0,
                examGrade: data.examGrade || 0,
                isEligible: eligibility.eligible,
                canTakeExam: eligibility.canTakeExam,
                currentStep: eligibility.step,
                failedAt: eligibility.failedAt || null,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        } finally {
            setSaving(prev => ({ ...prev, [employeeId]: false }));
        }
    }, []);

    // Manejar cambio de datos del empleado
    const handleDataChange = (employeeId, field, value, employee) => {
        // Para fechas, guardar como string; para otros campos, convertir a número
        let processedValue;
        if (field === 'positionDate') {
            processedValue = value; // Mantener como string
        } else {
            processedValue = parseFloat(value) || 0;
        }

        const newData = {
            ...employeeData[employeeId],
            [field]: processedValue
        };

        setEmployeeData(prev => ({
            ...prev,
            [employeeId]: newData
        }));

        // Guardar automáticamente después de un pequeño delay
        clearTimeout(window[`saveTimeout_${employeeId}`]);
        window[`saveTimeout_${employeeId}`] = setTimeout(() => {
            saveToFirebase(employeeId, newData, employee);
        }, 500);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleExpanded = (employeeId) => {
        setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
    };

    // Obtener posiciones únicas de los empleados elegibles
    const uniquePositions = useMemo(() => {
        const positions = new Set();
        employees.forEach(emp => {
            if (getRule(emp)) {
                positions.add(emp.position);
            }
        });
        return Array.from(positions).sort();
    }, [employees]);

    // Filtrar empleados con todos los filtros aplicados
    const filteredAndFilteredEmployees = useMemo(() => {
        return filteredEmployees.filter(emp => {
            // Filtro por posición
            if (positionFilter !== 'all' && emp.position !== positionFilter) {
                return false;
            }

            // Filtro por estado de elegibilidad
            if (statusFilter !== 'all') {
                const data = employeeData[emp.id] || {};
                const eligibility = calculateEligibility(emp, data);

                switch (statusFilter) {
                    case 'eligible':
                        if (!eligibility.eligible) return false;
                        break;
                    case 'canTake':
                        if (!eligibility.canTakeExam) return false;
                        break;
                    case 'notEligible':
                        if (eligibility.eligible || eligibility.canTakeExam) return false;
                        break;
                }
            }

            return true;
        });
    }, [filteredEmployees, positionFilter, statusFilter, employeeData]);

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
                            <h1 className="capacitacion-title">Cambio de Categoría</h1>
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
                    {/* Stats Premium */}
                    <div className="stats-premium">
                        <div className="stat-card-premium stat-primary">
                            <div className="stat-icon-premium primary">
                                <Users size={24} />
                            </div>
                            <div className="stat-content-premium">
                                <div className="stat-value-premium">{eligibleEmployees.length}</div>
                                <div className="stat-label-premium">Empleados Elegibles</div>
                            </div>
                        </div>
                        <div className="stat-card-premium stat-success">
                            <div className="stat-icon-premium success">
                                <Award size={24} />
                            </div>
                            <div className="stat-content-premium">
                                <div className="stat-value-premium">{promotionRules.length}</div>
                                <div className="stat-label-premium">Reglas de Promoción</div>
                            </div>
                        </div>
                    </div>

                    {/* Search Premium */}
                    <div className="search-container">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por nombre, puesto o ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Pills Premium */}
                    <div className="filter-pills">
                        <span className="filter-pills-label">
                            <Filter size={16} /> Filtrar
                        </span>

                        <div className="filter-pills-group">
                            <button
                                className={`filter-pill ${statusFilter === 'all' ? 'active active--primary' : ''}`}
                                onClick={() => setStatusFilter('all')}
                            >
                                Todos
                            </button>
                            <button
                                className={`filter-pill ${statusFilter === 'eligible' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('eligible')}
                            >
                                <CheckCircle2 size={14} /> APTO
                            </button>
                            <button
                                className={`filter-pill ${statusFilter === 'canTake' ? 'active active--warning' : ''}`}
                                onClick={() => setStatusFilter('canTake')}
                            >
                                <Award size={14} /> Puede Presentar
                            </button>
                            <button
                                className={`filter-pill ${statusFilter === 'notEligible' ? 'active active--danger' : ''}`}
                                onClick={() => setStatusFilter('notEligible')}
                            >
                                <XCircle size={14} /> No Cumple
                            </button>
                        </div>

                        <select
                            className="form-select filter-select"
                            value={positionFilter}
                            onChange={(e) => setPositionFilter(e.target.value)}
                        >
                            <option value="all">Todos los puestos</option>
                            {uniquePositions.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Header Premium */}
                    <div className="section-header-premium">
                        <h2>
                            Empleados con Opción a Promoción
                            <span className="count-badge">{filteredAndFilteredEmployees.length}</span>
                        </h2>
                    </div>

                    {filteredAndFilteredEmployees.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Users size={32} />
                            </div>
                            <p>No hay empleados que coincidan con los filtros</p>
                        </div>
                    ) : (
                        <div className="promotion-cards">
                            {filteredAndFilteredEmployees.map(emp => {
                                const rule = getRule(emp);
                                const data = employeeData[emp.id] || {};
                                const eligibility = calculateEligibility(emp, data);
                                const isExpanded = expandedEmployee === emp.id;

                                return (
                                    <div key={emp.id} className={`promotion-card ${eligibility.eligible ? 'eligible' : ''}`}>
                                        {/* Card Header Premium */}
                                        <div
                                            className="promotion-card-header"
                                            onClick={() => toggleExpanded(emp.id)}
                                        >
                                            <div className="promotion-card-avatar">
                                                {emp.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="promotion-card-info">
                                                <div className="promotion-card-name">{emp.name}</div>
                                                <div className="promotion-card-position">
                                                    {emp.position}
                                                    <span className="promotion-arrow">
                                                        <TrendingUp size={14} />
                                                    </span>
                                                    <span className="promotion-target">{rule.promotion}</span>
                                                </div>
                                                <div className="promotion-card-id">ID: {emp.employeeId}</div>
                                            </div>
                                            <div className="promotion-card-status">
                                                {eligibility.eligible ? (
                                                    <span className="status-badge eligible">
                                                        <CheckCircle2 size={16} />
                                                        APTO
                                                    </span>
                                                ) : eligibility.canTakeExam ? (
                                                    <span className="status-badge pending">
                                                        <Award size={16} />
                                                        PUEDE PRESENTAR EXAMEN
                                                    </span>
                                                ) : (
                                                    <span className="status-badge not-eligible">
                                                        <XCircle size={16} />
                                                        NO CUMPLE
                                                    </span>
                                                )}
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="promotion-card-body">
                                                {/* Requirements Display */}
                                                <div className="requirements-header">
                                                    <strong>Requisitos para promoción:</strong>
                                                    <span className="requirements-list">
                                                        Performance ≥{rule.performanceRating}% |
                                                        Tiempo ≥{rule.lastChange} meses |
                                                        Cursos ≥{rule.courseCoverage}% |
                                                        Examen ≥{rule.examGrade}%
                                                    </span>
                                                </div>

                                                {/* Input Fields */}
                                                <div className="promotion-inputs">
                                                    {/* Performance Rating */}
                                                    <div className={`input-group ${eligibility.step >= 1 ? (data.performanceRating >= rule.performanceRating ? 'passed' : eligibility.failedAt === 'performance' ? 'failed' : '') : ''}`}>
                                                        <label>
                                                            <TrendingUp size={16} />
                                                            Performance Rating (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={data.performanceRating || ''}
                                                            onChange={(e) => handleDataChange(emp.id, 'performanceRating', e.target.value, emp)}
                                                            placeholder={`Mínimo: ${rule.performanceRating}%`}
                                                        />
                                                        {data.performanceRating >= rule.performanceRating && <CheckCircle2 size={18} className="check-icon" />}
                                                    </div>

                                                    {/* Position Date */}
                                                    {(() => {
                                                        // Helper para convertir a formato YYYY-MM-DD
                                                        const getDateString = (dateValue) => {
                                                            if (!dateValue) return '';
                                                            if (typeof dateValue === 'string') return dateValue;
                                                            if (dateValue.seconds) {
                                                                const d = new Date(dateValue.seconds * 1000);
                                                                return d.toISOString().split('T')[0];
                                                            }
                                                            if (dateValue instanceof Date) {
                                                                return dateValue.toISOString().split('T')[0];
                                                            }
                                                            return '';
                                                        };

                                                        const dateStr = getDateString(data.positionDate);
                                                        const monthsCalc = calculateMonths(data.positionDate);
                                                        return (
                                                            <div className={`input-group ${eligibility.step >= 2 ? (monthsCalc >= rule.lastChange ? 'passed' : eligibility.failedAt === 'time' ? 'failed' : '') : 'disabled'}`}>
                                                                <label>
                                                                    <Clock size={16} />
                                                                    Fecha en el Puesto Actual
                                                                    {dateStr && (
                                                                        <span style={{ marginLeft: '8px', color: monthsCalc >= rule.lastChange ? 'var(--success)' : 'var(--text-muted)' }}>
                                                                            ({monthsCalc} meses)
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={dateStr}
                                                                    onChange={(e) => handleDataChange(emp.id, 'positionDate', e.target.value, emp)}
                                                                    disabled={eligibility.step < 2 && eligibility.failedAt === 'performance'}
                                                                />
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                    Mínimo: {rule.lastChange} meses
                                                                </span>
                                                                {monthsCalc >= rule.lastChange && eligibility.step >= 2 && <CheckCircle2 size={18} className="check-icon" />}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Course Coverage */}
                                                    <div className={`input-group ${eligibility.step >= 3 ? (data.courseCoverage >= rule.courseCoverage ? 'passed' : eligibility.failedAt === 'courses' ? 'failed' : '') : 'disabled'}`}>
                                                        <label>
                                                            <BookOpen size={16} />
                                                            Cobertura de Cursos (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={data.courseCoverage || ''}
                                                            onChange={(e) => handleDataChange(emp.id, 'courseCoverage', e.target.value, emp)}
                                                            placeholder={`Mínimo: ${rule.courseCoverage}%`}
                                                            disabled={eligibility.step < 3 && eligibility.failedAt !== 'courses'}
                                                        />
                                                        {data.courseCoverage >= rule.courseCoverage && eligibility.step >= 3 && <CheckCircle2 size={18} className="check-icon" />}
                                                    </div>

                                                    {/* Exam Grade */}
                                                    <div className={`input-group ${eligibility.canTakeExam || eligibility.eligible ? (data.examGrade >= rule.examGrade ? 'passed' : eligibility.failedAt === 'exam' ? 'failed' : '') : 'disabled'}`}>
                                                        <label>
                                                            <Award size={16} />
                                                            Calificación Examen (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={data.examGrade || ''}
                                                            onChange={(e) => handleDataChange(emp.id, 'examGrade', e.target.value, emp)}
                                                            placeholder={`Mínimo: ${rule.examGrade}%`}
                                                            disabled={!eligibility.canTakeExam && !eligibility.eligible}
                                                        />
                                                        {data.examGrade >= rule.examGrade && (eligibility.canTakeExam || eligibility.eligible) && <CheckCircle2 size={18} className="check-icon" />}
                                                    </div>
                                                </div>

                                                {/* Save Button */}
                                                <div className="save-actions">
                                                    <button
                                                        className={`btn ${saving[emp.id] ? 'btn-secondary' : 'btn-primary'}`}
                                                        onClick={() => saveToFirebase(emp.id, data, emp)}
                                                        disabled={saving[emp.id]}
                                                    >
                                                        {saving[emp.id] ? (
                                                            <>
                                                                <div className="spinner-small"></div>
                                                                Guardando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={16} />
                                                                Guardar Información
                                                            </>
                                                        )}
                                                    </button>
                                                    {data.updatedAt && (
                                                        <span className="last-saved">
                                                            Último guardado: {new Date(data.updatedAt.seconds * 1000).toLocaleString('es-MX')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="promotion-progress">
                                                    <div className="progress-steps">
                                                        <div className={`progress-step ${eligibility.step >= 1 && data.performanceRating >= rule.performanceRating ? 'completed' : eligibility.failedAt === 'performance' ? 'failed' : ''}`}>
                                                            <div className="step-dot"></div>
                                                            <span>Performance</span>
                                                        </div>
                                                        <div className={`progress-step ${eligibility.step >= 2 && calculateMonths(data.positionDate) >= rule.lastChange ? 'completed' : eligibility.failedAt === 'time' ? 'failed' : ''}`}>
                                                            <div className="step-dot"></div>
                                                            <span>Antigüedad</span>
                                                        </div>
                                                        <div className={`progress-step ${eligibility.step >= 3 && data.courseCoverage >= rule.courseCoverage ? 'completed' : eligibility.failedAt === 'courses' ? 'failed' : ''}`}>
                                                            <div className="step-dot"></div>
                                                            <span>Cursos</span>
                                                        </div>
                                                        <div className={`progress-step ${eligibility.canTakeExam ? 'current' : ''} ${eligibility.eligible ? 'completed' : eligibility.failedAt === 'exam' ? 'failed' : ''}`}>
                                                            <div className="step-dot"></div>
                                                            <span>Examen</span>
                                                        </div>
                                                        <div className={`progress-step ${eligibility.eligible ? 'completed' : ''}`}>
                                                            <div className="step-dot"></div>
                                                            <span>Apto</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

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
                    <button className="nav-item active">
                        <Layers size={22} />
                        <span>Categorías</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
