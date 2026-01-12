import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, getDocs, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, useTranslation } from '../context/LanguageContext';
import { migrateEmployeesTrainingPlan } from '../utils/migrateTrainingPlan';
import { importHistoricalTrainingPlanData } from '../utils/importHistoricalData';
import Sidebar from '../components/Sidebar';
import {
    ArrowLeft,
    Upload,
    UserPlus,
    Trash2,
    LogOut,
    Users,
    Bell,
    FileText,
    Settings,
    AlertTriangle,
    Moon,
    Sun,
    FolderCog,
    ChevronRight,
    Shield,
    Crown,
    RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { logout, createAdmin, adminData, isSuperAdmin, hasPermission } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const { t } = useTranslation();
    const fileInputRef = useRef(null);

    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminForm, setAdminForm] = useState({ email: '', password: '', name: '' });
    const [creatingAdmin, setCreatingAdmin] = useState(false);

    const [showClearModal, setShowClearModal] = useState(false);
    const [clearing, setClearing] = useState(false);

    const [migrating, setMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState(null);

    const [importingHistorical, setImportingHistorical] = useState(false);
    const [historicalImportResult, setHistoricalImportResult] = useState(null);

    const canManageAdmins = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_ADMINS);
    const canImportData = isSuperAdmin() || hasPermission(PERMISSIONS.IMPORT_DATA);
    const canManageCatalogs = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_CATALOGS);
    const canDeleteEmployees = isSuperAdmin() || hasPermission(PERMISSIONS.DELETE_EMPLOYEES);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error('El archivo debe contener un array de empleados');
            }

            const batch = writeBatch(db);
            let count = 0;

            for (const emp of data) {
                const id = `emp_${Date.now()}_${count}`;

                const employeeData = {
                    employeeNumber: emp.employeeNumber || emp.numeroEmpleado || '',
                    fullName: emp.fullName || emp.nombre || emp.nombreCompleto || '',
                    area: emp.area || '',
                    department: emp.department || emp.departamento || '',
                    shift: emp.shift || emp.turno || '',
                    startDate: emp.startDate || emp.fechaIngreso ?
                        Timestamp.fromDate(new Date(emp.startDate || emp.fechaIngreso)) : null,
                    contractEndDate: emp.contractEndDate || emp.fechaFinContrato ?
                        Timestamp.fromDate(new Date(emp.contractEndDate || emp.fechaFinContrato)) : null,
                    status: emp.status || emp.estado || 'active',
                    formRGREC048Delivered: emp.formRGREC048Delivered || emp.planFormacion || false,
                    evaluations: emp.evaluations || {
                        day30: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
                        day60: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
                        day75: { score: null, requiresFollowUp: false, notes: '', completedAt: null }
                    },
                    createdAt: Timestamp.now(),
                    importedAt: Timestamp.now()
                };

                batch.set(doc(db, 'employees', id), employeeData);
                count++;
            }

            await batch.commit();

            setImportResult({
                success: true,
                message: `Se importaron ${count} empleados correctamente`
            });
        } catch (error) {
            console.error('Error importing:', error);
            setImportResult({
                success: false,
                message: error.message || 'Error al importar el archivo'
            });
        }

        setImporting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setCreatingAdmin(true);

        const result = await createAdmin(adminForm.email, adminForm.password, adminForm.name);

        if (result.success) {
            setShowAdminModal(false);
            setAdminForm({ email: '', password: '', name: '' });
            alert('Administrador creado correctamente');
        } else {
            alert(result.error);
        }

        setCreatingAdmin(false);
    };

    const handleClearData = async () => {
        setClearing(true);

        try {
            const snapshot = await getDocs(collection(db, 'employees'));
            const batch = writeBatch(db);

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            setShowClearModal(false);
            alert('Todos los empleados han sido eliminados');
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Error al eliminar los datos');
        }

        setClearing(false);
    };

    const handleMigrateTrainingPlan = async () => {
        setMigrating(true);
        setMigrationResult(null);

        try {
            const result = await migrateEmployeesTrainingPlan();
            setMigrationResult({
                success: true,
                message: `Migración completada: ${result.updated} actualizados, ${result.skipped} omitidos, ${result.errors} errores`
            });
        } catch (error) {
            console.error('Error in migration:', error);
            setMigrationResult({
                success: false,
                message: 'Error al ejecutar la migración'
            });
        }

        setMigrating(false);
    };

    const handleImportHistoricalData = async () => {
        setImportingHistorical(true);
        setHistoricalImportResult(null);

        try {
            const result = await importHistoricalTrainingPlanData();
            setHistoricalImportResult({
                success: true,
                message: `Importación completada: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos, ${result.errors} errores`
            });
        } catch (error) {
            console.error('Error in historical import:', error);
            setHistoricalImportResult({
                success: false,
                message: 'Error al importar datos históricos'
            });
        }

        setImportingHistorical(false);
    };

    return (
        <div className="app-layout">
            <Sidebar />

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
                        <h1 className="app-title">{t('settings')}</h1>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Account Info */}
                <div className="card">
                    <div className="card-header">
                        <h3>{t('account')}</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div
                                className="employee-avatar"
                                style={{ background: isSuperAdmin() ? 'var(--warning)' : 'var(--primary)' }}
                            >
                                {isSuperAdmin() ? <Crown size={20} /> : (adminData?.name?.charAt(0) || 'A')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {adminData?.name || 'Administrador'}
                                    {isSuperAdmin() && (
                                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                                            {t('super_admin')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-muted">{adminData?.email}</div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Language */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌐 Idioma / Language
                        </h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`btn ${language === 'es' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>🇲🇽</span>
                                Español
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>🇺🇸</span>
                                English
                            </button>
                        </div>
                    </div>
                </div>
                {/* Catalogs - Solo si tiene permiso */}
                {canManageCatalogs && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderCog size={18} />
                                {t('catalogs')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <Link
                                to="/catalogs"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'var(--neutral-50)',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'inherit'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500 }}>{t('manage_catalogs')}</div>
                                    <div className="text-sm text-muted">{t('catalogs_desc')}</div>
                                </div>
                                <ChevronRight size={20} color="var(--neutral-400)" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Admin Management - Solo para Super Admin o con permiso */}
                {canManageAdmins && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={18} />
                                {t('administrators')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <Link
                                to="/admin-management"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'var(--neutral-50)',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    marginBottom: '12px'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500 }}>{t('manage_admins')}</div>
                                    <div className="text-sm text-muted">{t('admins_desc')}</div>
                                </div>
                                <ChevronRight size={20} color="var(--neutral-400)" />
                            </Link>

                            <button
                                className="btn btn-primary btn-full"
                                onClick={() => setShowAdminModal(true)}
                            >
                                <UserPlus size={18} />
                                {t('add_admin')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Import JSON - Solo si tiene permiso */}
                {canImportData && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Upload size={18} />
                                {t('import_data')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
                                {t('import_desc')}
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            <button
                                className="btn btn-secondary btn-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                            >
                                <Upload size={18} />
                                {importing ? t('importing') : t('select_json')}
                            </button>

                            {importResult && (
                                <div
                                    className={`badge ${importResult.success ? 'badge-success' : 'badge-danger'}`}
                                    style={{ marginTop: '12px', padding: '12px', display: 'block', textAlign: 'center' }}
                                >
                                    {importResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Migración Plan de Formación - Solo si tiene permiso */}
                {(isSuperAdmin() || canImportData) && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} />
                                Migrar Plan de Formación
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
                                Actualiza los empleados existentes para agregar el campo de Plan de Formación RG-REC-048 con fechas límite calculadas automáticamente.
                            </p>

                            <button
                                className="btn btn-secondary btn-full"
                                onClick={handleMigrateTrainingPlan}
                                disabled={migrating}
                            >
                                <RefreshCw size={18} />
                                {migrating ? 'Migrando...' : 'Ejecutar migración'}
                            </button>

                            {migrationResult && (
                                <div
                                    className={`badge ${migrationResult.success ? 'badge-success' : 'badge-danger'}`}
                                    style={{ marginTop: '12px', padding: '12px', display: 'block', textAlign: 'center' }}
                                >
                                    {migrationResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Importar Datos Históricos - Solo si tiene permiso */}
                {(isSuperAdmin() || canImportData) && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Upload size={18} />
                                Importar Datos Históricos
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
                                Importa los datos históricos de planes de formación desde datos.json. Actualiza empleados existentes y crea nuevos si no existen.
                            </p>

                            <button
                                className="btn btn-secondary btn-full"
                                onClick={handleImportHistoricalData}
                                disabled={importingHistorical}
                            >
                                <Upload size={18} />
                                {importingHistorical ? 'Importando...' : 'Importar datos históricos'}
                            </button>

                            {historicalImportResult && (
                                <div
                                    className={`badge ${historicalImportResult.success ? 'badge-success' : 'badge-danger'}`}
                                    style={{ marginTop: '12px', padding: '12px', display: 'block', textAlign: 'center' }}
                                >
                                    {historicalImportResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Danger Zone - Solo si tiene permiso */}
                {canDeleteEmployees && (
                    <div className="card" style={{ marginTop: '16px', borderColor: 'var(--danger)' }}>
                        <div className="card-header" style={{ background: 'rgba(220, 38, 38, 0.05)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                                <AlertTriangle size={18} />
                                {t('danger_zone')}
                            </h3>
                        </div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                className="btn btn-danger btn-full"
                                onClick={() => setShowClearModal(true)}
                            >
                                <Trash2 size={18} />
                                {t('delete_all_employees')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Logout button */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-body">
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={handleLogout}
                        >
                            <LogOut size={18} />
                            {t('logout')}
                        </button>
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

            {/* Add Admin Modal */}
            {showAdminModal && (
                <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nuevo administrador</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAdminModal(false)}>
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nombre *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Juan Pérez"
                                        value={adminForm.name}
                                        onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Correo electrónico *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="admin@empresa.com"
                                        value={adminForm.email}
                                        onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Mínimo 6 caracteres"
                                        value={adminForm.password}
                                        onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <p className="text-sm text-muted">
                                    El nuevo admin tendrá permisos básicos. Podrás configurar sus permisos después en "Gestionar administradores".
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAdminModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creatingAdmin}>
                                    {creatingAdmin ? 'Creando...' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Clear Data Modal */}
            {showClearModal && (
                <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Eliminar todos los datos</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowClearModal(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>¿Estás seguro de eliminar <strong>todos los empleados</strong>?</p>
                            <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                                Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowClearModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger" onClick={handleClearData} disabled={clearing}>
                                {clearing ? 'Eliminando...' : 'Eliminar todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
