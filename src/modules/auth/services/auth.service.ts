/**
 * Servicio de Autenticación para Administradores
 *
 * Maneja login con validación de grupo 'admin' de AWS Cognito
 */

import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

const isDev = import.meta.env.DEV;

export interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresEmailVerification?: boolean;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AdminSession {
  token: string;
  user: {
    sub: string;
    email: string;
    groups: string[];
  };
}

export class AuthService {
  /**
   * Iniciar sesión como administrador
   * Valida que el usuario pertenezca al grupo 'admin'
   */
  static async signInAdmin({ email, password }: SignInParams): Promise<AuthResult> {
    try {
      const { nextStep } = await signIn({
        username: email,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
        },
      });

      if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        return {
          success: false,
          error: 'Debes verificar tu email primero.',
          requiresEmailVerification: true,
        };
      }

      // Obtener sesión y validar grupo admin
      const session = await fetchAuthSession({ forceRefresh: true });

      if (!session.tokens?.idToken) {
        return {
          success: false,
          error: 'No se pudieron obtener los tokens de autenticación',
        };
      }

      // Usar el payload ya verificado por Amplify
      const token = session.tokens.idToken.toString();
      const payload = session.tokens.idToken.payload;
      const groups = (payload['cognito:groups'] as string[]) || [];

      // Validar que sea administrador
      if (!groups.includes('admin')) {
        await signOut();
        return {
          success: false,
          error: 'Acceso denegado. Solo administradores pueden acceder a este panel.',
        };
      }

      return {
        success: true,
        data: {
          token,
          user: {
            sub: payload.sub,
            email: payload.email,
            groups,
          },
        },
      };
    } catch (error: any) {
      if (isDev) console.error('❌ [Admin] Error al iniciar sesión:', error.name);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      if (isDev) console.error('❌ [Admin] Error al cerrar sesión:', error);
    }
  }

  /**
   * Obtener sesión actual
   */
  static async getCurrentSession(): Promise<AdminSession | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });

      if (!session.tokens?.idToken) {
        return null;
      }

      const token = session.tokens.idToken.toString();
      const payload = session.tokens.idToken.payload;

      return {
        token,
        user: {
          sub: payload.sub as string,
          email: payload.email as string,
          groups: (payload['cognito:groups'] as string[]) || [],
        },
      };
    } catch (error) {
      if (isDev) console.error('❌ [Admin] Error al obtener sesión:', error);
      return null;
    }
  }

  /**
   * Verificar si el usuario está autenticado como admin
   */
  static async isAuthenticatedAdmin(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      const session = await this.getCurrentSession();

      return !!(user && session && session.user.groups.includes('admin'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener token de autenticación
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convertir errores de Cognito a mensajes legibles
   */
  private static getErrorMessage(error: any): string {
    const errorCode = error.name || error.code;

    const errorMessages: Record<string, string> = {
      UserNotFoundException: 'Usuario no encontrado',
      NotAuthorizedException: 'Email o contraseña incorrectos',
      UserNotConfirmedException: 'Usuario no confirmado. Por favor verifica tu email.',
      InvalidParameterException: 'Parámetros inválidos',
      NetworkError: 'Error de conexión. Verifica tu internet.',
      TooManyRequestsException: 'Demasiados intentos. Intenta más tarde.',
    };

    return errorMessages[errorCode] || error.message || 'Error al iniciar sesión';
  }
}
