/**
 * Página de Reportes (Admin)
 */

import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, Pagination, PageHeader } from '../../components/ui';
import { ReportFilters } from './components/ReportFilters';
import { ReportTable } from './components/ReportTable';
import { useReports } from './hooks/useReports';
import './ReportsPage.css';

export function ReportsPage() {
  const navigate = useNavigate();
  const {
    items,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    filters,
    handleFiltersChange,
    handlePageChange,
    retry,
  } = useReports();

  return (
    <AdminLayout title="Reportes">
        <PageHeader
          title="Reportes"
          description="Consulta y gestiona reportes de BUG, Producto faltante, Producto desactualizado y Análisis incorrecto."
          count={total}
          countLabel="reportes"
          countLabelSingular="reporte"
        />

        {error && (
          <div className="error-banner">
            ⚠️ {error}
            <div className="error-actions">
              <Button variant="outline" size="small" onClick={retry}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        <ReportFilters filters={filters} onFiltersChange={handleFiltersChange} />

        <div className="results-info">
          <p>
            {loading ? 'Cargando...' : <>Mostrando {items.length} de {total} reporte{total !== 1 ? 's' : ''}</>}
          </p>
        </div>

        <ReportTable items={items} loading={loading} onView={(id) => navigate(`/reports/${id}`)} />

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </AdminLayout>
  );
}
