import { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Sidebar from '../components/Sidebar';
import { usePermissions } from '../components/PermissionGuard';
import {
    Users,
    Clock,
    AlertTriangle,
    ClipboardCheck,
    Bell,
    Plus,
    ChevronRight,
    FileText,
    Settings,
    LogOut,
    Filter,
    Search,
    Star,
    X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Helper function to get evaluation name
const getEvaluationName = (day) => {
    const names = {
        30: 'First evaluation',
        60: 'Second evaluation',
        75: 'Third evaluation'
    };
    return names[day] || `Evaluation ${day} days`;
};

export default function Dashboard() {
    const { adminData, logout } = useAuth();
    const { requestPermission, permission, checkAlerts } = useNotifications();
    const { canEditEmployees } = usePermissions();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [filters, setFilters] = useState({
        area: '',
        department: '',
        shift: '',
        status: ''
    });

    // Solicitar permiso de notificaciones
    useEffect(() => {
        if (permission === 'default') {
            requestPermission();
        }
    }, [permission, requestPermission]);

    // Cargar empleados en tiempo real
    useEffect(() => {
        const q = query(collection(db, 'employees'), orderBy('startDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const employeeData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(employeeData);
            calculateNotifications(employeeData);
            checkAlerts(employeeData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Calcular notificaciones
    const calculateNotifications = (employeeList) => {
        const today = new Date();
        const notifs = [];

        employeeList.forEach(emp => {
            if (emp.contractEndDate) {
                const endDate = emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate);
                const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
                    notifs.push({
                        id: `contract-${emp.id}`,
                        type: 'danger',
                        title: 'Contrato por vencer',
                        message: `${emp.fullName} - ${daysUntilEnd} días restantes`,
                        employeeId: emp.id
                    });
                } else if (daysUntilEnd <= 15 && daysUntilEnd > 7) {
                    notifs.push({
                        id: `contract-${emp.id}`,
                        type: 'warning',
                        title: 'Contrato próximo a vencer',
                        message: `${emp.fullName} - ${daysUntilEnd} días restantes`,
                        employeeId: emp.id
                    });
                }
            }

            if (emp.startDate && emp.evaluations) {
                const startDate = emp.startDate.toDate ? emp.startDate.toDate() : new Date(emp.startDate);
                const daysSinceStart = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

                [30, 60, 75].forEach(day => {
                    const evalKey = `day${day}`;
                    const eval_ = emp.evaluations[evalKey];

                    if (!eval_?.score && daysSinceStart >= day - 5 && daysSinceStart <= day + 5) {
                        notifs.push({
                            id: `eval-${emp.id}-${day}`,
                            type: 'info',
                            title: `${getEvaluationName(day)} pending`,
                            message: emp.fullName,
                            employeeId: emp.id
                        });
                    }
                });
            }
        });

        setNotifications(notifs);
    };

    // Toggle favorito
    const toggleFavorite = async (e, empId) => {
        e.preventDefault();
        e.stopPropagation();

        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        try {
            await updateDoc(doc(db, 'employees', empId), {
                isFavorite: !emp.isFavorite
            });
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    // Filtrar empleados con búsqueda y favoritos
    const filteredEmployees = employees.filter(emp => {
        // Búsqueda
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchName = emp.fullName?.toLowerCase().includes(query);
            const matchNumber = emp.employeeNumber?.toLowerCase().includes(query);
            const matchOriginalNumber = String(emp.originalEmployeeNumber)?.includes(query);
            if (!matchName && !matchNumber && !matchOriginalNumber) return false;
        }

        // Solo favoritos
        if (showFavoritesOnly && !emp.isFavorite) return false;

        // Filtros
        if (filters.area && emp.area !== filters.area) return false;
        if (filters.department && emp.department !== filters.department) return false;
        if (filters.shift && emp.shift !== filters.shift) return false;
        if (filters.status && emp.status !== filters.status) return false;

        return true;
    });

    // Estadísticas
    const stats = {
        total: employees.length,
        active: employees.filter(e => e.status === 'active').length,
        expiringSoon: notifications.filter(n => n.type === 'danger' || n.type === 'warning').length,
        pendingEvals: notifications.filter(n => n.title?.includes('Evaluación')).length
    };

    // Valores únicos para filtros
    const uniqueAreas = [...new Set(employees.map(e => e.area).filter(Boolean))];
    const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    const uniqueShifts = [...new Set(employees.map(e => e.shift).filter(Boolean))];

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
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
        <div className="app-layout">
            <Sidebar notificationCount={notifications.length} />

            <header className="app-header">
                <div className="app-header-content">
                    <div>
                        <h1 className="app-title">Dashboard</h1>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            Hola, {adminData?.name || 'Administrador'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to="/notifications" className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', position: 'relative' }}>
                            <Bell size={20} />
                            {notifications.length > 0 && (
                                <span className="nav-badge">{notifications.length}</span>
                            )}
                        </Link>
                        <button onClick={handleLogout} className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-icon primary">
                            <Users size={20} />
                        </div>
                        <div className="stat-card-value">{stats.total}</div>
                        <div className="stat-card-label">Total empleados</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon success">
                            <ClipboardCheck size={20} />
                        </div>
                        <div className="stat-card-value">{stats.active}</div>
                        <div className="stat-card-label">Contratos activos</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon danger">
                            <Clock size={20} />
                        </div>
                        <div className="stat-card-value">{stats.expiringSoon}</div>
                        <div className="stat-card-label">Por vencer</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon warning">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="stat-card-value">{stats.pendingEvals}</div>
                        <div className="stat-card-label">Evaluaciones</div>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--neutral-400)'
                        }}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar por nombre o número de empleado..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--neutral-400)'
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Filter buttons */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <button
                        className={`btn btn-sm ${showFavoritesOnly ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        <Star size={16} fill={showFavoritesOnly ? 'white' : 'none'} />
                        Favoritos
                    </button>
                    <button
                        className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} />
                        Filtros
                    </button>
                </div>

                {showFilters && (
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="card-body">
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Área</label>
                                    <select
                                        className="form-input form-select"
                                        value={filters.area}
                                        onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                                    >
                                        <option value="">Todas las áreas</option>
                                        {uniqueAreas.map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Departamento</label>
                                    <select
                                        className="form-input form-select"
                                        value={filters.department}
                                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                    >
                                        <option value="">Todos los departamentos</option>
                                        {uniqueDepartments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Turno</label>
                                    <select
                                        className="form-input form-select"
                                        value={filters.shift}
                                        onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                                    >
                                        <option value="">Todos los turnos</option>
                                        {uniqueShifts.map(shift => (
                                            <option key={shift} value={shift}>{shift}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Estado</label>
                                    <select
                                        className="form-input form-select"
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="active">Activo</option>
                                        <option value="indefinite">Indeterminado</option>
                                        <option value="terminated">Baja solicitada</option>
                                    </select>
                                </div>

                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setFilters({ area: '', department: '', shift: '', status: '' })}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Employee List */}
                <div className="section-title">
                    <span>Empleados ({filteredEmployees.length})</span>
                    {canEditEmployees ? (
                        <Link to="/employee/new" className="btn btn-primary btn-sm">
                            <Plus size={16} />
                            Nuevo
                        </Link>
                    ) : (
                        <span
                            className="btn btn-primary btn-sm"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            title="No tienes permiso para agregar empleados"
                        >
                            <Plus size={16} />
                            Nuevo
                        </span>
                    )}
                </div>

                {filteredEmployees.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Users size={32} />
                        </div>
                        <p>{searchQuery ? 'No se encontraron resultados' : 'No hay empleados registrados'}</p>
                        {!searchQuery && canEditEmployees && (
                            <Link to="/employee/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
                                <Plus size={16} />
                                Agregar empleado
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="employee-list">
                        {filteredEmployees.map(emp => (
                            <Link
                                key={emp.id}
                                to={`/employee/${emp.id}`}
                                className="employee-item"
                            >
                                <button
                                    onClick={(e) => toggleFavorite(e, emp.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                >
                                    <Star
                                        size={18}
                                        fill={emp.isFavorite ? 'var(--warning)' : 'none'}
                                        color={emp.isFavorite ? 'var(--warning)' : 'var(--neutral-300)'}
                                    />
                                </button>
                                <div className="employee-avatar">
                                    {getInitials(emp.fullName)}
                                </div>
                                <div className="employee-info">
                                    <div className="employee-name">{emp.fullName}</div>
                                    <div className="employee-meta">
                                        <span>{emp.employeeNumber}</span>
                                        <span>•</span>
                                        <span>{emp.area}</span>
                                    </div>
                                </div>
                                <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'terminated' ? 'danger' : 'warning'}`}>
                                    {emp.status === 'active' ? 'Activo' : emp.status === 'terminated' ? 'Baja' : 'Indeterminado'}
                                </span>
                                <ChevronRight size={20} color="var(--neutral-400)" />
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <Link to="/" className="nav-item active">
                    <Users size={22} />
                    <span>Inicio</span>
                </Link>
                <Link to="/notifications" className="nav-item">
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
