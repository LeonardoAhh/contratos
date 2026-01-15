import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (!result.success) {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="login-page-premium">
            {/* Hero Section */}
            <div className="login-hero-section">
                <div className="login-hero-content">
                    <div className="login-hero-logo">
                        <GraduationCap size={48} strokeWidth={1.5} />
                    </div>
                    <h1 className="login-hero-title">Capacitación</h1>
                    <p className="login-hero-subtitle">
                        Plataforma de gestión de capacitación y desarrollo del personal
                    </p>
                    <img
                        src="/login-hero.png"
                        alt="Capacitación"
                        className="login-hero-image"
                    />
                </div>
            </div>

            {/* Form Section */}
            <div className="login-form-section">
                <div className="login-form-container">
                    <div className="login-form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Ingresa tus credenciales para acceder</p>
                    </div>

                    <form className="login-form-premium" onSubmit={handleSubmit}>
                        {error && (
                            <div className="login-error-premium">{error}</div>
                        )}

                        <div className="login-input-group">
                            <label htmlFor="email">Correo electrónico</label>
                            <div className="login-input-wrapper">
                                <Mail size={18} className="login-input-icon" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="login-input-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="login-input-wrapper">
                                <Lock size={18} className="login-input-icon" />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span>Iniciando sesión...</span>
                            ) : (
                                <>
                                    <span>Entrar</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>© 2025 Capacitación. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
