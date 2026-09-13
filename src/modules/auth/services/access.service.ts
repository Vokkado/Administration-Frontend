/**
 * Servicio de acceso: usuario actual, roles y solicitudes de acceso (backend).
 */

import { apiService } from '../../../services/api.service';
import { AuthService } from './auth.service';
import type { AccessRequest, CurrentUser, EmailAccessStatus } from '../types';
import { PANEL_APP } from '../types';

type ApiResponse<T> = { success: boolean; data: T };

export class AccessService {
  static async getCurrentUser(): Promise<CurrentUser> {
    const response = await apiService.get<ApiResponse<CurrentUser>>('/users/me');
    const user = response.data;
    return { ...user, roles: Array.isArray(user.roles) ? user.roles : [] };
  }

  /** ¿El email ya tiene cuenta? ¿Es de Google/Apple? (público, con rate limit). */
  static async getEmailStatus(email: string): Promise<EmailAccessStatus> {
    const response = await apiService.post<ApiResponse<EmailAccessStatus>>(
      '/access-requests/email-status',
      { email },
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * Crea la fila en `users` para la identidad de Cognito recién verificada. Viaja con el ID token
   * porque el backend valida que el email coincida con el claim del token.
   */
  static async registerCurrentIdentity(email: string, name?: string): Promise<void> {
    const identity = await AuthService.getIdentity();
    const idToken = await AuthService.getIdToken();
    if (!identity || !idToken) {
      throw new Error('No hay una sesión activa para registrar el usuario.');
    }

    await apiService.post(
      '/users',
      {
        email,
        cognitoSub: identity.sub,
        name: name?.trim() || undefined,
        authProvider: 'credentials',
      },
      { headers: { Authorization: `Bearer ${idToken}` }, skipAuth: true }
    );
  }

  /** Acepta los Términos y la Política de Privacidad vigentes. */
  static async acceptCurrentLegal(): Promise<void> {
    await apiService.post('/legal/me/accept');
  }

  static async getMyAccessRequest(): Promise<AccessRequest | null> {
    const response = await apiService.get<ApiResponse<{ roles: string[]; requests: AccessRequest[] }>>(
      '/access-requests/me'
    );
    return response.data.requests.find((r) => r.app === PANEL_APP) ?? null;
  }

  static async createAccessRequest(message: string): Promise<AccessRequest> {
    const response = await apiService.post<ApiResponse<AccessRequest>>('/access-requests', {
      app: PANEL_APP,
      message: message.trim() || null,
    });
    return response.data;
  }

  static async getLegalDocument(docType: 'TERMS' | 'PRIVACY'): Promise<{ version: number; content: string }> {
    const response = await apiService.get<ApiResponse<{ version: number; content: string }>>(
      `/legal/${docType}/current`,
      { skipAuth: true }
    );
    return response.data;
  }
}
