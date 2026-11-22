/**
 * Servicio de API
 *
 * Cliente HTTP configurado con autenticación
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from '../modules/auth/services/auth.service';
import { getSessionId, setSessionId } from '../modules/auth/services/sessionStore';

const isDev = import.meta.env.DEV;

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * No adjuntar el token de la sesión (endpoints públicos o que mandan su propio
     * Authorization) y no cerrar sesión ante un 401.
     */
    skipAuth?: boolean;
  }
}

type AuthRetryConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

// Un solo refresh a la vez: si varios requests fallan juntos con 401 (ej. al volver a la pestaña
// después de un rato), se renueva el token UNA vez y todos reintentan con el nuevo.
let refreshInFlight: ReturnType<typeof AuthService.refreshAuthToken> | null = null;
function refreshAuthTokenOnce() {
  if (!refreshInFlight) {
    refreshInFlight = AuthService.refreshAuthToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function endSession() {
  await AuthService.signOut();
  window.location.href = '/login';
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token de autenticación
    this.client.interceptors.request.use(
      async (config) => {
        if (config.skipAuth) return config;
        try {
          const token = await AuthService.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // Sesión de este navegador ("Sesiones y dispositivos"): si se cierra desde otro lado,
            // el backend corta el acceso aunque el token no haya vencido.
            const sessionId = getSessionId();
            if (sessionId) config.headers['X-Session-Id'] = sessionId;
          }
        } catch (error) {
          if (isDev) console.error('❌ Error obteniendo token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config as AuthRetryConfig | undefined;

        // La sesión de este navegador se cerró desde "Sesiones y dispositivos" (o "cerrar en
        // todos"): renovar el token no sirve.
        if (error.response?.status === 401 && error.response.data?.error === 'SessionRevokedError') {
          setSessionId(null);
          await endSession();
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && original && !original.skipAuth) {
          // Solo cerrar sesión si es un endpoint protegido (no GET /restrictions)
          const isPublicEndpoint = original.url?.includes('/restrictions') && original.method === 'get';

          if (!isPublicEndpoint) {
            // Antes cerrábamos sesión ante cualquier 401. Pero también llega cuando el token
            // venció y todavía no se renovó, o el request salió sin token porque no había red para
            // renovarlo. Renovar y reintentar UNA vez; cerrar sesión solo si la sesión venció.
            if (!original._authRetried) {
              original._authRetried = true;
              const outcome = await refreshAuthTokenOnce();
              if (outcome.status === 'ok') {
                original.headers.Authorization = `Bearer ${outcome.token}`;
                return this.client(original);
              }
              if (outcome.status === 'expired') await endSession();
              // network: transitorio, no cerrar sesión.
            } else {
              // Rechazado incluso con un token recién renovado.
              await endSession();
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
