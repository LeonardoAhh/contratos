import { Link, useLocation } from 'react-router-dom';
import {
    Users,
    Bell,
    FileText,
    Settings,
    LogOut,
    Calendar,
    Layers,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function Sidebar({ notificationCount = 0 }) {
    const location = useLocation();
    const { adminData, logout } = useAuth();
    const { t } = useTranslation();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
    };

    return (
        <aside className="desktop-sidebar">
            <div className="desktop-sidebar-logo">
                <Layers size={24} strokeWidth={1.5} />
                <span>Contratos</span>
            </div>

            <nav className="desktop-nav">
                <Link
                    to="/"
                    className={`desktop-nav-item ${isActive('/') ? 'active' : ''}`}
                >
                    <Users size={20} />
                    {t('dashboard')}
                </Link>

                <Link
                    to="/notifications"
                    className={`desktop-nav-item ${isActive('/notifications') ? 'active' : ''}`}
                >
                    <Bell size={20} />
                    {t('notifications')}
                    {notificationCount > 0 && (
                        <span className="desktop-nav-badge">{notificationCount}</span>
                    )}
                </Link>

                <Link
                    to="/calendar"
                    className={`desktop-nav-item ${isActive('/calendar') ? 'active' : ''}`}
                >
                    <Calendar size={20} />
                    {t('calendar')}
                </Link>

                <Link
                    to="/reports"
                    className={`desktop-nav-item ${isActive('/reports') ? 'active' : ''}`}
                >
                    <FileText size={20} />
                    {t('reports')}
                </Link>

                <Link
                    to="/indicators"
                    className={`desktop-nav-item ${isActive('/indicators') ? 'active' : ''}`}
                >
                    <BarChart3 size={20} />
                    Indicadores
                </Link>

                <Link
                    to="/settings"
                    className={`desktop-nav-item ${isActive('/settings') ? 'active' : ''}`}
                >
                    <Settings size={20} />
                    {t('settings')}
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
                        background: 'rgba(255,255,255,0.2)',
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
                    {t('logout')}
                </button>
            </div>
        </aside>
    );
}
