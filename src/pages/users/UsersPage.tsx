/**
 * Página de Gestión de Usuarios
 */
import { useState } from 'react';
import { Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserFilters } from './components/UserFilters';
import { UserTable } from './components/UserTable';
import { UserRolesModal } from './components/UserRolesModal';
import { useUsers } from './hooks/useUsers';
import type { User } from './types';
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
    updateUserRoles,
  } = useUsers();
  const { user: currentUser } = useAuthContext();
  const [rolesUser, setRolesUser] = useState<User | null>(null);

  return (
    <AdminLayout title="Gestión de Usuarios">
        <PageHeader
          title="Usuarios Registrados"
          description="Consulta y administra los usuarios registrados en la plataforma. Los usuarios se consideran activos cuando tienen la aplicación abierta. El estado se actualiza automáticamente (con margen de 90 segundos para detección). Desde “Roles” podés dar o quitar acceso a las webs."
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

        <UserTable users={users} loading={loading} onManageRoles={setRolesUser} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <UserRolesModal
          user={rolesUser}
          currentUserId={currentUser?.id}
          onClose={() => setRolesUser(null)}
          onRolesChanged={updateUserRoles}
        />
    </AdminLayout>
  );
}
