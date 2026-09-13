/**
 * Helpers para leer errores de axios / Amplify sin `any`.
 */

import { isAxiosError } from 'axios';

/** Status HTTP de un error de axios (undefined si no hubo respuesta). */
export function getApiStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}

/** Campo `error` del body del backend (p.ej. 'AccountDeactivatedError'). */
export function getApiErrorName(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data as { error?: unknown } | undefined;
  return typeof data?.error === 'string' ? data.error : undefined;
}

/** Mensaje del backend, o el del error, o el fallback. */
export function getApiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string' && data.message) return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Nombre del error de Cognito/Amplify (p.ej. 'NotAuthorizedException'). */
export function getErrorName(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const { name, code } = err as { name?: unknown; code?: unknown };
    if (typeof name === 'string') return name;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
