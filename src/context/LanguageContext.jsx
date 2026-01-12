import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Hook para obtener traducciones
export function useTranslation() {
    const { language } = useLanguage();

    const t = (key) => {
        return translations[language]?.[key] || translations['es'][key] || key;
    };

    return { t, language };
}

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('language');
        return saved || 'es';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.setAttribute('data-language', language);
    }, [language]);

    const changeLanguage = (lang) => {
        setLanguage(lang);
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'es' ? 'en' : 'es');
    };

    const value = {
        language,
        setLanguage: changeLanguage,
        toggleLanguage,
        isSpanish: language === 'es',
        isEnglish: language === 'en'
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export default LanguageContext;
