import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const AuthContext = createContext(null);

// Definición de permisos disponibles
export const PERMISSIONS = {
    // Módulo Contratos
    VIEW_EMPLOYEES: 'view_employees',
    EDIT_EMPLOYEES: 'edit_employees',
    DELETE_EMPLOYEES: 'delete_employees',
    VIEW_REPORTS: 'view_reports',
    EXPORT_REPORTS: 'export_reports',
    MANAGE_EVALUATIONS: 'manage_evaluations',
    RENEW_CONTRACTS: 'renew_contracts',
    MANAGE_CATALOGS: 'manage_catalogs',
    IMPORT_DATA: 'import_data',
    MANAGE_ADMINS: 'manage_admins',

    // Módulo Capacitación
    ACCESS_CAPACITACION: 'access_capacitacion',
    VIEW_CAPACITACION_EMPLOYEES: 'view_capacitacion_employees',
    EDIT_CAPACITACION_EMPLOYEES: 'edit_capacitacion_employees',
    MANAGE_CATEGORIES: 'manage_categories',
    MANAGE_EXAMS: 'manage_exams'
};

// Permisos por defecto para nuevos admins
const DEFAULT_PERMISSIONS = [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_EVALUATIONS
];

// Super Admin tiene todos los permisos
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allAdmins, setAllAdmins] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                if (adminDoc.exists()) {
                    setUser(user);
                    setAdminData({ id: adminDoc.id, ...adminDoc.data() });
                } else {
                    await signOut(auth);
                    setUser(null);
                    setAdminData(null);
                }
            } else {
                setUser(null);
                setAdminData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Cargar lista de admins para el super admin
    const loadAdmins = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'admins'));
            const admins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllAdmins(admins);
            return admins;
        } catch (error) {
            console.error('Error loading admins:', error);
            return [];
        }
    };

    const login = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const adminDoc = await getDoc(doc(db, 'admins', result.user.uid));

            if (!adminDoc.exists()) {
                await signOut(auth);
                throw new Error('No tienes permisos de administrador');
            }

            return { success: true };
        } catch (error) {
            let message = 'Error al iniciar sesión';

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'Email o contraseña incorrectos';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email inválido';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta más tarde';
            } else if (error.message) {
                message = error.message;
            }

            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const createAdmin = async (email, password, name, permissions = DEFAULT_PERMISSIONS) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc(doc(db, 'admins', result.user.uid), {
                email,
                name,
                role: 'admin', // admin normal
                permissions,
                createdAt: new Date(),
                createdBy: user?.uid || 'system'
            });

            return { success: true };
        } catch (error) {
            let message = 'Error al crear administrador';

            if (error.code === 'auth/email-already-in-use') {
                message = 'El email ya está en uso';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña debe tener al menos 6 caracteres';
            }

            return { success: false, error: message };
        }
    };

    // Actualizar permisos de un admin
    const updateAdminPermissions = async (adminId, permissions) => {
        try {
            await updateDoc(doc(db, 'admins', adminId), { permissions });
            setAllAdmins(prev => prev.map(a =>
                a.id === adminId ? { ...a, permissions } : a
            ));
            return { success: true };
        } catch (error) {
            console.error('Error updating permissions:', error);
            return { success: false, error: 'Error al actualizar permisos' };
        }
    };

    // Eliminar admin
    const deleteAdmin = async (adminId) => {
        try {
            await deleteDoc(doc(db, 'admins', adminId));
            setAllAdmins(prev => prev.filter(a => a.id !== adminId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting admin:', error);
            return { success: false, error: 'Error al eliminar administrador' };
        }
    };

    // Verificar si el usuario actual tiene un permiso específico
    const hasPermission = (permission) => {
        if (!adminData) return false;
        // Super Admin tiene todos los permisos
        if (adminData.role === 'superadmin') return true;
        // Verificar permisos normales
        return adminData.permissions?.includes(permission) || false;
    };

    // Verificar si es Super Admin
    const isSuperAdmin = () => {
        return adminData?.role === 'superadmin';
    };

    const value = {
        user,
        adminData,
        loading,
        login,
        logout,
        createAdmin,
        isAuthenticated: !!user,
        // Nuevas funciones de roles
        hasPermission,
        isSuperAdmin,
        loadAdmins,
        allAdmins,
        updateAdminPermissions,
        deleteAdmin,
        PERMISSIONS,
        ALL_PERMISSIONS
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}
