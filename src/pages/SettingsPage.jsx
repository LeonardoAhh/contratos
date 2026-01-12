import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, getDocs, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
    ChevronRight
} from 'lucide-react';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { logout, createAdmin, adminData } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const fileInputRef = useRef(null);

    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminForm, setAdminForm] = useState({ email: '', password: '', name: '' });
    const [creatingAdmin, setCreatingAdmin] = useState(false);

    const [showClearModal, setShowClearModal] = useState(false);
    const [clearing, setClearing] = useState(false);

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
                        <h1 className="app-title">Ajustes</h1>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Account Info */}
                <div className="card">
                    <div className="card-header">
                        <h3>Cuenta</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="employee-avatar" style={{ background: 'var(--primary)' }}>
                                {adminData?.name?.charAt(0) || 'A'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 500 }}>{adminData?.name || 'Administrador'}</div>
                                <div className="text-sm text-muted">{adminData?.email}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            Apariencia
                        </h3>
                    </div>
                    <div className="card-body">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 0'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500 }}>Modo oscuro</div>
                                <div className="text-sm text-muted">Reduce el brillo de la pantalla</div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="btn btn-secondary"
                                style={{
                                    width: '56px',
                                    height: '32px',
                                    padding: 0,
                                    borderRadius: '16px',
                                    position: 'relative',
                                    background: isDark ? 'var(--primary)' : 'var(--neutral-200)'
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        left: isDark ? '28px' : '4px',
                                        width: '24px',
                                        height: '24px',
                                        background: 'white',
                                        borderRadius: '50%',
                                        transition: 'left 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isDark ? <Moon size={14} color="var(--primary)" /> : <Sun size={14} color="var(--warning)" />}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Catalogs */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderCog size={18} />
                            Catálogos
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
                                <div style={{ fontWeight: 500 }}>Gestionar catálogos</div>
                                <div className="text-sm text-muted">Áreas, departamentos, puestos y criterios</div>
                            </div>
                            <ChevronRight size={20} color="var(--neutral-400)" />
                        </Link>
                    </div>
                </div>

                {/* Import JSON */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={18} />
                            Importar datos
                        </h3>
                    </div>
                    <div className="card-body">
                        <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
                            Carga un archivo JSON con los datos de los empleados
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
                            {importing ? 'Importando...' : 'Seleccionar archivo JSON'}
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

                {/* Admin Management */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserPlus size={18} />
                            Administradores
                        </h3>
                    </div>
                    <div className="card-body">
                        <button
                            className="btn btn-primary btn-full"
                            onClick={() => setShowAdminModal(true)}
                        >
                            <UserPlus size={18} />
                            Agregar administrador
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="card" style={{ marginTop: '16px', borderColor: 'var(--danger)' }}>
                    <div className="card-header" style={{ background: 'rgba(220, 38, 38, 0.05)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                            <AlertTriangle size={18} />
                            Zona de peligro
                        </h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            className="btn btn-danger btn-full"
                            onClick={() => setShowClearModal(true)}
                        >
                            <Trash2 size={18} />
                            Eliminar todos los empleados
                        </button>

                        <button
                            className="btn btn-secondary btn-full"
                            onClick={handleLogout}
                        >
                            <LogOut size={18} />
                            Cerrar sesión
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
