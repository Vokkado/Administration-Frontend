/**
 * Qué puede hacer el usuario logueado, según sus roles de la DB.
 *
 * El backend manda igual: esto es solo para no mostrar acciones que van a terminar en un 403
 * (borrar registros maestros y procesos masivos son solo de admin).
 */

import { useAuthContext } from '../contexts/AuthContext';
import { CATALOG_ROLES, ROLES } from '../modules/auth/types';

export function useRoles() {
  const { user } = useAuthContext();
  const roles = user?.roles ?? [];

  return {
    roles,
    isAdmin: roles.includes(ROLES.ADMIN),
    /** Ve y edita el catálogo (admin o editor de catálogo). */
    canEditCatalog: roles.some((role) => CATALOG_ROLES.includes(role)),
  };
}
