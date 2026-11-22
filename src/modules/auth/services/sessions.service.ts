import { apiService } from '../../../services/api.service';
import { getSessionGeneration, getSessionId, setSessionId } from './sessionStore';

/** Sesión de un dispositivo, tal como la devuelve GET /api/sessions. */
export interface DeviceSession {
  id: string;
  client: 'APP' | 'ADMIN' | 'NUTRITIONIST';
  deviceName: string | null;
  platform: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
  isActiveNow: boolean;
}

const isDev = import.meta.env.DEV;

/** "Chrome en Windows", "Safari en macOS"… a partir del user agent (aproximado, solo para mostrar). */
export function describeBrowser(userAgent: string = navigator.userAgent): { deviceName: string; platform: string } {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
    ? 'Opera'
    : /Firefox\//.test(userAgent)
    ? 'Firefox'
    : /Chrome\//.test(userAgent)
    ? 'Chrome'
    : /Safari\//.test(userAgent)
    ? 'Safari'
    : 'Navegador';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Mac OS X|Macintosh/.test(userAgent)
    ? 'macOS'
    : /Linux/.test(userAgent)
    ? 'Linux'
    : 'otro sistema';
  return { deviceName: `${browser} en ${os}`, platform: os };
}

let registering: Promise<void> | null = null;

export class SessionsService {
  /** Registra este navegador como una sesión (una vez por login). Best-effort. */
  static ensureDeviceSession(): Promise<void> {
    if (getSessionId()) return Promise.resolve();
    if (!registering) {
      registering = (async () => {
        try {
          const { deviceName, platform } = describeBrowser();
          const generation = getSessionGeneration();
          const response = await apiService.post<{ data: { id: string } }>('/sessions', {
            client: 'ADMIN',
            deviceName,
            platform,
          });
          // Si mientras tanto se cerró sesión (o empezó otro login), este id ya no corresponde.
          if (response?.data?.id && getSessionGeneration() === generation) setSessionId(response.data.id);
        } catch (error) {
          if (isDev) console.warn('[Admin] No se pudo registrar la sesión del navegador:', error);
        } finally {
          registering = null;
        }
      })();
    }
    return registering;
  }

  static async list(): Promise<DeviceSession[]> {
    const response = await apiService.get<{ data: DeviceSession[] }>('/sessions');
    return response?.data ?? [];
  }

  /** Cierra una sesión. Devuelve true si era la de este navegador. */
  static async revoke(id: string): Promise<boolean> {
    const response = await apiService.delete<{ data: { revokedCurrent: boolean } }>(`/sessions/${id}`);
    return !!response?.data?.revokedCurrent;
  }

  /** Cierra la sesión en todos los dispositivos, incluido este. */
  static async revokeAll(): Promise<void> {
    await apiService.post('/sessions/revoke-all');
  }

  /** Cierre de sesión normal: marca la sesión de este navegador como cerrada. Best-effort. */
  static async logoutCurrent(): Promise<void> {
    if (!getSessionId()) return;
    try {
      await apiService.delete('/sessions/current', { timeout: 5000 });
    } catch {
      // Sin red: la sesión queda abierta en la lista hasta que el usuario la cierre.
    }
  }

  static clearLocal(): void {
    setSessionId(null);
  }
}
