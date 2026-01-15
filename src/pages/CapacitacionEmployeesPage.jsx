import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    onSnapshot,
    doc,
    deleteDoc,
    addDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    Home,
    LogOut,
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    ChevronRight,
    ChevronLeft,
    Filter,
    Layers
} from 'lucide-react';
import CapacitacionSidebar from '../components/CapacitacionSidebar';

const ITEMS_PER_PAGE = 20;

export default function CapacitacionEmployeesPage() {
    const navigate = useNavigate();
    const { logout, adminData } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [sortBy, setSortBy] = useState('name'); // 'name', 'department', 'hireDate'
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        position: '',
        category: '',
        department: ''
    });

    // Cargar empleados en tiempo real
    useEffect(() => {
        const q = query(collection(db, 'employees_capacitacion'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const employeeData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(employeeData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Obtener departamentos únicos
    const departments = useMemo(() => {
        const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
        return depts.sort();
    }, [employees]);

    // Filtrar y ordenar empleados
    const filteredEmployees = useMemo(() => {
        let result = [...employees];

        // Búsqueda
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(emp =>
                emp.name?.toLowerCase().includes(query) ||
                emp.employeeId?.toString().includes(query) ||
                emp.position?.toLowerCase().includes(query)
            );
        }

        // Filtro por departamento
        if (filterDepartment) {
            result = result.filter(emp => emp.department === filterDepartment);
        }

        // Ordenar
        result.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'department') {
                return (a.department || '').localeCompare(b.department || '');
            } else if (sortBy === 'hireDate') {
                const dateA = a.hireDate?.toDate() || new Date(0);
                const dateB = b.hireDate?.toDate() || new Date(0);
                return dateB - dateA; // Más recientes primero
            }
            return 0;
        });

        return result;
    }, [employees, searchQuery, filterDepartment, sortBy]);

    // Paginación
    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredEmployees, currentPage]);

    // Reset página cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterDepartment, sortBy]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleBackToModules = () => {
        navigate('/');
    };

    // CRUD Operations
    const handleAddEmployee = () => {
        setEditingEmployee(null);
        setFormData({ name: '', position: '', category: '', department: '' });
        setShowModal(true);
    };

    const handleEditEmployee = (emp) => {
        setEditingEmployee(emp);
        setFormData({
            name: emp.name || '',
            position: emp.position || '',
            category: emp.category || '',
            department: emp.department || ''
        });
        setShowModal(true);
    };

    const handleDeleteEmployee = async (emp) => {
        if (window.confirm(`¿Estás seguro de eliminar a ${emp.name}?`)) {
            try {
                await deleteDoc(doc(db, 'employees_capacitacion', emp.id));
            } catch (error) {
                console.error('Error deleting employee:', error);
                alert('Error al eliminar empleado');
            }
        }
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        try {
            if (editingEmployee) {
                // Actualizar
                await updateDoc(doc(db, 'employees_capacitacion', editingEmployee.id), {
                    ...formData,
                    updatedAt: Timestamp.now()
                });
            } else {
                // Crear nuevo
                await addDoc(collection(db, 'employees_capacitacion'), {
                    ...formData,
                    employeeId: `NEW_${Date.now()}`,
                    status: 'active',
                    trainings: [],
                    certifications: [],
                    notes: '',
                    createdAt: Timestamp.now()
                });
            }
            setShowModal(false);
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Error al guardar empleado');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
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
                            <h1 className="capacitacion-title">Empleados</h1>
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
                <main className="capacitacion-main" style={{ display: 'block', padding: 'var(--spacing-lg)' }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por nombre, ID o puesto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Filters & Sort */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <button
                            className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={16} />
                            Filtros
                        </button>

                        <select
                            className="form-input form-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ width: 'auto', padding: '8px 32px 8px 12px', fontSize: '0.875rem' }}
                        >
                            <option value="name">Ordenar: A-Z</option>
                            <option value="department">Ordenar: Departamento</option>
                            <option value="hireDate">Ordenar: Fecha Ingreso</option>
                        </select>
                    </div>

                    {showFilters && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <div className="card-body">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Departamento</label>
                                    <select
                                        className="form-input form-select"
                                        value={filterDepartment}
                                        onChange={(e) => setFilterDepartment(e.target.value)}
                                    >
                                        <option value="">Todos los departamentos</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Employee List Header */}
                    <div className="section-title">
                        <span>Empleados ({filteredEmployees.length})</span>
                        <button className="btn btn-primary btn-sm" onClick={handleAddEmployee}>
                            <Plus size={16} />
                            Nuevo
                        </button>
                    </div>

                    {/* Employee Table */}
                    {filteredEmployees.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Users size={32} />
                            </div>
                            <p>{searchQuery ? 'No se encontraron resultados' : 'No hay empleados registrados'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Puesto</th>
                                            <th>Departamento</th>
                                            <th>Cat.</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedEmployees.map(emp => (
                                            <tr key={emp.id}>
                                                <td>{emp.employeeId}</td>
                                                <td>{emp.name}</td>
                                                <td>{emp.position}</td>
                                                <td>{emp.department}</td>
                                                <td>
                                                    <span className={`badge badge-${emp.category === 'A' ? 'primary' : emp.category === 'B' ? 'success' : 'warning'}`}>
                                                        {emp.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleEditEmployee(emp)}
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleDeleteEmployee(emp)}
                                                            title="Eliminar"
                                                            style={{ color: 'var(--danger)' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="pagination-controls">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                    Anterior
                                </button>
                                <span className="pagination-info">
                                    Página {currentPage} de {totalPages} ({filteredEmployees.length} empleados)
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Siguiente
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </main>

                {/* Modal para Crear/Editar */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitForm}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Nombre Completo *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Puesto</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.position}
                                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Departamento</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            list="departments-list"
                                        />
                                        <datalist id="departments-list">
                                            {departments.map(dept => (
                                                <option key={dept} value={dept} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Categoría</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                            <option value="D">D</option>
                                            <option value="E">E</option>
                                        </select>
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
                                    <button type="submit" className="btn btn-primary">
                                        {editingEmployee ? 'Guardar Cambios' : 'Crear Empleado'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation */}
                <nav className="app-nav">
                    <button onClick={() => navigate('/capacitacion')} className="nav-item">
                        <GraduationCap size={22} />
                        <span>Inicio</span>
                    </button>
                    <button className="nav-item active">
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
