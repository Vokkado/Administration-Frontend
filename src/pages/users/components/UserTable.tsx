/**
 * Componente de Tabla de Usuarios
 */
import type { User } from '../types';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';

interface UserTableProps {
  users: User[];
  loading: boolean;
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

export function UserTable({ users, loading }: UserTableProps) {
  return (
    <DataTable<User>
      columns={columns}
      data={users}
      loading={loading}
      loadingMessage="Cargando usuarios..."
      emptyIcon="👤"
      emptyMessage="No se encontraron usuarios"
      keyExtractor={(user) => user.id}
    />
  );
}
