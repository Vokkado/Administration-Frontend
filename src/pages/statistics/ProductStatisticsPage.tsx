/**
 * Página "Estadísticas de productos": cantidad de escaneos por producto, paginada y
 * buscable (mismo patrón que el resto del admin). Click en un producto abre el detalle
 * demográfico en un modal.
 */
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Pagination, PageHeader, SearchInput, NotificationBanner } from '../../components/ui';
import { ProductScanTable } from './components/ProductScanTable';
import { ProductStatsModal } from './components/ProductStatsModal';
import { useProductScanStats } from './hooks/useProductScanStats';
import { StatisticsService, type ProductScanStat } from '../../services/statistics.service';
import './Statistics.css';

export function ProductStatisticsPage() {
  const productStats = useProductScanStats();
  const [totalScans, setTotalScans] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductScanStat | null>(null);

  useEffect(() => {
    StatisticsService.getTotalScans().then(setTotalScans).catch(() => setTotalScans(null));
  }, []);

  return (
    <AdminLayout title="Estadísticas de productos">
      <PageHeader
        title="Estadísticas de productos"
        description="Cantidad de escaneos por producto. Hacé click en un producto para ver el detalle demográfico."
        count={productStats.total}
        countLabel="productos"
        countLabelSingular="producto"
      />

      {productStats.error && <NotificationBanner type="error" message={productStats.error} />}

      <div className="statistics-bignumber">
        <span className="statistics-bignumber-value">{totalScans ?? '—'}</span>
        <span className="statistics-bignumber-label">escaneos totales</span>
      </div>

      <SearchInput
        value={productStats.searchTerm}
        onChange={productStats.setSearchTerm}
        placeholder="Buscar por nombre, marca o código de barras..."
      />

      <ProductScanTable
        products={productStats.items}
        loading={productStats.loading}
        onSelect={setSelectedProduct}
      />

      <Pagination
        currentPage={productStats.currentPage}
        totalPages={productStats.totalPages}
        onPageChange={productStats.setCurrentPage}
      />

      <ProductStatsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </AdminLayout>
  );
}
