/**
 * Muestra su contenido solo si el usuario tiene rol `admin`.
 *
 * Se usa para las acciones que el editor de catálogo NO puede hacer: borrar registros maestros y
 * disparar procesos masivos. Es solo presentación — el backend igual responde 403.
 */

import type { ReactNode } from 'react';
import { useRoles } from '../../hooks/useRoles';

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useRoles();
  if (!isAdmin) return null;
  return <>{children}</>;
}
