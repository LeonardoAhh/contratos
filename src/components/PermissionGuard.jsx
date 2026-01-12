import { useState } from 'react';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
import { Lock } from 'lucide-react';

// Componente que envuelve botones y muestra tooltip si no tiene permiso
export function PermissionButton({
    permission,
    children,
    className = '',
    onClick,
    disabled = false,
    ...props
}) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const [showTooltip, setShowTooltip] = useState(false);

    const hasAccess = isSuperAdmin() || hasPermission(permission);

    if (hasAccess) {
        return (
            <button
                className={className}
                onClick={onClick}
                disabled={disabled}
                {...props}
            >
                {children}
            </button>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                className={`${className} permission-disabled`}
                onClick={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    position: 'relative'
                }}
                {...props}
            >
                <Lock size={14} style={{ marginRight: '4px' }} />
                {children}
            </button>
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--neutral-800)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    No tienes permiso para esta acción
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid var(--neutral-800)'
                    }} />
                </div>
            )}
        </div>
    );
}

// Componente que envuelve links y muestra mensaje si no tiene permiso
export function PermissionLink({
    permission,
    children,
    to,
    className = '',
    ...props
}) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const [showTooltip, setShowTooltip] = useState(false);

    const hasAccess = isSuperAdmin() || hasPermission(permission);

    if (hasAccess) {
        // Importar Link dinámicamente para evitar problemas
        const { Link } = require('react-router-dom');
        return (
            <Link to={to} className={className} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <span
                className={`${className} permission-disabled`}
                onClick={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center'
                }}
                {...props}
            >
                <Lock size={14} style={{ marginRight: '4px' }} />
                {children}
            </span>
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--neutral-800)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    No tienes permiso para esta acción
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid var(--neutral-800)'
                    }} />
                </div>
            )}
        </div>
    );
}

// Hook para verificar permisos
export function usePermissions() {
    const { hasPermission, isSuperAdmin } = useAuth();

    const can = (permission) => {
        return isSuperAdmin() || hasPermission(permission);
    };

    return {
        can,
        canViewEmployees: can(PERMISSIONS.VIEW_EMPLOYEES),
        canEditEmployees: can(PERMISSIONS.EDIT_EMPLOYEES),
        canDeleteEmployees: can(PERMISSIONS.DELETE_EMPLOYEES),
        canViewReports: can(PERMISSIONS.VIEW_REPORTS),
        canExportReports: can(PERMISSIONS.EXPORT_REPORTS),
        canManageEvaluations: can(PERMISSIONS.MANAGE_EVALUATIONS),
        canRenewContracts: can(PERMISSIONS.RENEW_CONTRACTS),
        canManageCatalogs: can(PERMISSIONS.MANAGE_CATALOGS),
        canImportData: can(PERMISSIONS.IMPORT_DATA),
        canManageAdmins: can(PERMISSIONS.MANAGE_ADMINS)
    };
}
