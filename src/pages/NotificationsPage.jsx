import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import {
    ArrowLeft,
    Clock,
    AlertTriangle,
    ClipboardCheck,
    ChevronRight,
    Users,
    Bell,
    FileText,
    Settings
} from 'lucide-react';

export default function NotificationsPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const q = query(collection(db, 'employees'), orderBy('startDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(data);
            calculateNotifications(data);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const calculateNotifications = (employeeList) => {
        const today = new Date();
        const notifs = [];

        employeeList.forEach(emp => {
            // Contratos próximos a vencer
            if (emp.contractEndDate && emp.status === 'active') {
                const endDate = emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate);
                const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
                    notifs.push({
                        id: `contract-${emp.id}`,
                        type: daysUntilEnd <= 7 ? 'danger' : daysUntilEnd <= 15 ? 'warning' : 'info',
                        category: 'contract',
                        icon: Clock,
                        title: daysUntilEnd <= 7 ? 'Contrato por vencer' : 'Contrato próximo a vencer',
                        message: `${emp.fullName} - ${daysUntilEnd} días restantes`,
                        employeeId: emp.id,
                        employeeName: emp.fullName,
                        daysLeft: daysUntilEnd,
                        date: endDate
                    });
                }
            }

            // Evaluaciones pendientes
            if (emp.startDate && emp.evaluations && emp.status === 'active') {
                const startDate = emp.startDate.toDate ? emp.startDate.toDate() : new Date(emp.startDate);
                const daysSinceStart = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

                [30, 60, 75].forEach((day) => {
                    const evalKey = `day${day}`;
                    const eval_ = emp.evaluations[evalKey];

                    // Mostrar si está dentro de +-7 días y no está completada
                    if (!eval_?.score && daysSinceStart >= day - 7 && daysSinceStart <= day + 7) {
                        const isOverdue = daysSinceStart > day;
                        notifs.push({
                            id: `eval-${emp.id}-${day}`,
                            type: isOverdue ? 'danger' : 'warning',
                            category: 'evaluation',
                            icon: ClipboardCheck,
                            title: `Evaluación ${day} días ${isOverdue ? '(vencida)' : 'pendiente'}`,
                            message: emp.fullName,
                            employeeId: emp.id,
                            employeeName: emp.fullName,
                            evalDay: day
                        });
                    }
                });
            }

            // Seguimiento requerido
            if (emp.evaluations) {
                Object.entries(emp.evaluations).forEach(([key, eval_]) => {
                    if (eval_?.requiresFollowUp && eval_?.score) {
                        const day = key.replace('day', '');
                        notifs.push({
                            id: `followup-${emp.id}-${key}`,
                            type: 'warning',
                            category: 'followup',
                            icon: AlertTriangle,
                            title: `Requiere seguimiento (Eval ${day} días)`,
                            message: `${emp.fullName} - Calificación: ${eval_.score}`,
                            employeeId: emp.id,
                            employeeName: emp.fullName
                        });
                    }
                });
            }
        });

        // Ordenar por prioridad
        notifs.sort((a, b) => {
            const priority = { danger: 0, warning: 1, info: 2 };
            return priority[a.type] - priority[b.type];
        });

        setNotifications(notifs);
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        return n.category === filter;
    });

    const getTypeStyles = (type) => {
        switch (type) {
            case 'danger':
                return { bg: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)' };
            case 'warning':
                return { bg: 'rgba(217, 119, 6, 0.1)', color: 'var(--warning)' };
            default:
                return { bg: 'rgba(30, 58, 138, 0.1)', color: 'var(--primary)' };
        }
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
            <Sidebar notificationCount={notifications.length} />

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
                            <h1 className="app-title">Notificaciones</h1>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                {notifications.length} alertas activas
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Filter Tabs */}
                <div className="tabs" style={{ marginBottom: '16px' }}>
                    <button
                        className={`tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Todas ({notifications.length})
                    </button>
                    <button
                        className={`tab ${filter === 'contract' ? 'active' : ''}`}
                        onClick={() => setFilter('contract')}
                    >
                        Contratos
                    </button>
                    <button
                        className={`tab ${filter === 'evaluation' ? 'active' : ''}`}
                        onClick={() => setFilter('evaluation')}
                    >
                        Evaluaciones
                    </button>
                    <button
                        className={`tab ${filter === 'followup' ? 'active' : ''}`}
                        onClick={() => setFilter('followup')}
                    >
                        Seguimiento
                    </button>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Bell size={32} />
                        </div>
                        <p>No hay notificaciones</p>
                        <p className="text-sm text-muted">Todo está al día</p>
                    </div>
                ) : (
                    <div className="notification-list">
                        {filteredNotifications.map(notif => {
                            const Icon = notif.icon;
                            const styles = getTypeStyles(notif.type);

                            return (
                                <Link
                                    key={notif.id}
                                    to={`/employee/${notif.employeeId}`}
                                    className={`notification-item ${notif.type}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div
                                        className="notification-icon"
                                        style={{ background: styles.bg, color: styles.color }}
                                    >
                                        <Icon size={18} />
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">{notif.title}</div>
                                        <div className="notification-text">{notif.message}</div>
                                    </div>
                                    <ChevronRight size={18} color="var(--neutral-400)" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <Link to="/" className="nav-item">
                    <Users size={22} />
                    <span>Inicio</span>
                </Link>
                <Link to="/notifications" className="nav-item active">
                    <Bell size={22} />
                    <span>Alertas</span>
                    {notifications.length > 0 && (
                        <span className="nav-badge">{notifications.length}</span>
                    )}
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
