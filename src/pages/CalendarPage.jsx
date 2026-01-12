import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Users,
    Bell,
    FileText,
    Settings,
    AlertTriangle,
    Clock
} from 'lucide-react';

export default function CalendarPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'employees'), orderBy('contractEndDate'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(data.filter(e => e.status === 'active'));
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Obtener días del mes
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];

        // Días del mes anterior
        for (let i = 0; i < startingDay; i++) {
            const prevDate = new Date(year, month, -startingDay + i + 1);
            days.push({ date: prevDate, isCurrentMonth: false });
        }

        // Días del mes actual
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Días del siguiente mes
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    };

    // Obtener empleados con contrato que vence en un día específico
    const getEmployeesForDay = (date) => {
        return employees.filter(emp => {
            if (!emp.contractEndDate) return false;
            const endDate = emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate);
            return endDate.toDateString() === date.toDateString();
        });
    };

    // Obtener días con contratos por vencer (próximos 30 días)
    const getDaysWithExpiring = (date) => {
        const today = new Date();
        const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'past';
        if (diff <= 7) return 'danger';
        if (diff <= 15) return 'warning';
        if (diff <= 30) return 'info';
        return 'normal';
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
        setSelectedDay(null);
    };

    const formatMonthYear = (date) => {
        return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const days = getDaysInMonth(currentDate);
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Empleados del día seleccionado
    const selectedDayEmployees = selectedDay ? getEmployeesForDay(selectedDay) : [];

    // Resumen de contratos por vencer
    const expiringThisMonth = employees.filter(emp => {
        if (!emp.contractEndDate) return false;
        const endDate = emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate);
        return endDate.getMonth() === currentDate.getMonth() &&
            endDate.getFullYear() === currentDate.getFullYear();
    });

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
                        <Link
                            to="/"
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="app-title">Calendario</h1>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                Vencimientos de contratos
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div className="stat-card" style={{ padding: '12px' }}>
                        <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>
                            {employees.filter(e => {
                                if (!e.contractEndDate) return false;
                                const end = e.contractEndDate.toDate ? e.contractEndDate.toDate() : new Date(e.contractEndDate);
                                const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
                                return diff >= 0 && diff <= 7;
                            }).length}
                        </div>
                        <div className="stat-card-label" style={{ fontSize: '0.7rem' }}>Esta semana</div>
                    </div>
                    <div className="stat-card" style={{ padding: '12px' }}>
                        <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--warning)' }}>
                            {expiringThisMonth.length}
                        </div>
                        <div className="stat-card-label" style={{ fontSize: '0.7rem' }}>Este mes</div>
                    </div>
                    <div className="stat-card" style={{ padding: '12px' }}>
                        <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                            {employees.length}
                        </div>
                        <div className="stat-card-label" style={{ fontSize: '0.7rem' }}>Total activos</div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            className="btn btn-icon btn-secondary"
                            onClick={() => navigateMonth(-1)}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
                            {formatMonthYear(currentDate)}
                        </h3>
                        <button
                            className="btn btn-icon btn-secondary"
                            onClick={() => navigateMonth(1)}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="card-body" style={{ padding: '12px' }}>
                        {/* Week days header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            marginBottom: '8px'
                        }}>
                            {weekDays.map(day => (
                                <div
                                    key={day}
                                    style={{
                                        textAlign: 'center',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        padding: '8px 0'
                                    }}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px'
                        }}>
                            {days.map((day, index) => {
                                const employeesOnDay = getEmployeesForDay(day.date);
                                const expiringStatus = employeesOnDay.length > 0 ? getDaysWithExpiring(day.date) : null;
                                const isSelected = selectedDay?.toDateString() === day.date.toDateString();

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDay(day.date)}
                                        style={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--neutral-200)',
                                            borderRadius: 'var(--radius)',
                                            background: isToday(day.date)
                                                ? 'var(--primary)'
                                                : isSelected
                                                    ? 'var(--neutral-100)'
                                                    : 'var(--surface)',
                                            color: isToday(day.date)
                                                ? 'white'
                                                : day.isCurrentMonth
                                                    ? 'var(--text-primary)'
                                                    : 'var(--neutral-400)',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            fontSize: '0.875rem',
                                            fontWeight: isToday(day.date) ? 600 : 400,
                                            opacity: day.isCurrentMonth ? 1 : 0.5
                                        }}
                                    >
                                        {day.date.getDate()}
                                        {employeesOnDay.length > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '4px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: expiringStatus === 'danger' ? 'var(--danger)'
                                                    : expiringStatus === 'warning' ? 'var(--warning)'
                                                        : expiringStatus === 'past' ? 'var(--neutral-400)'
                                                            : 'var(--info)'
                                            }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }}></span>
                        0-7 días
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }}></span>
                        8-15 días
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--info)' }}></span>
                        16-30 días
                    </div>
                </div>

                {/* Selected Day Detail */}
                {selectedDay && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} />
                                {selectedDay.toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </h3>
                        </div>
                        <div className="card-body">
                            {selectedDayEmployees.length === 0 ? (
                                <p className="text-muted text-center" style={{ padding: '16px 0' }}>
                                    No hay contratos que venzan este día
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedDayEmployees.map(emp => (
                                        <Link
                                            key={emp.id}
                                            to={`/employee/${emp.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: 'var(--neutral-50)',
                                                borderRadius: 'var(--radius)',
                                                textDecoration: 'none',
                                                color: 'inherit'
                                            }}
                                        >
                                            <div className="employee-avatar" style={{ width: '40px', height: '40px', fontSize: '0.875rem' }}>
                                                {emp.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500 }}>{emp.fullName}</div>
                                                <div className="text-sm text-muted">{emp.area} • {emp.department}</div>
                                            </div>
                                            <Clock size={18} color="var(--danger)" />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
                <Link to="/calendar" className="nav-item active">
                    <Calendar size={22} />
                    <span>Calendario</span>
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
        </div>
    );
}
