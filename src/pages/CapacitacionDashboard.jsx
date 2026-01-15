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

                {/* Main Content */}
                <main className="capacitacion-main">
                    <div className="capacitacion-placeholder">
                        <div className="placeholder-icon" style={{ color: 'var(--success)' }}>
                            <GraduationCap size={64} strokeWidth={1.2} />
                        </div>
                        <h2 className="placeholder-title">Módulo de Capacitación</h2>
                        <p className="placeholder-description">
                            Bienvenido al módulo de Capacitación. Aquí podrás gestionar
                            empleados, capacitaciones y formación del personal.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/capacitacion/employees')}
                        >
                            <Users size={18} />
                            Ver Empleados
                        </button>
                    </div>
                </main>

                {/* Bottom Navigation */}
                <nav className="app-nav">
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
