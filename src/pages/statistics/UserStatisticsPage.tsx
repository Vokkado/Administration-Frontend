/**
 * Página "Estadísticas de usuarios": totales de usuarios registrados (filtrables por fecha de
 * registro, género y edad) + ranking de contribuidores, paginado y buscable.
 */
import { useEffect, useState } from 'react';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPeopleOutline } from 'react-icons/io5';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Pagination, PageHeader, SearchInput, NotificationBanner, DateRangePicker, FilterButtonGroup, StatTile,
  type FilterOption, type DateRange,
} from '../../components/ui';
import { UserLeaderboardTable } from './components/UserLeaderboardTable';
import { useUserLeaderboard } from './hooks/useUserLeaderboard';
import { UserStatsService, type UserStats, type GenderFilter, type AgeBucketFilter } from '../../services/userStats.service';
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

export function UserStatisticsPage() {
  const userStats = useUserLeaderboard();

  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [gender, setGender] = useState<string>(ALL);
  const [ageBucket, setAgeBucket] = useState<string>(ALL);
  const [totals, setTotals] = useState<UserStats | null>(null);
  const [totalsError, setTotalsError] = useState(false);

  useEffect(() => {
    let active = true;
    UserStatsService.getUserStats({
      gender: gender === ALL ? null : (gender as GenderFilter),
      ageBucket: ageBucket === ALL ? null : (ageBucket as AgeBucketFilter),
      dateRange,
    })
      .then((s) => { if (active) { setTotals(s); setTotalsError(false); } })
      .catch(() => { if (active) { setTotals(null); setTotalsError(true); } });
    return () => { active = false; };
  }, [gender, ageBucket, dateRange]);

  return (
    <AdminLayout title="Estadísticas de usuarios">
      <PageHeader
        title="Estadísticas de usuarios"
        description="Totales de usuarios registrados y ranking de contribuidores por puntos (productos aprobados + reportes/sugerencias válidos) y actividad."
        count={userStats.total}
        countLabel="usuarios"
        countLabelSingular="usuario"
      />

      {userStats.error && <NotificationBanner type="error" message={userStats.error} />}
      {totalsError && <NotificationBanner type="error" message="No se pudieron cargar los totales de usuarios." />}

      <div className="statistics-platform-toprow">
        <DateRangePicker label="Filtrar fecha de registro:" value={dateRange} onChange={setDateRange} />
      </div>

      <div className="statistics-platform-filters">
        <FilterButtonGroup label="Género:" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        <FilterButtonGroup label="Edad:" options={AGE_OPTIONS} value={ageBucket} onChange={setAgeBucket} />
      </div>

      <div className="stat-tile-row statistics-user-stats-tiles">
        <StatTile icon={<IoPeopleOutline />} value={totals?.total ?? 0} label="Usuarios registrados" />
        <StatTile icon={<IoCheckmarkCircleOutline />} value={totals?.active ?? 0} label="Activos ahora" />
        <StatTile icon={<IoCloseCircleOutline />} value={totals?.inactive ?? 0} label="Inactivos" />
      </div>

      <SearchInput
        value={userStats.searchTerm}
        onChange={userStats.setSearchTerm}
        placeholder="Buscar por nombre o email..."
      />

      <UserLeaderboardTable users={userStats.items} loading={userStats.loading} />

      <Pagination
        currentPage={userStats.currentPage}
        totalPages={userStats.totalPages}
        onPageChange={userStats.setCurrentPage}
      />
    </AdminLayout>
  );
}
