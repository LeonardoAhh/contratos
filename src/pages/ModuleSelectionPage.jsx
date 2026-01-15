import { useNavigate } from 'react-router-dom';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
import { FileText, GraduationCap, LogOut, Lock } from 'lucide-react';

export default function ModuleSelectionPage() {
    const navigate = useNavigate();
    const { logout, adminData, hasPermission, isSuperAdmin } = useAuth();

    // Verificar permisos para cada módulo
    const canAccessContratos = isSuperAdmin() || hasPermission(PERMISSIONS.VIEW_EMPLOYEES);
    const canAccessCapacitacion = isSuperAdmin() || hasPermission(PERMISSIONS.ACCESS_CAPACITACION);

    const handleSelectContratos = () => {
        if (canAccessContratos) {
            navigate('/contratos');
        }
    };

    const handleSelectCapacitacion = () => {
        if (canAccessCapacitacion) {
            navigate('/capacitacion');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="module-selection-page">
            <div className="module-selection-container">
                <div className="module-selection-header">
                    <h1 className="module-selection-title">Selecciona un Módulo</h1>
                    <p className="module-selection-subtitle">
                        Bienvenido, {adminData?.name || 'Administrador'}
                    </p>
                </div>

                <div className="module-cards">
                    <button
                        className={`module-card module-card-contratos ${!canAccessContratos ? 'disabled' : ''}`}
                        onClick={handleSelectContratos}
                        disabled={!canAccessContratos}
                    >
                        <div className="module-card-icon">
                            <FileText size={48} strokeWidth={1.5} />
                        </div>
                        <div className="module-card-content">
                            <h2 className="module-card-title">Contratos</h2>
                            <p className="module-card-description">
                                Gestión de contratos y seguimiento de nuevo ingreso
                            </p>
                        </div>
                        {canAccessContratos ? (
                            <div className="module-card-arrow">→</div>
                        ) : (
                            <div className="module-card-lock"><Lock size={20} /></div>
                        )}
                    </button>

                    <button
                        className={`module-card module-card-capacitacion ${!canAccessCapacitacion ? 'disabled' : ''}`}
                        onClick={handleSelectCapacitacion}
                        disabled={!canAccessCapacitacion}
                    >
                        <div className="module-card-icon">
                            <GraduationCap size={48} strokeWidth={1.5} />
                        </div>
                        <div className="module-card-content">
                            <h2 className="module-card-title">Capacitación</h2>
                            <p className="module-card-description">
                                Gestión de capacitaciones y formación del personal
                            </p>
                        </div>
                        {canAccessCapacitacion ? (
                            <div className="module-card-arrow">→</div>
                        ) : (
                            <div className="module-card-lock"><Lock size={20} /></div>
                        )}
                    </button>
                </div>

                <button className="module-logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
