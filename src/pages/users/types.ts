/**
 * Tipos para gestión de usuarios
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
  authProvider?: string;
  /** Roles de la DB (user_roles). */
  roles: string[];
}

export interface Role {
  code: string;
  name: string;
  description: string | null;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo'
};

export interface UserFilters {
  search: string;
  active?: boolean | null;
  lastAccessFrom?: string;
  lastAccessTo?: string;
}
