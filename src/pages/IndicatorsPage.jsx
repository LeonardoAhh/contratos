import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { getTrainingPlanStats, getTrainingPlanStatus, getDaysUntilDue } from '../utils/trainingPlanHelpers';
import { exportToExcel, exportToPDF } from '../utils/trainingPlanReports';
import {
    BarChart3,
    ChevronRight,
    ChevronLeft,
    Users,
    CheckCircle,
    AlertTriangle,
    Clock,
    XCircle,
    Filter,
    Download,
    FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IndicatorsPage() {
    const { currentUser } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [filter, setFilter] = useState('all'); // all, pending, overdue, delivered

    useEffect(() => {
        const q = query(collection(db, 'employees'), orderBy('fullName'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEmployees(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const rawStats = getTrainingPlanStats(employees);

    // Convert rawStats object to departments array and calculate global
    const departments = Object.values(rawStats).map(dept => ({
        ...dept,
        pending: dept.total - dept.delivered - dept.overdue
    })).sort((a, b) => b.overdue - a.overdue);

    const globalStats = {
        total: employees.length,
        delivered: departments.reduce((sum, d) => sum + d.delivered, 0),
        overdue: departments.reduce((sum, d) => sum + d.overdue, 0),
        pending: 0
    };
    globalStats.pending = globalStats.total - globalStats.delivered;

    // Calculate monthly compliance by department
    const getMonthlyStats = () => {
        const monthlyData = {};
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        employees.forEach(emp => {
            const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
            if (!dueDate) return;

            const date = new Date(dueDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            const dept = emp.department || 'SIN DEPARTAMENTO';
            const delivered = emp.trainingPlan?.delivered || emp.formRGREC048Delivered;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    key: monthKey,
                    label: monthLabel,
                    departments: {},
                    total: 0,
                    delivered: 0
                };
            }

            if (!monthlyData[monthKey].departments[dept]) {
                monthlyData[monthKey].departments[dept] = { total: 0, delivered: 0 };
            }

            monthlyData[monthKey].total++;
            monthlyData[monthKey].departments[dept].total++;

            if (delivered) {
                monthlyData[monthKey].delivered++;
                monthlyData[monthKey].departments[dept].delivered++;
            }
        });

        return Object.values(monthlyData).sort((a, b) => a.key.localeCompare(b.key));
    };

    const monthlyStats = getMonthlyStats();
    const [showMonthlyChart, setShowMonthlyChart] = useState(true);

    // Filter employees by status
    const filterEmployees = (empList) => {
        return empList.filter(emp => {
            const status = getEmployeeStatus(emp);
            if (filter === 'all') return true;
            if (filter === 'pending') return status === 'pending' || status === 'warning';
            if (filter === 'overdue') return status === 'overdue';
            if (filter === 'delivered') return status === 'delivered';
            return true;
        });
    };

    const getEmployeeStatus = (emp) => {
        const delivered = emp.trainingPlan?.delivered || emp.formRGREC048Delivered;
        const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
        if (delivered) return 'delivered';
        if (!dueDate) return 'pending';
        const now = new Date();
        if (dueDate < now) return 'overdue';
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) return 'warning';
        return 'pending';
    };

    const getStatusBadge = (status) => {
        const badges = {
            delivered: { label: 'Entregado', color: 'var(--success)', icon: CheckCircle },
            pending: { label: 'Pendiente', color: 'var(--primary)', icon: Clock },
            warning: { label: 'Próximo', color: 'var(--warning)', icon: AlertTriangle },
            overdue: { label: 'Vencido', color: 'var(--danger)', icon: XCircle }
        };
        return badges[status] || badges.pending;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Get employees for selected department
    const getDepartmentEmployees = () => {
        if (!selectedDepartment) return [];
        return filterEmployees(
            employees.filter(emp =>
                (emp.department || '').toUpperCase() === selectedDepartment.toUpperCase()
            )
        );
    };

    // Group by area within department
    const getAreaGroups = () => {
        const deptEmployees = getDepartmentEmployees();
        const groups = {};

        deptEmployees.forEach(emp => {
            const area = (emp.area || 'SIN ÁREA').toUpperCase();
            if (!groups[area]) {
                groups[area] = { employees: [], delivered: 0, pending: 0, overdue: 0 };
            }
            groups[area].employees.push(emp);
            const status = getEmployeeStatus(emp);
            if (status === 'delivered') groups[area].delivered++;
            else if (status === 'overdue') groups[area].overdue++;
            else groups[area].pending++;
        });

        return Object.entries(groups).sort((a, b) => b[1].overdue - a[1].overdue);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <header className="app-header">
                <div className="app-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedDepartment && (
                            <button
                                className="btn btn-icon"
                                onClick={() => setSelectedDepartment(null)}
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="app-title">
                                {selectedDepartment || 'Indicadores RG-REC-048'}
                            </h1>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                {selectedDepartment
                                    ? `${getDepartmentEmployees().length} empleados`
                                    : `Plan de Formación - ${globalStats.total} empleados`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Export Buttons */}
                    {!selectedDepartment && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-sm"
                                onClick={() => exportToExcel(employees)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                                title="Descargar Excel (CSV)"
                            >
                                <FileSpreadsheet size={16} />
                                Excel
                            </button>
                            <button
                                className="btn btn-sm"
                                onClick={() => exportToPDF(employees)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                                title="Generar PDF"
                            >
                                <Download size={16} />
                                PDF
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="app-main">
                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <button
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('pending')}
                    >
                        <Clock size={14} /> Pendientes
                    </button>
                    <button
                        className={`btn btn-sm ${filter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('overdue')}
                        style={filter === 'overdue' ? {} : { borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                        <XCircle size={14} /> Vencidos
                    </button>
                    <button
                        className={`btn btn-sm ${filter === 'delivered' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('delivered')}
                    >
                        <CheckCircle size={14} /> Entregados
                    </button>
                </div>

                {/* Global Stats */}
                {!selectedDepartment && (
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 600 }}>Progreso Global</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                    {globalStats.total > 0
                                        ? Math.round((globalStats.delivered / globalStats.total) * 100)
                                        : 0}%
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: 'var(--neutral-200)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${globalStats.total > 0 ? (globalStats.delivered / globalStats.total) * 100 : 0}%`,
                                    background: 'var(--success)',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--success)' }}>
                                    ✓ {globalStats.delivered} entregados
                                </span>
                                <span style={{ color: 'var(--primary)' }}>
                                    ⏳ {globalStats.pending} pendientes
                                </span>
                                {globalStats.overdue > 0 && (
                                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                        ⚠ {globalStats.overdue} vencidos
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Monthly Compliance Chart */}
                {!selectedDepartment && monthlyStats.length > 0 && (
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 size={18} />
                                Cumplimiento por Mes
                            </h3>
                        </div>
                        <div className="card-body">
                            {/* Bar Chart */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '8px',
                                height: '200px',
                                padding: '16px 0',
                                overflowX: 'auto'
                            }}>
                                {monthlyStats.map(month => {
                                    const percentage = month.total > 0
                                        ? Math.round((month.delivered / month.total) * 100)
                                        : 0;
                                    const barHeight = Math.max(percentage * 1.5, 10);

                                    return (
                                        <div
                                            key={month.key}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '60px',
                                                flex: '1'
                                            }}
                                        >
                                            {/* Percentage label */}
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: percentage === 100 ? 'var(--success)' : percentage < 50 ? 'var(--danger)' : 'var(--neutral-600)'
                                            }}>
                                                {percentage}%
                                            </span>

                                            {/* Bar */}
                                            <div style={{
                                                width: '100%',
                                                maxWidth: '40px',
                                                height: `${barHeight}px`,
                                                background: percentage === 100
                                                    ? 'var(--success)'
                                                    : percentage >= 70
                                                        ? 'var(--primary)'
                                                        : percentage >= 50
                                                            ? 'var(--warning)'
                                                            : 'var(--danger)',
                                                borderRadius: '4px 4px 0 0',
                                                marginTop: '4px',
                                                transition: 'height 0.3s ease'
                                            }} />

                                            {/* Month label */}
                                            <span style={{
                                                fontSize: '0.625rem',
                                                color: 'var(--neutral-500)',
                                                marginTop: '4px',
                                                textAlign: 'center'
                                            }}>
                                                {month.label}
                                            </span>

                                            {/* Count */}
                                            <span style={{
                                                fontSize: '0.625rem',
                                                color: 'var(--neutral-400)'
                                            }}>
                                                {month.delivered}/{month.total}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '16px',
                                marginTop: '12px',
                                fontSize: '0.75rem',
                                color: 'var(--neutral-500)'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }} />
                                    100%
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
                                    70-99%
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '2px' }} />
                                    50-69%
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '2px' }} />
                                    &lt;50%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Department List or Department Detail */}
                {!selectedDepartment ? (
                    // DEPARTMENT LIST VIEW
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {departments
                            .filter(dept => {
                                if (filter === 'all') return true;
                                if (filter === 'overdue') return dept.overdue > 0;
                                if (filter === 'pending') return dept.pending > 0;
                                if (filter === 'delivered') return dept.delivered > 0;
                                return true;
                            })
                            .map(dept => {
                                const percentage = dept.total > 0
                                    ? Math.round((dept.delivered / dept.total) * 100)
                                    : 0;

                                return (
                                    <div
                                        key={dept.department}
                                        className="card"
                                        style={{
                                            cursor: 'pointer',
                                            borderLeft: dept.overdue > 0 ? '3px solid var(--danger)' : undefined
                                        }}
                                        onClick={() => setSelectedDepartment(dept.department)}
                                    >
                                        <div className="card-body">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <Users size={18} />
                                                        <span style={{ fontWeight: 600 }}>{dept.department}</span>
                                                        <span className="badge" style={{
                                                            background: 'var(--neutral-100)',
                                                            color: 'var(--neutral-600)',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {dept.total}
                                                        </span>
                                                    </div>

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
                                                            background: percentage === 100 ? 'var(--success)' : 'var(--primary)',
                                                            borderRadius: '3px'
                                                        }} />
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                                                        <span style={{ color: 'var(--success)' }}>
                                                            {dept.delivered} entregados
                                                        </span>
                                                        {dept.pending > 0 && (
                                                            <span style={{ color: 'var(--neutral-500)' }}>
                                                                {dept.pending} pendientes
                                                            </span>
                                                        )}
                                                        {dept.overdue > 0 && (
                                                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                                                {dept.overdue} vencidos
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{percentage}%</span>
                                                    <ChevronRight size={20} style={{ color: 'var(--neutral-400)' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    // DEPARTMENT DETAIL VIEW
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {getAreaGroups().map(([area, data]) => (
                            <div key={area} className="card">
                                <div className="card-header" style={{
                                    borderLeft: data.overdue > 0 ? '3px solid var(--danger)' : undefined
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '0.875rem' }}>{area}</h3>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--success)' }}>{data.delivered} ✓</span>
                                            {data.pending > 0 && <span>{data.pending} pendientes</span>}
                                            {data.overdue > 0 && (
                                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                                    {data.overdue} vencidos
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body" style={{ padding: 0 }}>
                                    {data.employees.map((emp, idx) => {
                                        const status = getEmployeeStatus(emp);
                                        const statusInfo = getStatusBadge(status);
                                        const StatusIcon = statusInfo.icon;
                                        const daysLeft = getDaysUntilDue(
                                            emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate
                                        );

                                        return (
                                            <Link
                                                key={emp.id}
                                                to={`/employee/${emp.id}`}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '12px 16px',
                                                    borderTop: idx > 0 ? '1px solid var(--neutral-100)' : undefined,
                                                    textDecoration: 'none',
                                                    color: 'inherit'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{emp.fullName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                                                        #{emp.employeeNumber} • {emp.position || 'Sin puesto'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {status !== 'delivered' && daysLeft !== null && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: daysLeft < 0 ? 'var(--danger)' : 'var(--neutral-500)'
                                                        }}>
                                                            {daysLeft < 0
                                                                ? `${Math.abs(daysLeft)}d vencido`
                                                                : `${daysLeft}d restantes`
                                                            }
                                                        </span>
                                                    )}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        background: `${statusInfo.color}20`,
                                                        color: statusInfo.color,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500
                                                    }}>
                                                        <StatusIcon size={12} />
                                                        {statusInfo.label}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {getAreaGroups().length === 0 && (
                            <div className="card">
                                <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                                    <p style={{ color: 'var(--neutral-500)' }}>
                                        No hay empleados con el filtro seleccionado
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
