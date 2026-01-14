import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
    FileSpreadsheet,
    TrendingUp,
    Calendar,
    User,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IndicatorsPage() {
    const { currentUser } = useAuth();
    const { isDark } = useTheme();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [filter, setFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(null); // Format: 'YYYY-MM'
    const [expandedAreas, setExpandedAreas] = useState({});

    // Theme-aware styles - Always dark theme
    const styles = {
        cardBg: 'var(--surface)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        headerBg: 'rgba(0, 0, 0, 0.3)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        filterBg: 'rgba(28, 28, 30, 0.8)',
        employeeCardBg: 'rgba(44, 44, 46, 0.6)',
    };

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

    const departments = Object.values(rawStats).map(dept => ({
        ...dept,
        pending: dept.total - dept.delivered - dept.overdue
    })).sort((a, b) => b.overdue - a.overdue);

    // Filter employees for global stats based on selected month
    const filteredEmployeesForStats = selectedMonth
        ? employees.filter(emp => {
            const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
            if (!dueDate) return false;
            const empMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
            return empMonth === selectedMonth;
        })
        : employees;

    const globalStats = {
        total: filteredEmployeesForStats.length,
        delivered: filteredEmployeesForStats.filter(emp =>
            emp.trainingPlan?.delivered || emp.formRGREC048Delivered
        ).length,
        overdue: filteredEmployeesForStats.filter(emp => {
            const delivered = emp.trainingPlan?.delivered || emp.formRGREC048Delivered;
            if (delivered) return false;
            const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
            if (!dueDate) return false;
            return dueDate < new Date();
        }).length,
        pending: 0
    };
    globalStats.pending = globalStats.total - globalStats.delivered;

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

    const filterEmployees = (empList) => {
        return empList.filter(emp => {
            // Filter by status
            const status = getEmployeeStatus(emp);
            let statusMatch = true;
            if (filter === 'pending') statusMatch = status === 'pending' || status === 'warning';
            else if (filter === 'overdue') statusMatch = status === 'overdue';
            else if (filter === 'delivered') statusMatch = status === 'delivered';

            // Filter by month
            let monthMatch = true;
            if (selectedMonth) {
                const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
                if (dueDate) {
                    const empMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
                    monthMatch = empMonth === selectedMonth;
                } else {
                    monthMatch = false;
                }
            }

            return statusMatch && monthMatch;
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

    const getStatusConfig = (status) => {
        const configs = {
            delivered: {
                label: 'Entregado',
                color: '#10b981',
                bgColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                icon: CheckCircle
            },
            pending: {
                label: 'Pendiente',
                color: '#3b82f6',
                bgColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                icon: Clock
            },
            warning: {
                label: 'Próximo',
                color: '#f59e0b',
                bgColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                icon: AlertTriangle
            },
            overdue: {
                label: 'Vencido',
                color: '#ef4444',
                bgColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
                icon: XCircle
            }
        };
        return configs[status] || configs.pending;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getDepartmentEmployees = () => {
        if (!selectedDepartment) return [];
        return filterEmployees(
            employees.filter(emp =>
                (emp.department || '').toUpperCase() === selectedDepartment.toUpperCase()
            )
        );
    };

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

    const toggleArea = (area) => {
        setExpandedAreas(prev => ({
            ...prev,
            [area]: !prev[area]
        }));
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    // Circular Progress Component
    const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
        );
    };

    const globalPercentage = globalStats.total > 0
        ? Math.round((globalStats.delivered / globalStats.total) * 100)
        : 0;

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
                                {selectedDepartment || 'Plan de Formación RG-REC-048'}
                            </h1>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                {selectedDepartment
                                    ? `${getDepartmentEmployees().length} empleados`
                                    : `Seguimiento de ${globalStats.total} empleados`
                                }
                            </p>
                        </div>
                    </div>

                    {!selectedDepartment && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-sm"
                                onClick={() => exportToExcel(employees)}
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: 'none',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <FileSpreadsheet size={16} />
                                Excel
                            </button>
                            <button
                                className="btn btn-sm"
                                onClick={() => exportToPDF(employees)}
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: 'none',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <Download size={16} />
                                PDF
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="app-main">
                {/* Summary Cards */}
                {!selectedDepartment && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        {/* Entregados */}
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                                <CheckCircle size={18} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Entregados</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{globalStats.delivered}</div>
                        </div>

                        {/* Pendientes */}
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                                <Clock size={18} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Pendientes</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{globalStats.pending}</div>
                        </div>

                        {/* Vencidos */}
                        <div style={{
                            background: globalStats.overdue > 0
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            boxShadow: globalStats.overdue > 0
                                ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                                : '0 4px 15px rgba(107, 114, 128, 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                                <XCircle size={18} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Vencidos</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{globalStats.overdue}</div>
                        </div>

                        {/* Progreso Total */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                                    <TrendingUp size={18} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Avance</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{globalPercentage}%</div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <CircularProgress percentage={globalPercentage} size={60} strokeWidth={6} />
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%) rotate(90deg)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                }}>
                                    {globalStats.delivered}/{globalStats.total}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    background: styles.filterBg,
                    padding: '8px',
                    borderRadius: '12px'
                }}>
                    {[
                        { key: 'all', label: 'Todos', icon: Users, count: globalStats.total },
                        { key: 'pending', label: 'Pendientes', icon: Clock, count: globalStats.pending, color: '#3b82f6' },
                        { key: 'overdue', label: 'Vencidos', icon: XCircle, count: globalStats.overdue, color: '#ef4444' },
                        { key: 'delivered', label: 'Entregados', icon: CheckCircle, count: globalStats.delivered, color: '#10b981' }
                    ].map(f => {
                        const Icon = f.icon;
                        const isActive = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? (f.color || 'var(--primary)') : 'transparent',
                                    color: isActive ? 'white' : styles.textSecondary,
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Icon size={16} />
                                {f.label}
                                <span style={{
                                    background: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? 'var(--neutral-700)' : 'var(--neutral-200)'),
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem'
                                }}>
                                    {f.count}
                                </span>
                            </button>
                        );
                    })}

                    {/* Month Filter Indicator */}
                    {selectedMonth && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 500
                        }}>
                            <Calendar size={16} />
                            {monthlyStats.find(m => m.key === selectedMonth)?.label}
                            <button
                                onClick={() => setSelectedMonth(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white',
                                    padding: 0
                                }}
                            >
                                <XCircle size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Monthly Chart */}
                {!selectedDepartment && monthlyStats.length > 0 && (
                    <div className="card" style={{ marginBottom: '20px', overflow: 'hidden' }}>
                        <div className="card-header" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #1e40af 100%)', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 size={18} />
                                    Cumplimiento Mensual
                                </h3>
                                {selectedMonth && (
                                    <button
                                        onClick={() => setSelectedMonth(null)}
                                        style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 500
                                        }}
                                    >
                                        <XCircle size={14} />
                                        Limpiar filtro
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Month Selector */}
                        <div style={{
                            padding: '12px 20px',
                            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Calendar size={16} style={{ color: 'var(--neutral-500)' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 500 }}>Filtrar por mes:</span>
                            <select
                                value={selectedMonth || ''}
                                onChange={(e) => setSelectedMonth(e.target.value || null)}
                                className="form-input"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    flex: 1,
                                    maxWidth: '200px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Todos los meses</option>
                                {monthlyStats.map(month => (
                                    <option key={month.key} value={month.key}>
                                        {month.label} ({month.delivered}/{month.total})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="card-body" style={{ padding: '20px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '12px',
                                height: '180px',
                                overflowX: 'auto',
                                paddingBottom: '10px'
                            }}>
                                {monthlyStats.map(month => {
                                    const percentage = month.total > 0
                                        ? Math.round((month.delivered / month.total) * 100)
                                        : 0;
                                    const barHeight = Math.max(percentage * 1.4, 15);
                                    const barColor = percentage === 100 ? '#10b981'
                                        : percentage >= 70 ? '#3b82f6'
                                            : percentage >= 50 ? '#f59e0b'
                                                : '#ef4444';
                                    const isSelected = selectedMonth === month.key;

                                    return (
                                        <div
                                            key={month.key}
                                            onClick={() => setSelectedMonth(month.key)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '55px',
                                                flex: '1',
                                                cursor: 'pointer',
                                                opacity: selectedMonth && !isSelected ? 0.4 : 1,
                                                transition: 'all 0.2s ease',
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: barColor,
                                                marginBottom: '6px'
                                            }}>
                                                {percentage}%
                                            </span>
                                            <div style={{
                                                width: '100%',
                                                maxWidth: '35px',
                                                height: `${barHeight}px`,
                                                background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}aa 100%)`,
                                                borderRadius: '6px 6px 0 0',
                                                boxShadow: isSelected
                                                    ? `0 4px 16px ${barColor}80`
                                                    : `0 2px 8px ${barColor}40`,
                                                border: isSelected ? `2px solid ${barColor}` : 'none',
                                                transition: 'all 0.2s ease'
                                            }} />
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--neutral-500)',
                                                marginTop: '6px',
                                                textAlign: 'center',
                                                fontWeight: 500
                                            }}>
                                                {month.label.split(' ')[0]}
                                            </span>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                color: 'var(--neutral-400)'
                                            }}>
                                                {month.delivered}/{month.total}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
                }

                {/* Department List or Detail */}
                {
                    !selectedDepartment ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={18} />
                                Departamentos
                            </h3>
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
                                            onClick={() => setSelectedDepartment(dept.department)}
                                            style={{
                                                background: styles.cardBg,
                                                borderRadius: '16px',
                                                padding: '20px',
                                                cursor: 'pointer',
                                                border: dept.overdue > 0 ? '2px solid #ef4444' : `1px solid ${styles.cardBorder}`,
                                                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white'
                                                        }}>
                                                            <Users size={20} />
                                                        </div>
                                                        <div>
                                                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{dept.department}</span>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                                                                {dept.total} empleados
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div style={{
                                                        height: '8px',
                                                        background: isDark ? 'var(--neutral-700)' : 'var(--neutral-100)',
                                                        borderRadius: '4px',
                                                        overflow: 'hidden',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${percentage}%`,
                                                            background: percentage === 100
                                                                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                                                : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                                            borderRadius: '4px',
                                                            transition: 'width 0.5s ease'
                                                        }} />
                                                    </div>

                                                    {/* Stats */}
                                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                                                        <span style={{ color: '#10b981', fontWeight: 500 }}>
                                                            ✓ {dept.delivered}
                                                        </span>
                                                        {dept.pending > 0 && (
                                                            <span style={{ color: 'var(--neutral-500)' }}>
                                                                ⏳ {dept.pending}
                                                            </span>
                                                        )}
                                                        {dept.overdue > 0 && (
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                                ⚠ {dept.overdue} vencidos
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{
                                                            fontSize: '1.75rem',
                                                            fontWeight: 700,
                                                            color: percentage === 100 ? '#10b981' : styles.textPrimary
                                                        }}>
                                                            {percentage}%
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={24} style={{ color: styles.textSecondary }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        // Department Detail View
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Department Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
                                borderRadius: '16px',
                                padding: '20px',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-around',
                                boxShadow: '0 4px 15px rgba(30, 58, 138, 0.3)'
                            }}>
                                {(() => {
                                    const deptEmps = getDepartmentEmployees();
                                    const delivered = deptEmps.filter(e => getEmployeeStatus(e) === 'delivered').length;
                                    const overdue = deptEmps.filter(e => getEmployeeStatus(e) === 'overdue').length;
                                    const pending = deptEmps.length - delivered;
                                    return (
                                        <>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{delivered}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Entregados</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pending}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Pendientes</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: overdue > 0 ? '#fca5a5' : 'inherit' }}>{overdue}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Vencidos</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Areas */}
                            {getAreaGroups().map(([area, data]) => {
                                const isExpanded = expandedAreas[area] !== false; // Default expanded

                                return (
                                    <div key={area} style={{
                                        background: styles.cardBg,
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: data.overdue > 0 ? '2px solid #ef4444' : `1px solid ${styles.cardBorder}`,
                                        boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
                                    }}>
                                        {/* Area Header */}
                                        <div
                                            onClick={() => toggleArea(area)}
                                            style={{
                                                padding: '16px 20px',
                                                background: data.overdue > 0
                                                    ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)')
                                                    : styles.headerBg,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                <span style={{ fontWeight: 600 }}>{area}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                                                <span style={{ color: '#10b981' }}>{data.delivered} ✓</span>
                                                {data.pending > 0 && <span style={{ color: 'var(--neutral-500)' }}>{data.pending} pendientes</span>}
                                                {data.overdue > 0 && (
                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        {data.overdue} vencidos
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Employees List */}
                                        {isExpanded && (
                                            <div style={{ padding: '8px' }}>
                                                {data.employees.map((emp) => {
                                                    const status = getEmployeeStatus(emp);
                                                    const statusConfig = getStatusConfig(status);
                                                    const StatusIcon = statusConfig.icon;
                                                    const dueDate = emp.trainingPlan?.dueDate?.toDate?.() || emp.trainingPlan?.dueDate;
                                                    const daysLeft = getDaysUntilDue(dueDate);

                                                    return (
                                                        <Link
                                                            key={emp.id}
                                                            to={`/employee/${emp.id}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '14px',
                                                                padding: '14px 16px',
                                                                margin: '4px',
                                                                borderRadius: '12px',
                                                                background: styles.employeeCardBg,
                                                                textDecoration: 'none',
                                                                color: 'inherit',
                                                                transition: 'background 0.2s ease'
                                                            }}
                                                        >
                                                            {/* Avatar */}
                                                            <div style={{
                                                                width: '44px',
                                                                height: '44px',
                                                                borderRadius: '12px',
                                                                background: statusConfig.bgColor,
                                                                border: `2px solid ${statusConfig.color}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: statusConfig.color,
                                                                fontWeight: 600,
                                                                fontSize: '0.9rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {getInitials(emp.fullName)}
                                                            </div>

                                                            {/* Info */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{emp.fullName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                                                                    #{emp.employeeNumber} • {emp.position || 'Sin puesto'}
                                                                </div>
                                                                {dueDate && (
                                                                    <div style={{
                                                                        fontSize: '0.7rem',
                                                                        color: status === 'overdue' ? '#ef4444' : 'var(--neutral-400)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        marginTop: '2px'
                                                                    }}>
                                                                        <Calendar size={12} />
                                                                        Límite: {formatDate(dueDate)}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Status */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                                {status !== 'delivered' && daysLeft !== null && (
                                                                    <span style={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: daysLeft < 0 ? '#ef4444' : 'var(--neutral-500)'
                                                                    }}>
                                                                        {daysLeft < 0
                                                                            ? `${Math.abs(daysLeft)}d vencido`
                                                                            : `${daysLeft}d`
                                                                        }
                                                                    </span>
                                                                )}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '5px 10px',
                                                                    borderRadius: '20px',
                                                                    background: statusConfig.bgColor,
                                                                    color: statusConfig.color,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600
                                                                }}>
                                                                    <StatusIcon size={14} />
                                                                    {statusConfig.label}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {getAreaGroups().length === 0 && (
                                <div style={{
                                    background: styles.cardBg,
                                    borderRadius: '16px',
                                    padding: '60px 20px',
                                    textAlign: 'center',
                                    color: styles.textSecondary,
                                    border: `1px solid ${styles.cardBorder}`
                                }}>
                                    <Users size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <p>No hay empleados con el filtro seleccionado</p>
                                </div>
                            )}
                        </div>
                    )
                }
            </main >
        </div >
    );
}
