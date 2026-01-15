import { Link, useLocation } from 'react-router-dom';
import {
    Users,
    Bell,
    FileText,
    Settings,
    LogOut,
    Calendar,
    Layers,
    BarChart3,
    Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function Sidebar({ notificationCount = 0 }) {
    const location = useLocation();
    const { adminData, logout } = useAuth();
    const { t } = useTranslation();

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = async () => {
        await logout();
    };

    return (
        <aside className="desktop-sidebar">
            <div className="desktop-sidebar-logo">
                <div className="desktop-sidebar-logo-icon">
                    <Layers size={24} strokeWidth={1.5} />
                </div>
                <span>Contratos</span>
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
                    to="/contratos"
                    className={`desktop-nav-item ${isActive('/contratos') ? 'active' : ''}`}
                >
                    <Users size={20} />
                    {t('dashboard')}
                </Link>

                <Link
                    to="/contratos/notifications"
                    className={`desktop-nav-item ${isActive('/contratos/notifications') ? 'active' : ''}`}
                >
                    <Bell size={20} />
                    {t('notifications')}
                    {notificationCount > 0 && (
                        <span className="desktop-nav-badge">{notificationCount}</span>
                    )}
                </Link>

                <Link
                    to="/contratos/calendar"
                    className={`desktop-nav-item ${isActive('/contratos/calendar') ? 'active' : ''}`}
                >
                    <Calendar size={20} />
                    {t('calendar')}
                </Link>

                <Link
                    to="/contratos/reports"
                    className={`desktop-nav-item ${isActive('/contratos/reports') ? 'active' : ''}`}
                >
                    <FileText size={20} />
                    {t('reports')}
                </Link>

                <Link
                    to="/contratos/indicators"
                    className={`desktop-nav-item ${isActive('/contratos/indicators') ? 'active' : ''}`}
                >
                    <BarChart3 size={20} />
                    Indicadores
                </Link>

                <Link
                    to="/contratos/settings"
                    className={`desktop-nav-item ${isActive('/contratos/settings') ? 'active' : ''}`}
                >
                    <Settings size={20} />
                    {t('settings')}
                </Link>
            </nav>

            <div className="desktop-sidebar-footer">
                <div className="desktop-user-profile">
                    <div className="desktop-user-avatar">
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
                    {t('logout')}
                </button>
            </div>
        </aside>
    );
}
