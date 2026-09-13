/**
 * Modal para otorgar/quitar roles a un usuario. Cada cambio se guarda al instante
 * (PUT/DELETE /admin/users/:userId/roles/:role) y el backend lo audita.
 */

import { useEffect, useState } from 'react';
import { Button, LoadingSpinner, Modal } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import { ROLES } from '../../../modules/auth/types';
import type { Role, User } from '../types';

interface UserRolesModalProps {
  user: User | null;
  /** users.id del admin logueado (no puede quitarse su propio rol de admin). */
  currentUserId?: string;
  onClose: () => void;
  onRolesChanged: (userId: string, roles: string[]) => void;
}

export function UserRolesModal({ user, currentUserId, onClose, onRolesChanged }: UserRolesModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setUserRoles(user.roles);
    setError('');
    if (roles.length > 0) return;

    setLoadingRoles(true);
    apiService
      .get<{ data: Role[] }>('/admin/roles')
      .then((res) => setRoles(res.data || []))
      .catch((err) => setError(getApiMessage(err, 'No se pudieron cargar los roles')))
      .finally(() => setLoadingRoles(false));
  }, [user, roles.length]);

  const toggleRole = async (code: string, enabled: boolean) => {
    if (!user) return;
    setSavingRole(code);
    setError('');
    try {
      const url = `/admin/users/${user.id}/roles/${code}`;
      const res = enabled
        ? await apiService.put<{ data: { roles: string[] } }>(url)
        : await apiService.delete<{ data: { roles: string[] } }>(url);
      const updated = res.data?.roles ?? [];
      setUserRoles(updated);
      onRolesChanged(user.id, updated);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo actualizar el rol'));
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <Modal show={!!user} title="Roles del usuario" onClose={onClose} error={error}>
      <div className="user-roles-modal">
        <p className="user-roles-target">
          <strong>{user?.name || 'Sin nombre'}</strong>
          <span>{user?.email}</span>
        </p>
        <p className="user-roles-hint">
          Todos los usuarios pueden usar la app móvil. Los roles habilitan el acceso a las webs y se
          aplican en el próximo request del usuario.
        </p>

        {loadingRoles ? (
          <LoadingSpinner message="Cargando roles..." />
        ) : (
          <ul className="user-roles-list">
            {roles.map((role) => {
              const checked = userRoles.includes(role.code);
              const isSelfAdmin = role.code === ROLES.ADMIN && user?.id === currentUserId && checked;
              return (
                <li key={role.code}>
                  <label className={`user-role-option${checked ? ' checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={savingRole !== null || isSelfAdmin}
                      onChange={(e) => toggleRole(role.code, e.target.checked)}
                    />
                    <span className="user-role-text">
                      <span className="user-role-name">
                        {role.name}
                        {savingRole === role.code && <span className="user-role-saving"> · guardando...</span>}
                      </span>
                      {role.description && <span className="user-role-description">{role.description}</span>}
                      {isSelfAdmin && (
                        <span className="user-role-description">No podés quitarte tu propio rol de administrador.</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="user-roles-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
