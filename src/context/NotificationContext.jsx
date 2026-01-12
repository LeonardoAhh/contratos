import { useState, useEffect, createContext, useContext } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const [permission, setPermission] = useState('default');
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        // Verificar soporte
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setSupported(true);
            setPermission(Notification.permission);

            // Registrar Service Worker
            registerServiceWorker();
        }
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration);
        } catch (error) {
            console.error('Error registrando Service Worker:', error);
        }
    };

    const requestPermission = async () => {
        if (!supported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch (error) {
            console.error('Error solicitando permiso:', error);
            return false;
        }
    };

    const sendNotification = (title, options = {}) => {
        if (permission !== 'granted') return;

        const defaultOptions = {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            requireInteraction: false,
            ...options
        };

        // Si el Service Worker está activo, usar push
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                title,
                options: defaultOptions
            });
        } else {
            // Fallback a Notification API directa
            new Notification(title, defaultOptions);
        }
    };

    // Función para verificar alertas y enviar notificaciones
    const checkAlerts = (employees) => {
        if (permission !== 'granted') return;

        const today = new Date();

        employees.forEach(emp => {
            // Verificar contratos próximos a vencer
            if (emp.contractEndDate) {
                const endDate = emp.contractEndDate.toDate ? emp.contractEndDate.toDate() : new Date(emp.contractEndDate);
                const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntilEnd === 7) {
                    sendNotification('⚠️ Contrato por vencer', {
                        body: `${emp.fullName} - 7 días restantes`,
                        tag: `contract-${emp.id}`,
                        data: { employeeId: emp.id }
                    });
                }
            }

            // Verificar evaluaciones pendientes
            if (emp.startDate && emp.evaluations) {
                const startDate = emp.startDate.toDate ? emp.startDate.toDate() : new Date(emp.startDate);
                const daysSinceStart = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

                [30, 60, 75].forEach(day => {
                    const evalKey = `day${day}`;
                    if (!emp.evaluations[evalKey]?.score && daysSinceStart === day) {
                        sendNotification('📋 Evaluación pendiente', {
                            body: `${emp.fullName} - Evaluación ${day} días`,
                            tag: `eval-${emp.id}-${day}`,
                            data: { employeeId: emp.id }
                        });
                    }
                });
            }
        });
    };

    const value = {
        permission,
        supported,
        requestPermission,
        sendNotification,
        checkAlerts,
        isEnabled: permission === 'granted'
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications debe usarse dentro de NotificationProvider');
    }
    return context;
}
