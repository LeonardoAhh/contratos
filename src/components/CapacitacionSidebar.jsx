import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Users,
    GraduationCap,
    Layers,
    Settings,
    LogOut,
    Home,
    Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CapacitacionSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { adminData, logout } = useAuth();

    const isActive = (path) => {
        if (path === '/capacitacion') {
            return location.pathname === '/capacitacion';
        }
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside className="desktop-sidebar">
            <div className="desktop-sidebar-logo">
                <GraduationCap size={24} strokeWidth={1.5} />
                <span>Capacitación</span>
            </div>

            <nav className="desktop-nav">
                <Link
                    to="/"
                    className="desktop-nav-item"
                    style={{ opacity: 0.7 }}
                >
                    <Home size={20} />
                    Módulos
                </Link>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

                <Link
                    to="/capacitacion"
                    className={`desktop-nav-item ${isActive('/capacitacion') && !isActive('/capacitacion/') ? 'active' : ''}`}
                >
                    <GraduationCap size={20} />
                    Inicio
                </Link>

                <Link
                    to="/capacitacion/employees"
                    className={`desktop-nav-item ${isActive('/capacitacion/employees') ? 'active' : ''}`}
                >
                    <Users size={20} />
                    Empleados
                </Link>

                <Link
                    to="/capacitacion/categorias"
                    className={`desktop-nav-item ${isActive('/capacitacion/categorias') ? 'active' : ''}`}
                >
                    <Layers size={20} />
                    Categorías
                </Link>

                <Link
                    to="/capacitacion/examenes"
                    className={`desktop-nav-item ${isActive('/capacitacion/examenes') ? 'active' : ''}`}
                >
                    <Award size={20} />
                    Exámenes
                </Link>
            </nav>

            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '16px',
                marginTop: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--success) 0%, var(--success-light) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600
                    }}>
                        {adminData?.name?.charAt(0) || 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {adminData?.name || 'Admin'}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {adminData?.email}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="desktop-nav-item"
                    style={{
                        width: '100%',
                        border: 'none',
                        cursor: 'pointer',
                        background: 'transparent'
                    }}
                >
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
