import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    Home,
    LogOut,
    Users,
    Layers,
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Save,
    Award,
    Settings,
    TrendingUp,
    Clock,
    BookOpen,
    Target,
    Upload
} from 'lucide-react';
import CapacitacionSidebar from '../components/CapacitacionSidebar';
import promotionRulesJson from '../data/promotionRules.json';

export default function PromotionRulesPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);

    // Formulario
    const [formData, setFormData] = useState({
        currentPosition: '',
        promotion: '',
        lastChange: 6,
        examGrade: 80,
        courseCoverage: 60,
        performanceRating: 80
    });

    // Cargar reglas desde Firestore
    useEffect(() => {
        const q = query(collection(db, 'rules_promotion'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Ordenar alfabéticamente por posición actual
            data.sort((a, b) => (a.currentPosition || '').localeCompare(b.currentPosition || ''));
            setRules(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Filtrar reglas
    const filteredRules = useMemo(() => {
        if (!searchQuery) return rules;
        const q = searchQuery.toLowerCase();
        return rules.filter(rule =>
            rule.currentPosition?.toLowerCase().includes(q) ||
            rule.promotion?.toLowerCase().includes(q)
        );
    }, [rules, searchQuery]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Abrir modal para nueva regla
    const handleAddRule = () => {
        setEditingRule(null);
        setFormData({
            currentPosition: '',
            promotion: '',
            lastChange: 6,
            examGrade: 80,
            courseCoverage: 60,
            performanceRating: 80
        });
        setShowModal(true);
    };

    // Abrir modal para editar
    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setFormData({
            currentPosition: rule.currentPosition || '',
            promotion: rule.promotion || '',
            lastChange: rule.lastChange || 6,
            examGrade: rule.examGrade || 80,
            courseCoverage: rule.courseCoverage || 60,
            performanceRating: rule.performanceRating || 80
        });
        setShowModal(true);
    };

    // Eliminar regla
    const handleDeleteRule = async (rule) => {
        if (!confirm(`¿Estás seguro de eliminar la regla para "${rule.currentPosition}"?`)) return;

        try {
            await deleteDoc(doc(db, 'rules_promotion', rule.id));
        } catch (error) {
            console.error('Error deleting rule:', error);
            alert('Error al eliminar la regla');
        }
    };

    // Guardar regla
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.currentPosition || !formData.promotion) {
            alert('Por favor completa los campos obligatorios');
            return;
        }

        setSaving(true);
        try {
            const ruleData = {
                currentPosition: formData.currentPosition.trim().toUpperCase(),
                promotion: formData.promotion.trim().toUpperCase(),
                lastChange: parseInt(formData.lastChange) || 6,
                examGrade: parseInt(formData.examGrade) || 80,
                courseCoverage: parseInt(formData.courseCoverage) || 60,
                performanceRating: parseInt(formData.performanceRating) || 80,
                updatedAt: Timestamp.now()
            };

            if (editingRule) {
                await updateDoc(doc(db, 'rules_promotion', editingRule.id), ruleData);
            } else {
                ruleData.createdAt = Timestamp.now();
                await addDoc(collection(db, 'rules_promotion'), ruleData);
            }

            setShowModal(false);
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Error al guardar la regla');
        } finally {
            setSaving(false);
        }
    };

    // Importar reglas desde el JSON
    const handleImportRules = async () => {
        if (rules.length > 0) {
            if (!confirm(`Ya existen ${rules.length} reglas. ¿Deseas agregar las ${promotionRulesJson.length} reglas del archivo JSON? (No se duplicarán las existentes)`)) {
                return;
            }
        } else {
            if (!confirm(`¿Importar ${promotionRulesJson.length} reglas de promoción a Firebase?`)) {
                return;
            }
        }

        setImporting(true);
        let imported = 0;
        let skipped = 0;

        try {
            // Crear set de posiciones existentes para evitar duplicados
            const existingPositions = new Set(rules.map(r => r.currentPosition?.toUpperCase()));

            for (const rule of promotionRulesJson) {
                const currentPosition = rule["current position"].trim().toUpperCase();

                // Saltar si ya existe
                if (existingPositions.has(currentPosition)) {
                    skipped++;
                    continue;
                }

                const ruleData = {
                    currentPosition: currentPosition,
                    promotion: rule.promotion.trim().toUpperCase(),
                    lastChange: parseInt(rule["last change"]) || 6,
                    examGrade: parseInt(rule["exam grade"]) || 80,
                    courseCoverage: parseInt(rule["course coverage"]) || 60,
                    performanceRating: parseInt(rule["performance rating"]) || 80,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };

                await addDoc(collection(db, 'rules_promotion'), ruleData);
                imported++;
            }

            alert(`Importación completada:\n- ${imported} reglas importadas\n- ${skipped} reglas omitidas (ya existían)`);
        } catch (error) {
            console.error('Error importing rules:', error);
            alert('Error al importar reglas: ' + error.message);
        } finally {
            setImporting(false);
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
                            <h1 className="capacitacion-title">Reglas de Promoción</h1>
                        </div>
                        <div className="capacitacion-header-right">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/')}
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
                <main className="capacitacion-main" style={{ display: 'block', padding: 'var(--spacing-lg)' }}>
                    {/* Stats */}
                    <div className="stats-premium">
                        <div className="stat-card-premium stat-primary">
                            <div className="stat-icon-premium primary">
                                <Settings size={24} />
                            </div>
                            <div className="stat-content-premium">
                                <div className="stat-value-premium">{rules.length}</div>
                                <div className="stat-label-premium">Reglas Configuradas</div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="search-container">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por puesto actual o promoción..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Section Header */}
                    <div className="section-header-premium">
                        <h2>
                            Reglas de Promoción
                            <span className="count-badge">{filteredRules.length}</span>
                        </h2>
                        <button className="filter-pill active" onClick={handleAddRule}>
                            <Plus size={14} />
                            Nueva Regla
                        </button>
                    </div>

                    {/* Rules Table */}
                    {filteredRules.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Settings size={32} />
                            </div>
                            <p>{searchQuery ? 'No se encontraron resultados' : 'No hay reglas configuradas'}</p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button className="btn btn-primary" onClick={handleAddRule}>
                                    <Plus size={16} />
                                    Crear Regla
                                </button>
                                {!searchQuery && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleImportRules}
                                        disabled={importing}
                                    >
                                        <Upload size={16} />
                                        {importing ? 'Importando...' : `Importar ${promotionRulesJson.length} Reglas`}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="employee-table-premium">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Puesto Actual</th>
                                            <th>Promoción</th>
                                            <th>Tiempo</th>
                                            <th>Examen</th>
                                            <th>Cursos</th>
                                            <th>Performance</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRules.map(rule => (
                                            <tr key={rule.id}>
                                                <td><strong>{rule.currentPosition}</strong></td>
                                                <td>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                                                        {rule.promotion}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge-premium idle">
                                                        <Clock size={12} />
                                                        {rule.lastChange} meses
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge-premium success">
                                                        {rule.examGrade}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge-premium warning">
                                                        {rule.courseCoverage}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge-premium primary">
                                                        {rule.performanceRating}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => handleEditRule(rule)}
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => handleDeleteRule(rule)}
                                                            title="Eliminar"
                                                            style={{ color: 'var(--danger)' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingRule ? 'Editar Regla' : 'Nueva Regla de Promoción'}</h3>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">
                                            <Target size={16} style={{ marginRight: '6px' }} />
                                            Puesto Actual *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.currentPosition}
                                            onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                                            placeholder="Ej: OPERADOR DE MÁQUINA C"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            <TrendingUp size={16} style={{ marginRight: '6px' }} />
                                            Promoción a *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.promotion}
                                            onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                                            placeholder="Ej: OPERADOR DE MÁQUINA B"
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Clock size={16} style={{ marginRight: '6px' }} />
                                                Tiempo Mínimo (meses)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                max="24"
                                                value={formData.lastChange}
                                                onChange={(e) => setFormData({ ...formData, lastChange: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Award size={16} style={{ marginRight: '6px' }} />
                                                Examen Mínimo (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                max="100"
                                                value={formData.examGrade}
                                                onChange={(e) => setFormData({ ...formData, examGrade: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <BookOpen size={16} style={{ marginRight: '6px' }} />
                                                Cobertura Cursos (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                max="100"
                                                value={formData.courseCoverage}
                                                onChange={(e) => setFormData({ ...formData, courseCoverage: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <TrendingUp size={16} style={{ marginRight: '6px' }} />
                                                Performance (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                max="100"
                                                value={formData.performanceRating}
                                                onChange={(e) => setFormData({ ...formData, performanceRating: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Guardando...' : (
                                            <>
                                                <Save size={16} />
                                                {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation */}
                <nav className="app-nav app-nav--capacitacion">
                    <button onClick={() => navigate('/capacitacion')} className="nav-item">
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
                    <button onClick={() => navigate('/capacitacion/examenes')} className="nav-item">
                        <Award size={22} />
                        <span>Exámenes</span>
                    </button>
                    <button className="nav-item active">
                        <Settings size={22} />
                        <span>Reglas</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
