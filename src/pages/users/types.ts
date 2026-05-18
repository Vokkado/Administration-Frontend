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
