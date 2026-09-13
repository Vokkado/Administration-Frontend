/**
 * Componente de Tabla de Usuarios
 */
import type { User } from '../types';
import { Button, DataTable, StatusBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { ROLE_LABELS } from '../../../modules/auth/types';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onManageRoles: (user: User) => void;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRegistrationDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const columns: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'Nombre',
    render: (user) => user.name || 'Sin nombre',
  },
  {
    key: 'email',
    header: 'Correo Electrónico',
    render: (user) => user.email,
  },
  {
    key: 'active',
    header: 'Estado',
    render: (user) => (
      <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
        {user.active ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
  {
    key: 'roles',
    header: 'Roles',
    render: (user) =>
      user.roles.length > 0 ? (
        <div className="user-role-badges">
          {user.roles.map((role) => (
            <StatusBadge key={role} variant="info">{ROLE_LABELS[role] || role}</StatusBadge>
          ))}
        </div>
      ) : (
        <span className="text-muted">Usuario app</span>
      ),
  },
  {
    key: 'lastAccess',
    header: 'Último Acceso',
    hideOnMobile: true,
    render: (user) => (
      <span className={user.lastAccess ? '' : 'text-muted'}>
        {formatDate(user.lastAccess)}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Fecha de Registro',
    hideOnMobile: true,
    render: (user) => formatRegistrationDate(user.createdAt),
  },
];

export function UserTable({ users, loading, onManageRoles }: UserTableProps) {
  return (
    <DataTable<User>
      columns={columns}
      data={users}
      loading={loading}
      loadingMessage="Cargando usuarios..."
      emptyIcon="👤"
      emptyMessage="No se encontraron usuarios"
      keyExtractor={(user) => user.id}
      renderActions={(user) => (
        <Button size="small" variant="outline" onClick={() => onManageRoles(user)}>
          Roles
        </Button>
      )}
    />
  );
}
