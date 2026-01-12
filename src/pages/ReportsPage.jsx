import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import { usePermissions } from '../components/PermissionGuard';
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
    const { canExportReports } = usePermissions();
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
            'First eval': emp.evaluations?.day30?.score ?? '-',
            'Second eval': emp.evaluations?.day60?.score ?? '-',
            'Third eval': emp.evaluations?.day75?.score ?? '-'
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
            doc.setFontSize(16);
            doc.setTextColor(30, 58, 138);
            doc.text('Reporte de Contratos - Nuevo Ingreso', 14, 15);

            // Fecha de generación
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 22);

            // Filtros aplicados
            const activeFilters = [];
            if (filters.area) activeFilters.push(`Área: ${filters.area}`);
            if (filters.department) activeFilters.push(`Depto: ${filters.department}`);
            if (filters.shift) activeFilters.push(`Turno: ${filters.shift}`);
            if (filters.status) activeFilters.push(`Estado: ${getStatusLabel(filters.status)}`);

            if (activeFilters.length > 0) {
                doc.text(`Filtros: ${activeFilters.join(', ')}`, 14, 28);
            }

            // Tabla con datos simplificados
            const tableData = filteredEmployees.map(emp => [
                emp.employeeNumber || '',
                (emp.fullName || '').substring(0, 25),
                (emp.area || '').substring(0, 15),
                (emp.department || '').substring(0, 12),
                (emp.shift || '').substring(0, 8),
                formatDate(emp.startDate),
                formatDate(emp.contractEndDate),
                getStatusLabel(emp.status).substring(0, 8),
                emp.formRGREC048Delivered ? 'Sí' : 'No',
                emp.evaluations?.day30?.score ?? '-',
                emp.evaluations?.day60?.score ?? '-',
                emp.evaluations?.day75?.score ?? '-'
            ]);

            autoTable(doc, {
                startY: activeFilters.length > 0 ? 34 : 28,
                head: [[
                    'No.Emp', 'Nombre', 'Área', 'Depto', 'Turno',
                    'Ingreso', 'Fin', 'Estado', 'RG',
                    'E1', 'E2', 'E3'
                ]],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 58, 138],
                    textColor: 255,
                    fontSize: 7,
                    fontStyle: 'bold',
                    halign: 'center',
                    cellPadding: 2
                },
                bodyStyles: {
                    fontSize: 6,
                    cellPadding: 1.5,
                    valign: 'middle'
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                styles: {
                    overflow: 'linebreak',
                    cellWidth: 'wrap'
                },
                columnStyles: {
                    0: { cellWidth: 14, halign: 'center' },
                    1: { cellWidth: 38 },
                    2: { cellWidth: 22 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 14, halign: 'center' },
                    5: { cellWidth: 18, halign: 'center' },
                    6: { cellWidth: 18, halign: 'center' },
                    7: { cellWidth: 14, halign: 'center' },
                    8: { cellWidth: 10, halign: 'center' },
                    9: { cellWidth: 10, halign: 'center' },
                    10: { cellWidth: 10, halign: 'center' },
                    11: { cellWidth: 10, halign: 'center' }
                },
                margin: { left: 8, right: 8 }
            });

            // Pie de página
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${pageCount} | Total: ${filteredEmployees.length} empleados`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }

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
                            onClick={canExportReports ? exportToExcel : () => alert('No tienes permiso para exportar reportes')}
                            disabled={generating || filteredEmployees.length === 0}
                            style={{ background: '#217346', opacity: canExportReports ? 1 : 0.5 }}
                        >
                            <FileSpreadsheet size={20} />
                            Descargar Excel
                        </button>

                        <button
                            className="btn btn-danger btn-full"
                            onClick={canExportReports ? exportToPDF : () => alert('No tienes permiso para exportar reportes')}
                            disabled={generating || filteredEmployees.length === 0}
                            style={!canExportReports ? { opacity: 0.5 } : {}}
                        >
                            <FilePDF size={20} />
                            Descargar PDF
                        </button>

                        {!canExportReports && (
                            <p className="text-sm text-muted text-center">
                                No tienes permiso para exportar reportes
                            </p>
                        )}
                    </div>
                </div>

                {/* Preview */}
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <h3>Vista previa</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ minWidth: '600px' }}>
                            <thead>
                                <tr>
                                    <th style={{ whiteSpace: 'nowrap' }}>No. Emp</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Nombre</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Área</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Depto</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Ingreso</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Estado</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>RG-048</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.slice(0, 8).map(emp => (
                                    <tr key={emp.id}>
                                        <td>{emp.employeeNumber}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{emp.fullName}</td>
                                        <td>{emp.area}</td>
                                        <td>{emp.department}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(emp.startDate)}</td>
                                        <td>
                                            <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'terminated' ? 'danger' : 'warning'}`}>
                                                {getStatusLabel(emp.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${emp.formRGREC048Delivered ? 'success' : 'warning'}`}>
                                                {emp.formRGREC048Delivered ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredEmployees.length > 8 && (
                        <div className="card-footer">
                            <p className="text-sm text-muted text-center">
                                Mostrando 8 de {filteredEmployees.length} registros
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
