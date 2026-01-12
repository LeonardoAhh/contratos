import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ArrowLeft, Save } from 'lucide-react';

export default function EmployeeForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        employeeNumber: '',
        fullName: '',
        area: '',
        department: '',
        shift: '',
        startDate: '',
        contractEndDate: '',
        status: 'active',
        formRGREC048Delivered: false,
        evaluations: {
            day30: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
            day60: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
            day75: { score: null, requiresFollowUp: false, notes: '', completedAt: null }
        }
    });

    useEffect(() => {
        if (isEditing) {
            loadEmployee();
        }
    }, [id]);

    const loadEmployee = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'employees', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    ...data,
                    startDate: data.startDate?.toDate ?
                        data.startDate.toDate().toISOString().split('T')[0] :
                        data.startDate || '',
                    contractEndDate: data.contractEndDate?.toDate ?
                        data.contractEndDate.toDate().toISOString().split('T')[0] :
                        data.contractEndDate || ''
                });
            }
        } catch (error) {
            console.error('Error loading employee:', error);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const employeeData = {
                ...formData,
                startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
                contractEndDate: formData.contractEndDate ? Timestamp.fromDate(new Date(formData.contractEndDate)) : null,
                updatedAt: Timestamp.now()
            };

            if (isEditing) {
                await updateDoc(doc(db, 'employees', id), employeeData);
            } else {
                const newId = `emp_${Date.now()}`;
                await setDoc(doc(db, 'employees', newId), {
                    ...employeeData,
                    createdAt: Timestamp.now()
                });
            }

            navigate('/');
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Error al guardar el empleado');
        }

        setSaving(false);
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
            <header className="app-header">
                <div className="app-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="app-title">
                            {isEditing ? 'Editar empleado' : 'Nuevo empleado'}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="app-main" style={{ paddingBottom: '100px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <div className="card-header">
                            <h3>Información personal</h3>
                        </div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="employeeNumber">
                                    Número de empleado *
                                </label>
                                <input
                                    id="employeeNumber"
                                    name="employeeNumber"
                                    type="text"
                                    className="form-input"
                                    placeholder="EMP001"
                                    value={formData.employeeNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="fullName">
                                    Nombre completo *
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    className="form-input"
                                    placeholder="Juan Pérez García"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="area">
                                    Área *
                                </label>
                                <input
                                    id="area"
                                    name="area"
                                    type="text"
                                    className="form-input"
                                    placeholder="Producción"
                                    value={formData.area}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="department">
                                    Departamento *
                                </label>
                                <input
                                    id="department"
                                    name="department"
                                    type="text"
                                    className="form-input"
                                    placeholder="Ensamble"
                                    value={formData.department}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="shift">
                                    Turno *
                                </label>
                                <select
                                    id="shift"
                                    name="shift"
                                    className="form-input form-select"
                                    value={formData.shift}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Seleccionar turno</option>
                                    <option value="Matutino">Matutino</option>
                                    <option value="Vespertino">Vespertino</option>
                                    <option value="Nocturno">Nocturno</option>
                                    <option value="Mixto">Mixto</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h3>Información del contrato</h3>
                        </div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="startDate">
                                    Fecha de ingreso *
                                </label>
                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="contractEndDate">
                                    Fecha fin de contrato *
                                </label>
                                <input
                                    id="contractEndDate"
                                    name="contractEndDate"
                                    type="date"
                                    className="form-input"
                                    value={formData.contractEndDate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="status">
                                    Estado
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    className="form-input form-select"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="active">Activo</option>
                                    <option value="indefinite">Indeterminado</option>
                                    <option value="terminated">Baja solicitada</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
                                <input
                                    id="formRGREC048Delivered"
                                    name="formRGREC048Delivered"
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={formData.formRGREC048Delivered}
                                    onChange={handleChange}
                                />
                                <label htmlFor="formRGREC048Delivered" style={{ cursor: 'pointer' }}>
                                    <span style={{ fontWeight: 500 }}>Plan de formación RG-REC-048</span>
                                    <br />
                                    <span className="text-sm text-muted">Entregado y archivado</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px',
                        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                        background: 'var(--surface)',
                        borderTop: '1px solid var(--neutral-200)',
                        zIndex: 50
                    }}>
                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear empleado'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
