import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Edit,
    Check,
    X,
    Building2,
    MapPin,
    Briefcase,
    ClipboardList,
    Users,
    Bell,
    FileText,
    Settings
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function CatalogsPage() {
    const [catalogs, setCatalogs] = useState({
        areas: [],
        departments: [],
        positions: [],
        evaluationCriteria: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('areas');
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        loadCatalogs();
    }, []);

    const loadCatalogs = async () => {
        try {
            const docRef = doc(db, 'config', 'catalogs');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setCatalogs(docSnap.data());
            } else {
                // Crear documento con valores por defecto
                const defaults = {
                    areas: ['Producción', 'Calidad', 'Logística', 'Mantenimiento', 'Administración'],
                    departments: ['Ensamble', 'Pintura', 'Inspección', 'Almacén', 'Recursos Humanos'],
                    positions: ['Operador de Máquina', 'Supervisor', 'Técnico', 'Analista', 'Coordinador'],
                    evaluationCriteria: [
                        { id: '1', name: 'Puntualidad', weight: 20 },
                        { id: '2', name: 'Calidad de trabajo', weight: 30 },
                        { id: '3', name: 'Trabajo en equipo', weight: 25 },
                        { id: '4', name: 'Iniciativa', weight: 25 }
                    ]
                };
                await setDoc(docRef, defaults);
                setCatalogs(defaults);
            }
        } catch (error) {
            console.error('Error loading catalogs:', error);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newItem.trim()) return;

        try {
            const docRef = doc(db, 'config', 'catalogs');

            if (activeTab === 'evaluationCriteria') {
                const newCriteria = {
                    id: Date.now().toString(),
                    name: newItem.trim(),
                    weight: 0
                };
                await updateDoc(docRef, {
                    evaluationCriteria: arrayUnion(newCriteria)
                });
                setCatalogs(prev => ({
                    ...prev,
                    evaluationCriteria: [...prev.evaluationCriteria, newCriteria]
                }));
            } else {
                await updateDoc(docRef, {
                    [activeTab]: arrayUnion(newItem.trim())
                });
                setCatalogs(prev => ({
                    ...prev,
                    [activeTab]: [...prev[activeTab], newItem.trim()]
                }));
            }

            setNewItem('');
            setShowAddForm(false);
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error al agregar el elemento');
        }
    };

    const handleDelete = async (item) => {
        if (!confirm('¿Eliminar este elemento?')) return;

        try {
            const docRef = doc(db, 'config', 'catalogs');

            if (activeTab === 'evaluationCriteria') {
                const updated = catalogs.evaluationCriteria.filter(c => c.id !== item.id);
                await updateDoc(docRef, { evaluationCriteria: updated });
                setCatalogs(prev => ({ ...prev, evaluationCriteria: updated }));
            } else {
                await updateDoc(docRef, {
                    [activeTab]: arrayRemove(item)
                });
                setCatalogs(prev => ({
                    ...prev,
                    [activeTab]: prev[activeTab].filter(i => i !== item)
                }));
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al eliminar el elemento');
        }
    };

    const handleEdit = async (oldValue, newValue) => {
        if (!newValue.trim() || oldValue === newValue.trim()) {
            setEditingItem(null);
            return;
        }

        try {
            const docRef = doc(db, 'config', 'catalogs');

            if (activeTab === 'evaluationCriteria') {
                const updated = catalogs.evaluationCriteria.map(c =>
                    c.id === oldValue.id ? { ...c, name: newValue.trim() } : c
                );
                await updateDoc(docRef, { evaluationCriteria: updated });
                setCatalogs(prev => ({ ...prev, evaluationCriteria: updated }));
            } else {
                const updated = catalogs[activeTab].map(i => i === oldValue ? newValue.trim() : i);
                await updateDoc(docRef, { [activeTab]: updated });
                setCatalogs(prev => ({ ...prev, [activeTab]: updated }));
            }

            setEditingItem(null);
        } catch (error) {
            console.error('Error editing item:', error);
            alert('Error al editar el elemento');
        }
    };

    const handleWeightChange = async (criteriaId, newWeight) => {
        try {
            const docRef = doc(db, 'config', 'catalogs');
            const updated = catalogs.evaluationCriteria.map(c =>
                c.id === criteriaId ? { ...c, weight: parseInt(newWeight) || 0 } : c
            );
            await updateDoc(docRef, { evaluationCriteria: updated });
            setCatalogs(prev => ({ ...prev, evaluationCriteria: updated }));
        } catch (error) {
            console.error('Error updating weight:', error);
        }
    };

    const tabs = [
        { id: 'areas', label: 'Áreas', icon: MapPin },
        { id: 'departments', label: 'Departamentos', icon: Building2 },
        { id: 'positions', label: 'Puestos', icon: Briefcase },
        { id: 'evaluationCriteria', label: 'Criterios', icon: ClipboardList }
    ];

    const getTabTitle = () => {
        switch (activeTab) {
            case 'areas': return 'Áreas';
            case 'departments': return 'Departamentos';
            case 'positions': return 'Puestos';
            case 'evaluationCriteria': return 'Criterios de Evaluación';
            default: return '';
        }
    };

    const currentItems = catalogs[activeTab] || [];
    const totalWeight = activeTab === 'evaluationCriteria'
        ? catalogs.evaluationCriteria.reduce((sum, c) => sum + (c.weight || 0), 0)
        : 0;

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
                        <h1 className="app-title">Catálogos</h1>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '16px' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setShowAddForm(false);
                                    setEditingItem(null);
                                }}
                            >
                                <Icon size={16} style={{ marginRight: '6px' }} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>{getTabTitle()} ({currentItems.length})</h3>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus size={16} />
                            Agregar
                        </button>
                    </div>

                    <div className="card-body">
                        {/* Weight indicator for criteria */}
                        {activeTab === 'evaluationCriteria' && (
                            <div
                                className={`badge ${totalWeight === 100 ? 'badge-success' : 'badge-warning'}`}
                                style={{ marginBottom: '16px', display: 'block', textAlign: 'center', padding: '12px' }}
                            >
                                Peso total: {totalWeight}% {totalWeight !== 100 && '(debe sumar 100%)'}
                            </div>
                        )}

                        {/* Add form */}
                        {showAddForm && (
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginBottom: '16px',
                                padding: '12px',
                                background: 'var(--neutral-50)',
                                borderRadius: '8px'
                            }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={`Nuevo ${getTabTitle().toLowerCase().slice(0, -1)}`}
                                    value={newItem}
                                    onChange={(e) => setNewItem(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                                    autoFocus
                                />
                                <button className="btn btn-primary btn-icon" onClick={handleAdd}>
                                    <Check size={18} />
                                </button>
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewItem('');
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Items list */}
                        {currentItems.length === 0 ? (
                            <div className="empty-state">
                                <p>No hay elementos</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {currentItems.map((item, index) => {
                                    const itemId = activeTab === 'evaluationCriteria' ? item.id : item;
                                    const itemName = activeTab === 'evaluationCriteria' ? item.name : item;
                                    const isEditing = editingItem === itemId;

                                    return (
                                        <div
                                            key={itemId}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: 'var(--neutral-50)',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        defaultValue={itemName}
                                                        autoFocus
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleEdit(item, e.target.value);
                                                            }
                                                        }}
                                                        onBlur={(e) => handleEdit(item, e.target.value)}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ flex: 1, fontWeight: 500 }}>{itemName}</span>

                                                    {activeTab === 'evaluationCriteria' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                style={{ width: '70px', padding: '6px 10px' }}
                                                                value={item.weight || 0}
                                                                onChange={(e) => handleWeightChange(item.id, e.target.value)}
                                                                min="0"
                                                                max="100"
                                                            />
                                                            <span className="text-muted">%</span>
                                                        </div>
                                                    )}

                                                    <button
                                                        className="btn btn-ghost btn-icon"
                                                        onClick={() => setEditingItem(itemId)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-icon"
                                                        onClick={() => handleDelete(item)}
                                                        style={{ color: 'var(--danger)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
        </div>
    );
}
