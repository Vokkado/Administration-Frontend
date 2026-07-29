/**
 * Página "Estadísticas de productos": totales de toda la plataforma (filtrables por género,
 * edad y rango de fechas) + tabla de escaneos por producto, paginada y buscable. Click en un
 * producto abre el detalle demográfico en un modal, que respeta el mismo rango de fechas.
 */
import { useEffect, useState } from 'react';
import { IoCartOutline, IoCheckmarkDoneCircleOutline, IoPeopleOutline, IoScanOutline } from 'react-icons/io5';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Pagination, PageHeader, SearchInput, NotificationBanner, FilterButtonGroup, DateRangePicker, StatTile,
  type FilterOption, type DateRange,
} from '../../components/ui';
import { ProductScanTable } from './components/ProductScanTable';
import { ProductStatsModal } from './components/ProductStatsModal';
import { useProductScanStats } from './hooks/useProductScanStats';
import {
  StatisticsService, type ProductScanStat, type PlatformStats, type GenderFilter, type AgeBucketFilter,
} from '../../services/statistics.service';
import './Statistics.css';

const ALL = 'ALL';

const GENDER_OPTIONS: FilterOption[] = [
  { value: ALL, label: 'Todos' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'prefer-not-to-say', label: 'Prefiere no decirlo' },
];

const AGE_OPTIONS: FilterOption[] = [
  { value: ALL, label: 'Todas' },
  { value: '<18', label: 'Menos de 18' },
  { value: '18-24', label: '18 a 24' },
  { value: '25-34', label: '25 a 34' },
  { value: '35-44', label: '35 a 44' },
  { value: '45-54', label: '45 a 54' },
  { value: '55+', label: '55 o más' },
];

export function ProductStatisticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const productStats = useProductScanStats(dateRange);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [platformStatsError, setPlatformStatsError] = useState(false);
  const [gender, setGender] = useState<string>(ALL);
  const [ageBucket, setAgeBucket] = useState<string>(ALL);
  const [selectedProduct, setSelectedProduct] = useState<ProductScanStat | null>(null);

  useEffect(() => {
    let active = true;
    StatisticsService.getPlatformStats({
      gender: gender === ALL ? null : (gender as GenderFilter),
      ageBucket: ageBucket === ALL ? null : (ageBucket as AgeBucketFilter),
      dateRange,
    })
      .then((s) => { if (active) { setPlatformStats(s); setPlatformStatsError(false); } })
      .catch(() => { if (active) { setPlatformStats(null); setPlatformStatsError(true); } });
    return () => { active = false; };
  }, [gender, ageBucket, dateRange]);

  const cartRate = platformStats && platformStats.totalScans > 0
    ? `${Math.round((platformStats.addToCartCount / platformStats.totalScans) * 100)}%`
    : '—';

  return (
    <AdminLayout title="Estadísticas de productos">
      <PageHeader
        title="Estadísticas de productos"
        description="Totales de toda la plataforma y cantidad de escaneos por producto. Tocá “Ver detalle” para ver el desglose demográfico de un producto puntual."
        count={productStats.total}
        countLabel="productos"
        countLabelSingular="producto"
      />

      {productStats.error && <NotificationBanner type="error" message={productStats.error} />}
      {platformStatsError && <NotificationBanner type="error" message="No se pudieron cargar los totales de la plataforma." />}

      <div className="statistics-platform-toprow">
        <DateRangePicker label="Filtrar fecha:" value={dateRange} onChange={setDateRange} />
      </div>

      <div className="statistics-platform-filters">
        <FilterButtonGroup label="Género:" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        <FilterButtonGroup label="Edad:" options={AGE_OPTIONS} value={ageBucket} onChange={setAgeBucket} />
      </div>

      <div className="stat-tile-row">
        <StatTile icon={<IoScanOutline />} value={platformStats?.totalScans ?? 0} label="Escaneos totales" />
        <StatTile icon={<IoPeopleOutline />} value={platformStats?.distinctUsers ?? 0} label="Cantidad de usuarios que escanearon" />
        <StatTile icon={<IoCartOutline />} value={platformStats?.addToCartCount ?? 0} label="Movido al carrito" rate={cartRate} />
        <StatTile icon={<IoCheckmarkDoneCircleOutline />} value={platformStats?.completedCartCount ?? 0} label="Carritos completados" />
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

      <ProductStatsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} dateRange={dateRange} />
    </AdminLayout>
  );
}
