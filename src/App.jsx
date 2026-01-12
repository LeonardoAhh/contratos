import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginPage from './pages/LoginPage';
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
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/employee/new"
                element={
                    <ProtectedRoute>
                        <EmployeeForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/employee/:id"
                element={
                    <ProtectedRoute>
                        <EmployeeDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/employee/:id/edit"
                element={
                    <ProtectedRoute>
                        <EmployeeForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <ReportsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/notifications"
                element={
                    <ProtectedRoute>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/catalogs"
                element={
                    <ProtectedRoute>
                        <CatalogsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin-management"
                element={
                    <ProtectedRoute>
                        <AdminManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/calendar"
                element={
                    <ProtectedRoute>
                        <CalendarPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/indicators"
                element={
                    <ProtectedRoute>
                        <IndicatorsPage />
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
