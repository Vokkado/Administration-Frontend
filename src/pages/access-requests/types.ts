/**
 * Tipos para la gestión de solicitudes de acceso
 */

import type { AccessRequest, AccessRequestStatus } from '../../modules/auth/types';

export interface AccessRequestListItem extends AccessRequest {
  userEmail: string;
  userName: string | null;
  userAuthProvider: string;
  reviewedByEmail: string | null;
}

/** Rol de GET /admin/roles, con las webs cuyas solicitudes puede aprobar. */
export interface GrantableRole {
  code: string;
  name: string;
  description: string | null;
  grantableFor: string[];
}

export interface AccessRequestListResponse {
  items: AccessRequestListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type AccessRequestStatusFilter = AccessRequestStatus | 'ALL';

export interface AccessRequestFilters {
  status: AccessRequestStatusFilter;
  search: string;
}

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const ACCESS_APP_LABELS: Record<string, string> = {
  admin: 'Panel de administración',
  nutritionist: 'Web de nutricionistas',
};

export const AUTH_PROVIDER_LABELS: Record<string, string> = {
  credentials: 'Email',
  google: 'Google',
  apple: 'Apple',
};
