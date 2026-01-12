import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    // Siempre modo oscuro - sin opción de cambiar
    const isDark = true;

    useEffect(() => {
        // Aplicar tema oscuro al documento
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }, []);

    // toggleTheme ya no hace nada, pero lo mantenemos para evitar errores
    const toggleTheme = () => { };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme debe usarse dentro de ThemeProvider');
    }
    return context;
}
