import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    ArrowLeft,
    Users,
    Bell,
    FileText,
    Settings,
    Shield,
    ShieldCheck,
    Trash2,
    Check,
    X,
    Crown
} from 'lucide-react';

const PERMISSION_LABELS = {
    [PERMISSIONS.VIEW_EMPLOYEES]: { label: 'Ver empleados', desc: 'Ver lista y detalles de empleados' },
    [PERMISSIONS.EDIT_EMPLOYEES]: { label: 'Editar empleados', desc: 'Crear y modificar empleados' },
    [PERMISSIONS.DELETE_EMPLOYEES]: { label: 'Eliminar empleados', desc: 'Eliminar registros de empleados' },
    [PERMISSIONS.VIEW_REPORTS]: { label: 'Ver reportes', desc: 'Acceder a la página de reportes' },
    [PERMISSIONS.EXPORT_REPORTS]: { label: 'Exportar reportes', desc: 'Descargar Excel y PDF' },
    [PERMISSIONS.MANAGE_EVALUATIONS]: { label: 'Gestionar evaluaciones', desc: 'Registrar evaluaciones de desempeño' },
    [PERMISSIONS.RENEW_CONTRACTS]: { label: 'Renovar contratos', desc: 'Extender fechas de contrato' },
    [PERMISSIONS.MANAGE_CATALOGS]: { label: 'Gestionar catálogos', desc: 'Editar áreas, departamentos, puestos' },
    [PERMISSIONS.IMPORT_DATA]: { label: 'Importar datos', desc: 'Cargar empleados desde JSON' },
    [PERMISSIONS.MANAGE_ADMINS]: { label: 'Gestionar administradores', desc: 'Crear y editar otros admins' }
};

export default function AdminManagementPage() {
    const navigate = useNavigate();
    const {
        adminData,
        isSuperAdmin,
        hasPermission,
        loadAdmins,
        allAdmins,
        updateAdminPermissions,
        deleteAdmin
    } = useAuth();

    const [loading, setLoading] = useState(true);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [tempPermissions, setTempPermissions] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        // Verificar acceso
        if (!isSuperAdmin() && !hasPermission(PERMISSIONS.MANAGE_ADMINS)) {
            navigate('/');
            return;
        }

        loadAdmins().then(() => setLoading(false));
    }, []);

    const handleEditPermissions = (admin) => {
        setEditingAdmin(admin);
        setTempPermissions(admin.permissions || []);
    };

    const togglePermission = (permission) => {
        setTempPermissions(prev => {
            if (prev.includes(permission)) {
                return prev.filter(p => p !== permission);
            } else {
                return [...prev, permission];
            }
        });
    };

    const handleSavePermissions = async () => {
        const result = await updateAdminPermissions(editingAdmin.id, tempPermissions);
        if (result.success) {
            setEditingAdmin(null);
            setTempPermissions([]);
        } else {
            alert(result.error);
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        const result = await deleteAdmin(adminId);
        if (result.success) {
            setShowDeleteModal(null);
        } else {
            alert(result.error);
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
            <Sidebar />

            <header className="app-header">
                <div className="app-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Link
                            to="/settings"
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="app-title">Administradores</h1>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                {allAdmins.length} registrados
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Info para Super Admin */}
                {isSuperAdmin() && (
                    <div className="badge badge-primary" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        padding: '12px',
                        justifyContent: 'center'
                    }}>
                        <Crown size={18} />
                        Eres Super Administrador - Tienes todos los permisos
                    </div>
                )}

                {/* Lista de Admins */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={18} />
                            Administradores
                        </h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {allAdmins.map(admin => (
                            <div
                                key={admin.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px',
                                    borderBottom: '1px solid var(--neutral-200)',
                                    gap: '12px'
                                }}
                            >
                                <div
                                    className="employee-avatar"
                                    style={{
                                        background: admin.role === 'superadmin' ? 'var(--warning)' : 'var(--primary)',
                                        flexShrink: 0
                                    }}
                                >
                                    {admin.role === 'superadmin' ? (
                                        <Crown size={18} />
                                    ) : (
                                        admin.name?.charAt(0) || 'A'
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {admin.name || 'Sin nombre'}
                                        {admin.role === 'superadmin' && (
                                            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                                                Super Admin
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted">{admin.email}</div>
                                    {admin.role !== 'superadmin' && (
                                        <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
                                            {admin.permissions?.length || 0} permisos
                                        </div>
                                    )}
                                </div>

                                {/* Acciones - Solo si NO es el admin actual y NO es superadmin */}
                                {admin.id !== adminData?.id && admin.role !== 'superadmin' && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleEditPermissions(admin)}
                                        >
                                            <ShieldCheck size={16} />
                                            Permisos
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm btn-icon"
                                            onClick={() => setShowDeleteModal(admin)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}

                                {admin.id === adminData?.id && (
                                    <span className="badge badge-success">Tú</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leyenda de permisos */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>Permisos disponibles</h3>
                    </div>
                    <div className="card-body" style={{
                        display: 'grid',
                        gap: '8px',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'
                    }}>
                        {Object.entries(PERMISSION_LABELS).map(([key, { label, desc }]) => (
                            <div key={key} style={{
                                padding: '8px 12px',
                                background: 'var(--neutral-50)',
                                borderRadius: '6px'
                            }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</div>
                                <div className="text-xs text-muted">{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
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
                <Link to="/reports" className="nav-item">
                    <FileText size={22} />
                    <span>Reportes</span>
                </Link>
                <Link to="/settings" className="nav-item active">
                    <Settings size={22} />
                    <span>Ajustes</span>
                </Link>
            </nav>

            {/* Edit Permissions Modal */}
            {editingAdmin && (
                <div className="modal-overlay" onClick={() => setEditingAdmin(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3>Permisos de {editingAdmin.name}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setEditingAdmin(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>
                                Selecciona los permisos para este administrador:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(PERMISSION_LABELS).map(([permission, { label, desc }]) => {
                                    const isChecked = tempPermissions.includes(permission);
                                    return (
                                        <div
                                            key={permission}
                                            onClick={() => togglePermission(permission)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: isChecked ? 'rgba(30, 58, 138, 0.1)' : 'var(--neutral-50)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: `2px solid ${isChecked ? 'var(--primary)' : 'transparent'}`,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                background: isChecked ? 'var(--primary)' : 'var(--neutral-200)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {isChecked && <Check size={16} color="white" />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{label}</div>
                                                <div className="text-xs text-muted">{desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingAdmin(null)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSavePermissions}>
                                <Check size={16} />
                                Guardar permisos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Eliminar administrador</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteModal(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>¿Estás seguro de eliminar a <strong>{showDeleteModal.name}</strong>?</p>
                            <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                                Esta persona ya no podrá acceder al sistema.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDeleteAdmin(showDeleteModal.id)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
