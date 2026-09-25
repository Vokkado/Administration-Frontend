/**
 * Accesos y roles
 *
 * Lista solo a quienes tienen algún rol (admin, editor de catálogo, nutricionista). Para darle un
 * rol a alguien más se busca en todo el padrón desde "Dar acceso a un usuario".
 */
import { useState } from 'react';
import { Button, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserFilters } from './components/UserFilters';
import { UserTable } from './components/UserTable';
import { UserRolesModal } from './components/UserRolesModal';
import { GrantRoleModal } from './components/GrantRoleModal';
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
    refresh,
  } = useUsers();
  const { user: currentUser } = useAuthContext();
  const [rolesUser, setRolesUser] = useState<User | null>(null);
  const [granting, setGranting] = useState(false);
  /** El usuario elegido en el buscador todavía no está en la tabla: al cerrar, se relee. */
  const [pickedFromSearch, setPickedFromSearch] = useState(false);

  const closeRolesModal = () => {
    setRolesUser(null);
    if (pickedFromSearch) {
      setPickedFromSearch(false);
      refresh();
    }
  };

  return (
    <AdminLayout title="Accesos y roles">
        <PageHeader
          title="Accesos y roles"
          description="Quiénes pueden entrar a las webs de Vokkado y con qué rol. Los usuarios sin rol no aparecen acá: usan la app y se buscan desde “Dar acceso”."
          count={total}
          countLabel="usuarios"
          countLabelSingular="usuario"
          actions={
            <Button variant="primary" onClick={() => setGranting(true)}>
              Dar acceso
            </Button>
          }
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
                Mostrando {users.length} de {total} usuario{total !== 1 ? 's' : ''} con rol
              </>
            )}
          </p>
        </div>

        <UserTable
          users={users}
          loading={loading}
          onManageRoles={setRolesUser}
          emptyMessage="Todavía no hay usuarios con rol"
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        {granting && <GrantRoleModal
          onClose={() => setGranting(false)}
          onPick={(user) => {
            setGranting(false);
            setPickedFromSearch(true);
            setRolesUser(user);
          }}
        />}

        <UserRolesModal
          user={rolesUser}
          currentUserId={currentUser?.id}
          onClose={closeRolesModal}
          onRolesChanged={updateUserRoles}
        />
    </AdminLayout>
  );
}
