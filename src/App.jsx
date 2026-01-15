import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginPage from './pages/LoginPage';
import ModuleSelectionPage from './pages/ModuleSelectionPage';
import Dashboard from './pages/Dashboard';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeForm from './components/EmployeeForm';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import CatalogsPage from './pages/CatalogsPage';
import AdminManagementPage from './pages/AdminManagementPage';
import CalendarPage from './pages/CalendarPage';
import IndicatorsPage from './pages/IndicatorsPage';
import CapacitacionDashboard from './pages/CapacitacionDashboard';
import CapacitacionEmployeesPage from './pages/CapacitacionEmployeesPage';
import CapacitacionCategoriasPage from './pages/CapacitacionCategoriasPage';
import ExamHistoryPage from './pages/ExamHistoryPage';
import PromotionRulesPage from './pages/PromotionRulesPage';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function PublicRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            {/* Selección de módulo */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <ModuleSelectionPage />
                    </ProtectedRoute>
                }
            />
            {/* Módulo de Contratos */}
            <Route
                path="/contratos"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/employee/new"
                element={
                    <ProtectedRoute>
                        <EmployeeForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/employee/:id"
                element={
                    <ProtectedRoute>
                        <EmployeeDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/employee/:id/edit"
                element={
                    <ProtectedRoute>
                        <EmployeeForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/reports"
                element={
                    <ProtectedRoute>
                        <ReportsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/notifications"
                element={
                    <ProtectedRoute>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/settings"
                element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/catalogs"
                element={
                    <ProtectedRoute>
                        <CatalogsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/admin-management"
                element={
                    <ProtectedRoute>
                        <AdminManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/calendar"
                element={
                    <ProtectedRoute>
                        <CalendarPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contratos/indicators"
                element={
                    <ProtectedRoute>
                        <IndicatorsPage />
                    </ProtectedRoute>
                }
            />
            {/* Módulo de Capacitación */}
            <Route
                path="/capacitacion"
                element={
                    <ProtectedRoute>
                        <CapacitacionDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/capacitacion/employees"
                element={
                    <ProtectedRoute>
                        <CapacitacionEmployeesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/capacitacion/categorias"
                element={
                    <ProtectedRoute>
                        <CapacitacionCategoriasPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/capacitacion/examenes"
                element={
                    <ProtectedRoute>
                        <ExamHistoryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/capacitacion/reglas"
                element={
                    <ProtectedRoute>
                        <PromotionRulesPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true }}>
            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <NotificationProvider>
                            <AppRoutes />
                        </NotificationProvider>
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
