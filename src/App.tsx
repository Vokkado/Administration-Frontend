/**
 * App Principal - Panel de Administración Vokkado
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { CATALOG_ROLES, PANEL_ROLES } from './modules/auth/types';
import { LoginPage } from './pages/auth/LoginPage';
import { RequestAccessPage } from './pages/auth/RequestAccessPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AccessPage } from './pages/auth/AccessPage';

// Importar configuración de Amplify
import './config/amplify';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const RestrictionPage = lazy(() => import('./pages/restriction/RestrictionPage').then(m => ({ default: m.RestrictionPage })));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ValidationListPage = lazy(() => import('./pages/validation/ValidationListPage').then(m => ({ default: m.ValidationListPage })));
const ValidationWizardPage = lazy(() => import('./pages/validation/ValidationWizardPage').then(m => ({ default: m.ValidationWizardPage })));
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const IngredientsPage = lazy(() => import('./pages/ingredients/IngredientsPage').then(m => ({ default: m.IngredientsPage })));
const NutritionFactPage = lazy(() => import('./pages/nutrition_facts/NutritionFactPage').then(m => ({ default: m.NutritionFactPage })));
const UsersPage = lazy(() => import('./pages/users/UsersPage').then(m => ({ default: m.UsersPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ReportDetailPage = lazy(() => import('./pages/reports/ReportDetailPage').then(m => ({ default: m.ReportDetailPage })));
const FaqsPage = lazy(() => import('./pages/faqs/FaqsPage').then(m => ({ default: m.FaqsPage })));
const AllergensPage = lazy(() => import('./pages/allergens/AllergensPage').then(m => ({ default: m.AllergensPage })));
const CompaniesPage = lazy(() => import('./pages/companies/CompaniesPage').then(m => ({ default: m.CompaniesPage })));
const AttributesPage = lazy(() => import('./pages/attributes/AttributesPage').then(m => ({ default: m.AttributesPage })));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProductStatisticsPage = lazy(() => import('./pages/statistics/ProductStatisticsPage').then(m => ({ default: m.ProductStatisticsPage })));
const UserStatisticsPage = lazy(() => import('./pages/statistics/UserStatisticsPage').then(m => ({ default: m.UserStatisticsPage })));
const BadgesPage = lazy(() => import('./pages/statistics/BadgesPage').then(m => ({ default: m.BadgesPage })));
const LegalPage = lazy(() => import('./pages/legal/LegalPage').then(m => ({ default: m.LegalPage })));
const AccessRequestsPage = lazy(() => import('./pages/access-requests/AccessRequestsPage').then(m => ({ default: m.AccessRequestsPage })));
const ProfessionalVerificationsPage = lazy(() => import('./pages/professional-verifications/ProfessionalVerificationsPage').then(m => ({ default: m.ProfessionalVerificationsPage })));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={null}>
          <Routes>
            {/* Rutas públicas de autenticación */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/request-access" element={<RequestAccessPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Con sesión pero sin rol: estado de la solicitud de acceso */}
            <Route path="/access" element={<AccessPage />} />

            {/* Rutas Protegidas */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={PANEL_ROLES}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/restrictions"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <RestrictionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/validation"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <ValidationListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/validation/:id"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <ValidationWizardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ingredients"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <IngredientsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/nutrition-facts"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <NutritionFactPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UsersPage />
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
              path="/reports/:id"
              element={
                <ProtectedRoute>
                  <ReportDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/access-requests"
              element={
                <ProtectedRoute>
                  <AccessRequestsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/professional-verifications"
              element={
                <ProtectedRoute>
                  <ProfessionalVerificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/faqs"
              element={
                <ProtectedRoute>
                  <FaqsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/allergens"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <AllergensPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/companies"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attributes"
              element={
                <ProtectedRoute roles={CATALOG_ROLES}>
                  <AttributesPage />
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
              path="/statistics/products"
              element={
                <ProtectedRoute>
                  <ProductStatisticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/statistics/users"
              element={
                <ProtectedRoute>
                  <UserStatisticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/statistics/badges"
              element={
                <ProtectedRoute>
                  <BadgesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/legal"
              element={
                <ProtectedRoute>
                  <LegalPage />
                </ProtectedRoute>
              }
            />

            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
