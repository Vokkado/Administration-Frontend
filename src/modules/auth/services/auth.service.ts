/**
 * Servicio de Autenticación (Cognito vía Amplify)
 *
 * Solo maneja identidad: iniciar sesión, registrarse, verificar email, recuperar contraseña.
 * La autorización (quién puede entrar al panel) la decide el backend con los roles de la DB:
 * ver access.service.ts y useAuth.
 *
 * Fuera de alcance por ahora (docs/ROLES.md del backend): login con Google y con Apple.
 */

import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { getErrorName } from '../../../services/apiError';

const isDev = import.meta.env.DEV;

export interface AuthResult {
  success: boolean;
  error?: string;
  /** El usuario existe en Cognito pero todavía no verificó el email. */
  requiresEmailVerification?: boolean;
  /** Código de error de Cognito (para que la UI decida el siguiente paso). */
  errorCode?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface CognitoIdentity {
  sub: string;
  email: string;
}

/** Reglas de contraseña del User Pool (las mismas que valida la app móvil). */
export function validatePasswordRules(password: string): string | null {
  if (password.length < 8) return 'Debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un carácter especial (!@#$%^&*)';
  return null;
}

export class AuthService {
  /**
   * Iniciar sesión en Cognito. No valida roles: eso lo resuelve el backend (/users/me).
   */
  static async signIn({ email, password }: SignInParams): Promise<AuthResult> {
    try {
      // Limpiar una sesión previa (p.ej. de otra cuenta) antes de iniciar una nueva.
      await this.signOut();

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
          error: 'Tenés que verificar tu email antes de ingresar.',
          requiresEmailVerification: true,
        };
      }

      if (nextStep.signInStep !== 'DONE') {
        if (isDev) console.warn('[Admin] Paso de login no soportado:', nextStep.signInStep);
        await this.signOut();
        return {
          success: false,
          error: 'Tu cuenta requiere un paso adicional que el panel todavía no soporta. Contactá a un administrador.',
        };
      }

      const session = await fetchAuthSession({ forceRefresh: true });
      if (!session.tokens?.idToken) {
        return { success: false, error: 'No se pudieron obtener los tokens de autenticación' };
      }

      return { success: true };
    } catch (error) {
      if (isDev) console.error('[Admin] Error al iniciar sesión:', getErrorName(error));
      const errorCode = getErrorName(error);
      return {
        success: false,
        error: this.getErrorMessage(error),
        errorCode,
        requiresEmailVerification: errorCode === 'UserNotConfirmedException',
      };
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      if (isDev) console.error('[Admin] Error al cerrar sesión:', error);
    }
  }

  /**
   * Crea la identidad en Cognito. Normalmente queda sin verificar hasta confirmar el código;
   * `signUpComplete` indica que el pool la confirmó sola (no hay código que pedir).
   */
  static async signUp(email: string, password: string): Promise<AuthResult & { signUpComplete?: boolean }> {
    try {
      const { isSignUpComplete } = await signUp({
        username: email,
        password,
        // Mismos atributos que usa el registro de la app móvil.
        options: { userAttributes: { email, 'custom:name': email } },
      });
      return { success: true, signUpComplete: isSignUpComplete };
    } catch (error) {
      if (isDev) console.error('[Admin] Error en signUp:', getErrorName(error));
      return { success: false, error: this.getErrorMessage(error), errorCode: getErrorName(error) };
    }
  }

  static async confirmSignUp(email: string, code: string): Promise<AuthResult & { alreadyConfirmed?: boolean }> {
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() });
      return { success: true };
    } catch (error) {
      // Cognito responde NotAuthorizedException ("Current status is CONFIRMED") si la cuenta ya
      // estaba confirmada: no es un error de credenciales, se puede seguir con el login.
      const message = error instanceof Error ? error.message : '';
      if (getErrorName(error) === 'NotAuthorizedException' && /confirmed/i.test(message)) {
        return { success: true, alreadyConfirmed: true };
      }
      if (isDev) console.error('[Admin] Error en confirmSignUp:', getErrorName(error));
      return { success: false, error: this.getErrorMessage(error), errorCode: getErrorName(error) };
    }
  }

  static async resendSignUpCode(email: string): Promise<AuthResult> {
    try {
      await resendSignUpCode({ username: email });
      return { success: true };
    } catch (error) {
      if (isDev) console.error('[Admin] Error reenviando código:', getErrorName(error));
      return { success: false, error: this.getErrorMessage(error), errorCode: getErrorName(error) };
    }
  }

  static async requestPasswordReset(email: string): Promise<AuthResult> {
    try {
      await resetPassword({ username: email });
      return { success: true };
    } catch (error) {
      if (isDev) console.error('[Admin] Error en resetPassword:', getErrorName(error));
      return { success: false, error: this.getErrorMessage(error), errorCode: getErrorName(error) };
    }
  }

  static async confirmPasswordReset(email: string, code: string, newPassword: string): Promise<AuthResult> {
    try {
      await confirmResetPassword({ username: email, confirmationCode: code.trim(), newPassword });
      return { success: true };
    } catch (error) {
      if (isDev) console.error('[Admin] Error en confirmResetPassword:', getErrorName(error));
      return { success: false, error: this.getErrorMessage(error), errorCode: getErrorName(error) };
    }
  }

  /** sub + email de la sesión de Cognito actual (null si no hay sesión). */
  static async getIdentity(): Promise<CognitoIdentity | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      const payload = session.tokens?.idToken?.payload;
      if (!payload?.sub) return null;
      return { sub: payload.sub as string, email: (payload.email as string) || '' };
    } catch {
      return null;
    }
  }

  /** Token para autorizar la API. El backend lee los roles de la DB, no del token. */
  static async getAuthToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      return session.tokens?.accessToken?.toString() || session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  }

  /**
   * ID token: lo necesita el alta de la fila en `users` (POST /users), porque el backend
   * compara el email del body con el claim `email`, que el access token no trae.
   */
  static async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      return session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  }

  private static getErrorMessage(error: unknown): string {
    const errorCode = getErrorName(error) ?? '';

    const errorMessages: Record<string, string> = {
      UserNotFoundException: 'Email o contraseña incorrectos',
      NotAuthorizedException: 'Email o contraseña incorrectos',
      UserNotConfirmedException: 'Tenés que verificar tu email antes de ingresar.',
      UsernameExistsException: 'Ya existe una cuenta con este email.',
      CodeMismatchException: 'El código es incorrecto.',
      ExpiredCodeException: 'El código expiró. Pedí uno nuevo.',
      InvalidPasswordException: 'La contraseña no cumple los requisitos de seguridad.',
      InvalidParameterException: 'Datos inválidos. Revisá el email y la contraseña.',
      LimitExceededException: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
      TooManyRequestsException: 'Demasiados intentos. Intenta más tarde.',
      TooManyFailedAttemptsException: 'Demasiados intentos. Intenta más tarde.',
      NetworkError: 'Error de conexión. Verifica tu internet.',
    };

    return errorMessages[errorCode] || (error instanceof Error && error.message) || 'Ocurrió un error inesperado';
  }
}
