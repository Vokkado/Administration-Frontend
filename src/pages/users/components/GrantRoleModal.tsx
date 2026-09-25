/**
 * Buscador de usuarios para otorgar un rol.
 *
 * La pantalla lista solo a quienes ya tienen rol; acá se busca en todo el padrón (cualquier
 * cuenta de la app) y se elige a quién darle uno.
 *
 * Se monta solo mientras está abierto: al cerrarlo se desmonta y el estado arranca limpio.
 */

import { useEffect, useState } from 'react';
import { Button, Modal, SearchInput } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import { ROLE_LABELS } from '../../../modules/auth/types';
import type { User } from '../types';

interface GrantRoleModalProps {
  onClose: () => void;
  /** Se llama con el usuario elegido para abrir el modal de roles. */
  onPick: (user: User) => void;
}

const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 2;

export function GrantRoleModal({ onClose, onPick }: GrantRoleModalProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const term = search.trim();
  const tooShort = term.length < MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (tooShort) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      apiService
        .get<{ data: { users: User[] } }>(`/users?limit=10&search=${encodeURIComponent(term)}`)
        .then((response) => {
          if (cancelled) return;
          setResults((response.data.users || []).map((u) => ({ ...u, roles: Array.isArray(u.roles) ? u.roles : [] })));
        })
        .catch((err) => {
          if (!cancelled) setError(getApiMessage(err, 'No se pudo buscar usuarios'));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, tooShort]);

  return (
    <Modal show title="Dar acceso a un usuario" onClose={onClose} error={error}>
      <div className="grant-role-modal">
        <p className="grant-role-hint">
          Buscá por nombre o email entre todas las cuentas de Vokkado y elegí a quién darle un rol.
        </p>

        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />

        {/* El alto del área de resultados es fijo: el modal no salta al buscar. */}
        <ul className="grant-role-results">
          {loading && <li className="grant-role-empty">Buscando...</li>}

          {!loading && (results ?? []).map((user) => (
            <li key={user.id}>
              <button type="button" className="grant-role-result" onClick={() => onPick(user)}>
                <span className="grant-role-result-main">
                  <span className="grant-role-result-name">{user.name || 'Sin nombre'}</span>
                  <span className="grant-role-result-email">{user.email}</span>
                </span>
                <span className="grant-role-result-roles">
                  {user.roles.length > 0
                    ? user.roles.map((role) => ROLE_LABELS[role] || role).join(', ')
                    : 'Sin rol'}
                </span>
              </button>
            </li>
          ))}

          {!loading && tooShort && (
            <li className="grant-role-empty">Escribí al menos {MIN_SEARCH_LENGTH} caracteres para buscar</li>
          )}
          {!loading && !tooShort && results?.length === 0 && (
            <li className="grant-role-empty">No encontramos usuarios con ese nombre o email</li>
          )}
        </ul>

        <div className="grant-role-actions">
          <Button type="button" variant="outline" size="small" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
