import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Verificar si el usuario es admin
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                if (adminDoc.exists()) {
                    setUser(user);
                    setAdminData(adminDoc.data());
                } else {
                    // No es admin, cerrar sesión
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

    const createAdmin = async (email, password, name) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc(doc(db, 'admins', result.user.uid), {
                email,
                name,
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

    const value = {
        user,
        adminData,
        loading,
        login,
        logout,
        createAdmin,
        isAuthenticated: !!user
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
