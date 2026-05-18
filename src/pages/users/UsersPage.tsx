/**
 * Página de Gestión de Usuarios
 */
import { Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { UserFilters } from './components/UserFilters';
import { UserTable } from './components/UserTable';
import { useUsers } from './hooks/useUsers';
import './UsersPage.css';

export function UsersPage() {
  const {
    users,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    filters,
    handleFiltersChange,
    handlePageChange,
  } = useUsers();

  return (
    <AdminLayout title="Gestión de Usuarios">
        <PageHeader
          title="Usuarios Registrados"
          description="Consulta y administra los usuarios registrados en la plataforma. Los usuarios se consideran activos cuando tienen la aplicación abierta. El estado se actualiza automáticamente (con margen de 90 segundos para detección)."
          count={total}
          countLabel="usuarios"
          countLabelSingular="usuario"
        />

        {error && <NotificationBanner type="error" message={error} />}

        <UserFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        <div className="results-info">
          <p>
            {loading ? (
              'Cargando...'
            ) : (
              <>
                Mostrando {users.length} de {total} usuario{total !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>

        <UserTable users={users} loading={loading} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
    </AdminLayout>
  );
}
