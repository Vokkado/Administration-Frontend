/**
 * Tipos de autorización por roles (los roles viven en la DB del backend).
 */

export const ROLES = {
  ADMIN: 'admin',
  NUTRITIONIST: 'nutritionist',
  ADMIN_NUTRITIONIST: 'admin_nutritionist',
} as const;

export type RoleCode = typeof ROLES[keyof typeof ROLES];

/** Etiquetas de respaldo (la fuente de verdad es GET /admin/roles). */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  nutritionist: 'Nutricionista',
  admin_nutritionist: 'Editor de catálogo',
};

/** Roles que habilitan este panel (cada ruta después exige los suyos). */
export const PANEL_ROLES: string[] = [ROLES.ADMIN, ROLES.ADMIN_NUTRITIONIST];

/**
 * Ver y editar el catálogo: productos, ingredientes, variantes, alérgenos, categorías, empresas,
 * atributos, valores nutricionales, restricciones y la cola de validación.
 */
export const CATALOG_ROLES: string[] = [ROLES.ADMIN, ROLES.ADMIN_NUTRITIONIST];

/** Administración de la plataforma: usuarios y roles, reportes, FAQs, legales, estadísticas. */
export const ADMIN_ONLY_ROLES: string[] = [ROLES.ADMIN];

/** Web que se pide en access_requests.app desde este panel. */
export const PANEL_APP = 'admin' as const;

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  authProvider: string;
  roles: string[];
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequest {
  id: string;
  userId: string;
  app: 'admin' | 'nutritionist';
  message: string | null;
  status: AccessRequestStatus;
  grantedRole: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAccessStatus {
  exists: boolean;
  /** La cuenta existe pero es de Google/Apple. */
  federated: boolean;
}

/**
 * - loading: resolviendo la sesión
 * - unauthenticated: sin sesión de Cognito
 * - no-access: sesión válida pero sin rol para el panel
 * - deactivated: la cuenta está desactivada (se reactiva desde la app)
 * - error: no se pudo consultar al backend
 * - authorized: puede usar el panel
 */
export type AuthStatus = 'loading' | 'unauthenticated' | 'no-access' | 'deactivated' | 'error' | 'authorized';
