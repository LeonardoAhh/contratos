import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Home, Settings, LogOut, Construction, Users, Layers } from 'lucide-react';
import CapacitacionSidebar from '../components/CapacitacionSidebar';

export default function CapacitacionDashboard() {
    const navigate = useNavigate();
    const { logout, adminData } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleBackToModules = () => {
        navigate('/');
    };

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
                            <h1 className="capacitacion-title">Capacitación</h1>
                        </div>
                        <div className="capacitacion-header-right">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleBackToModules}
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

                {/* Main Content Premium */}
                <main className="capacitacion-main" style={{ display: 'block', padding: 'var(--spacing-lg)' }}>
                    {/* Welcome Hero Section */}
                    <div className="dashboard-hero">
                        <div className="dashboard-hero-content">
                            <div className="dashboard-hero-icon">
                                <GraduationCap size={48} strokeWidth={1.2} />
                            </div>
                            <div className="dashboard-hero-text">
                                <h1 className="dashboard-hero-title">¡Bienvenido al Módulo de Capacitación!</h1>
                                <p className="dashboard-hero-subtitle">
                                    Gestiona empleados, promociones y exámenes de categoría
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Cards */}
                    <div className="section-header-premium" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <h2>Accesos Rápidos</h2>
                    </div>

                    <div className="dashboard-nav-cards">
                        <button
                            className="dashboard-nav-card"
                            onClick={() => navigate('/capacitacion/employees')}
                        >
                            <div className="dashboard-nav-icon primary">
                                <Users size={28} />
                            </div>
                            <div className="dashboard-nav-content">
                                <h3>Empleados</h3>
                                <p>Gestiona el directorio de empleados</p>
                            </div>
                            <div className="dashboard-nav-arrow">→</div>
                        </button>

                        <button
                            className="dashboard-nav-card"
                            onClick={() => navigate('/capacitacion/categorias')}
                        >
                            <div className="dashboard-nav-icon success">
                                <Layers size={28} />
                            </div>
                            <div className="dashboard-nav-content">
                                <h3>Cambio de Categoría</h3>
                                <p>Promociones y requisitos</p>
                            </div>
                            <div className="dashboard-nav-arrow">→</div>
                        </button>

                        <button
                            className="dashboard-nav-card"
                            onClick={() => navigate('/capacitacion/examenes')}
                        >
                            <div className="dashboard-nav-icon warning">
                                <GraduationCap size={28} />
                            </div>
                            <div className="dashboard-nav-content">
                                <h3>Historial de Exámenes</h3>
                                <p>Registros y calificaciones</p>
                            </div>
                            <div className="dashboard-nav-arrow">→</div>
                        </button>
                    </div>
                </main>

                {/* Bottom Navigation */}
                <nav className="app-nav app-nav--capacitacion">
                    <button className="nav-item active">
                        <GraduationCap size={22} />
                        <span>Inicio</span>
                    </button>
                    <button onClick={() => navigate('/capacitacion/employees')} className="nav-item">
                        <Users size={22} />
                        <span>Empleados</span>
                    </button>
                    <button onClick={() => navigate('/capacitacion/categorias')} className="nav-item">
                        <Layers size={22} />
                        <span>Categorías</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
