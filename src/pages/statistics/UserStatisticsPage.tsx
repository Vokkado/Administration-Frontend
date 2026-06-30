/**
 * Página "Estadísticas de usuarios": ranking de contribuidores, paginado y buscable.
 */
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Pagination, PageHeader, SearchInput, NotificationBanner } from '../../components/ui';
import { UserLeaderboardTable } from './components/UserLeaderboardTable';
import { useUserLeaderboard } from './hooks/useUserLeaderboard';
import './Statistics.css';

export function UserStatisticsPage() {
  const userStats = useUserLeaderboard();

  return (
    <AdminLayout title="Estadísticas de usuarios">
      <PageHeader
        title="Estadísticas de usuarios"
        description="Ranking de contribuidores por puntos (productos aprobados + reportes/sugerencias válidos) y actividad."
        count={userStats.total}
        countLabel="usuarios"
        countLabelSingular="usuario"
      />

      {userStats.error && <NotificationBanner type="error" message={userStats.error} />}

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
