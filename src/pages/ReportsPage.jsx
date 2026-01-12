import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ArrowLeft,
    FileSpreadsheet,
    FileText as FilePDF,
    Download,
    Users,
    Bell,
    FileText,
    Settings,
    Filter
} from 'lucide-react';

export default function ReportsPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        area: '',
        department: '',
        shift: '',
        status: ''
    });
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'employees'), orderBy('fullName'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEmployees(data);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const filteredEmployees = employees.filter(emp => {
        if (filters.area && emp.area !== filters.area) return false;
        if (filters.department && emp.department !== filters.department) return false;
        if (filters.shift && emp.shift !== filters.shift) return false;
        if (filters.status && emp.status !== filters.status) return false;
        return true;
    });

    const uniqueAreas = [...new Set(employees.map(e => e.area).filter(Boolean))];
    const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    const uniqueShifts = [...new Set(employees.map(e => e.shift).filter(Boolean))];

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-MX');
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return 'Activo';
            case 'indefinite': return 'Indeterminado';
            case 'terminated': return 'Baja';
            default: return status;
        }
    };

    const prepareData = () => {
        return filteredEmployees.map(emp => ({
            'No. Empleado': emp.employeeNumber,
            'Nombre': emp.fullName,
            'Área': emp.area,
            'Departamento': emp.department,
            'Turno': emp.shift,
            'Fecha Ingreso': formatDate(emp.startDate),
            'Fin Contrato': formatDate(emp.contractEndDate),
            'Estado': getStatusLabel(emp.status),
            'RG-REC-048': emp.formRGREC048Delivered ? 'Sí' : 'No',
            'Eval 30 días': emp.evaluations?.day30?.score ?? '-',
            'Eval 60 días': emp.evaluations?.day60?.score ?? '-',
            'Eval 75 días': emp.evaluations?.day75?.score ?? '-'
        }));
    };

    const exportToExcel = () => {
        setGenerating(true);

        try {
            const data = prepareData();
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Empleados');

            // Ajustar ancho de columnas
            ws['!cols'] = [
                { wch: 12 }, // No. Empleado
                { wch: 25 }, // Nombre
                { wch: 15 }, // Área
                { wch: 15 }, // Departamento
                { wch: 12 }, // Turno
                { wch: 12 }, // Fecha Ingreso
                { wch: 12 }, // Fin Contrato
                { wch: 12 }, // Estado
                { wch: 10 }, // RG-REC-048
                { wch: 10 }, // Eval 30
                { wch: 10 }, // Eval 60
                { wch: 10 }, // Eval 75
            ];

            const fileName = `reporte_contratos_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert('Error al generar el archivo Excel');
        }

        setGenerating(false);
    };

    const exportToPDF = () => {
        setGenerating(true);

        try {
            const doc = new jsPDF('l', 'mm', 'a4');

            // Título
            doc.setFontSize(18);
            doc.setTextColor(30, 58, 138);
            doc.text('Reporte de Contratos - Nuevo Ingreso', 14, 20);

            // Fecha de generación
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 28);

            // Filtros aplicados
            const activeFilters = [];
            if (filters.area) activeFilters.push(`Área: ${filters.area}`);
            if (filters.department) activeFilters.push(`Depto: ${filters.department}`);
            if (filters.shift) activeFilters.push(`Turno: ${filters.shift}`);
            if (filters.status) activeFilters.push(`Estado: ${getStatusLabel(filters.status)}`);

            if (activeFilters.length > 0) {
                doc.text(`Filtros: ${activeFilters.join(', ')}`, 14, 34);
            }

            // Tabla
            const tableData = filteredEmployees.map(emp => [
                emp.employeeNumber,
                emp.fullName,
                emp.area,
                emp.department,
                emp.shift,
                formatDate(emp.startDate),
                formatDate(emp.contractEndDate),
                getStatusLabel(emp.status),
                emp.formRGREC048Delivered ? 'Sí' : 'No',
                emp.evaluations?.day30?.score ?? '-',
                emp.evaluations?.day60?.score ?? '-',
                emp.evaluations?.day75?.score ?? '-'
            ]);

            autoTable(doc, {
                startY: activeFilters.length > 0 ? 40 : 34,
                head: [[
                    'No. Emp', 'Nombre', 'Área', 'Depto', 'Turno',
                    'Ingreso', 'Fin Contrato', 'Estado', 'RG-048',
                    'E30', 'E60', 'E75'
                ]],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 58, 138],
                    textColor: 255,
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 7
                },
                columnStyles: {
                    0: { cellWidth: 18 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 18 },
                    5: { cellWidth: 20 },
                    6: { cellWidth: 22 },
                    7: { cellWidth: 18 },
                    8: { cellWidth: 15 },
                    9: { cellWidth: 12 },
                    10: { cellWidth: 12 },
                    11: { cellWidth: 12 }
                }
            });

            const fileName = `reporte_contratos_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el archivo PDF');
        }

        setGenerating(false);
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
                            to="/"
                            className="btn btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="app-title">Reportes</h1>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Filters Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={18} />
                            Filtrar reporte
                        </h3>
                    </div>
                    <div className="card-body" style={{ display: 'grid', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">Área</label>
                            <select
                                className="form-input form-select"
                                value={filters.area}
                                onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                            >
                                <option value="">Todas</option>
                                {uniqueAreas.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Departamento</label>
                            <select
                                className="form-input form-select"
                                value={filters.department}
                                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            >
                                <option value="">Todos</option>
                                {uniqueDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Turno</label>
                            <select
                                className="form-input form-select"
                                value={filters.shift}
                                onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                            >
                                <option value="">Todos</option>
                                {uniqueShifts.map(shift => (
                                    <option key={shift} value={shift}>{shift}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select
                                className="form-input form-select"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">Todos</option>
                                <option value="active">Activo</option>
                                <option value="indefinite">Indeterminado</option>
                                <option value="terminated">Baja solicitada</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={18} />
                            Exportar ({filteredEmployees.length} registros)
                        </h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            className="btn btn-primary btn-full"
                            onClick={exportToExcel}
                            disabled={generating || filteredEmployees.length === 0}
                            style={{ background: '#217346' }}
                        >
                            <FileSpreadsheet size={20} />
                            Descargar Excel
                        </button>

                        <button
                            className="btn btn-danger btn-full"
                            onClick={exportToPDF}
                            disabled={generating || filteredEmployees.length === 0}
                        >
                            <FilePDF size={20} />
                            Descargar PDF
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>Vista previa</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No. Emp</th>
                                    <th>Nombre</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.slice(0, 5).map(emp => (
                                    <tr key={emp.id}>
                                        <td>{emp.employeeNumber}</td>
                                        <td>{emp.fullName}</td>
                                        <td>
                                            <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'terminated' ? 'danger' : 'warning'}`}>
                                                {getStatusLabel(emp.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredEmployees.length > 5 && (
                        <div className="card-footer">
                            <p className="text-sm text-muted text-center">
                                Mostrando 5 de {filteredEmployees.length} registros
                            </p>
                        </div>
                    )}
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
                <Link to="/reports" className="nav-item active">
                    <FileText size={22} />
                    <span>Reportes</span>
                </Link>
                <Link to="/settings" className="nav-item">
                    <Settings size={22} />
                    <span>Ajustes</span>
                </Link>
            </nav>
        </div>
    );
}
