import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Users,
    GraduationCap,
    Layers,
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
        <aside className="desktop-sidebar desktop-sidebar--capacitacion">
            <div className="desktop-sidebar-logo">
                <div className="desktop-sidebar-logo-icon desktop-sidebar-logo-icon--success">
                    <GraduationCap size={24} strokeWidth={1.5} />
                </div>
                <span>Capacitación</span>
            </div>

            <nav className="desktop-nav">
                <Link
                    to="/"
                    className="desktop-nav-item desktop-nav-item--muted"
                >
                    <Home size={20} />
                    Módulos
                </Link>

                <div className="desktop-nav-divider" />

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

            <div className="desktop-sidebar-footer">
                <div className="desktop-user-profile">
                    <div className="desktop-user-avatar desktop-user-avatar--success">
                        {adminData?.name?.charAt(0) || 'A'}
                    </div>
                    <div className="desktop-user-info">
                        <div className="desktop-user-name">
                            {adminData?.name || 'Admin'}
                        </div>
                        <div className="desktop-user-email">
                            {adminData?.email}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="desktop-nav-item desktop-logout-btn"
                >
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
