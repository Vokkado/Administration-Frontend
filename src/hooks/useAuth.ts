/**
 * Hook de Autenticación
 *
 * Identidad: sesión de Cognito (Amplify).
 * Autorización: roles de la DB que devuelve GET /users/me. El panel ya no lee los grupos de
 * Cognito del token.
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthService, type AuthResult } from '../modules/auth/services/auth.service';
import { AccessService } from '../modules/auth/services/access.service';
import { PANEL_ROLES, type AuthStatus, type CurrentUser } from '../modules/auth/types';
import { getApiErrorName, getApiMessage, getApiStatus } from '../services/apiError';

const isDev = import.meta.env.DEV;

export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [statusError, setStatusError] = useState('');

  const resolveStatus = useCallback(async (): Promise<AuthStatus> => {
    setStatusError('');

    const identity = await AuthService.getIdentity();
    if (!identity) {
      setUser(null);
      setStatus('unauthenticated');
      return 'unauthenticated';
    }

    try {
      let current: CurrentUser;
      try {
        current = await AccessService.getCurrentUser();
      } catch (err) {
        // Identidad verificada en Cognito pero sin fila en `users` (p.ej. un registro que se
        // abandonó antes de terminar): se crea y se reintenta.
        if (getApiStatus(err) !== 404 || !identity.email) throw err;
        await AccessService.registerCurrentIdentity(identity.email);
        current = await AccessService.getCurrentUser();
      }

      setUser(current);
      const next: AuthStatus = current.roles.some((role) => PANEL_ROLES.includes(role))
        ? 'authorized'
        : 'no-access';
      setStatus(next);
      return next;
    } catch (err) {
      setUser(null);
      if (getApiStatus(err) === 403 && getApiErrorName(err) === 'AccountDeactivatedError') {
        setStatus('deactivated');
        return 'deactivated';
      }
      if (isDev) console.error('Error resolviendo la sesión:', err);
      setStatusError(getApiMessage(err, 'No se pudo verificar tu acceso. Intentá de nuevo.'));
      setStatus('error');
      return 'error';
    }
  }, []);

  useEffect(() => {
    resolveStatus();
  }, [resolveStatus]);

  const checkAuth = useCallback(async () => {
    setStatus('loading');
    return resolveStatus();
  }, [resolveStatus]);

  /** Inicia sesión en Cognito y resuelve los roles. `status` indica a dónde navegar. */
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult & { status?: AuthStatus }> => {
      const result = await AuthService.signIn({ email, password });
      if (!result.success) return result;
      const next = await resolveStatus();
      return { ...result, status: next };
    },
    [resolveStatus]
  );

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setUser(null);
    setStatusError('');
    setStatus('unauthenticated');
  }, []);

  return {
    user,
    status,
    statusError,
    loading: status === 'loading',
    isAuthenticated: status === 'authorized',
    hasSession: status !== 'loading' && status !== 'unauthenticated',
    signIn,
    signOut,
    checkAuth,
  };
}
