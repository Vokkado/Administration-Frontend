/**
 * App Principal - Panel de Administración Vokkado
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';

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
const StatisticsPage = lazy(() => import('./pages/statistics/StatisticsPage').then(m => ({ default: m.StatisticsPage })));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={null}>
          <Routes>
            {/* Ruta de Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas Protegidas */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/restrictions"
              element={
                <ProtectedRoute>
                  <RestrictionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/validation"
              element={
                <ProtectedRoute>
                  <ValidationListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/validation/:id"
              element={
                <ProtectedRoute>
                  <ValidationWizardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ingredients"
              element={
                <ProtectedRoute>
                  <IngredientsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/nutrition-facts"
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <AllergensPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attributes"
              element={
                <ProtectedRoute>
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
              path="/statistics"
              element={
                <ProtectedRoute>
                  <StatisticsPage />
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
