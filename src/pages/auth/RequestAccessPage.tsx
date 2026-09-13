/**
 * Solicitar acceso al panel
 *
 * Para quien todavía no tiene cuenta en Vokkado: crea la cuenta (Cognito + fila en `users`),
 * verifica el email y deja una solicitud de acceso pendiente. La cuenta NO da acceso al panel
 * hasta que un administrador apruebe la solicitud (la cuenta sí sirve para la app móvil).
 *
 * Quien ya tiene cuenta (de la app) inicia sesión y pide acceso desde /access.
 * Las cuentas de Google/Apple quedan fuera de alcance por ahora: se muestra un aviso.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { useAuthContext } from '../../contexts/AuthContext';
import { AuthService, validatePasswordRules } from '../../modules/auth/services/auth.service';
import { AccessService } from '../../modules/auth/services/access.service';
import { AuthLayout, AuthMessage } from './AuthLayout';
import { EmailVerificationStep } from './components/EmailVerificationStep';
import { LegalDocumentModal } from './components/LegalDocumentModal';
import { EXISTING_ACCOUNT_MESSAGE, EXISTING_COGNITO_ACCOUNT_MESSAGE, FEDERATED_ACCOUNT_MESSAGE } from './authMessages';
import { getApiMessage, getApiStatus } from '../../services/apiError';

type Step = 'form' | 'verify' | 'finishing';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 20;
const MESSAGE_MAX = 500;

export function RequestAccessPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuthContext();

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [warning, setWarning] = useState<{ text: string; showLogin: boolean; showForgot?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishingText, setFinishingText] = useState('');
  const [legalDoc, setLegalDoc] = useState<'TERMS' | 'PRIVACY' | null>(null);

  // Igual que el registro de la app móvil: solo trim. El username de Cognito se crea tal cual, así
  // la persona puede ingresar desde la app escribiendo el email como lo escribió acá.
  const normalizedEmail = email.trim();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = 'Ingresá tu nombre (mínimo 2 caracteres)';
    if (!EMAIL_REGEX.test(normalizedEmail)) errors.email = 'Email inválido';
    const passwordError = validatePasswordRules(password);
    if (passwordError) errors.password = passwordError;
    if (confirmPassword !== password) errors.confirmPassword = 'Las contraseñas no coinciden';
    if (!acceptedTerms) errors.terms = 'Tenés que aceptar los Términos y la Política de Privacidad';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning(null);
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. ¿El email ya tiene cuenta en Vokkado? (evita duplicar en Cognito una cuenta de Google)
      let emailStatus;
      try {
        emailStatus = await AccessService.getEmailStatus(normalizedEmail);
      } catch (err) {
        setError(getApiMessage(err, 'No se pudo verificar el email. Intentá de nuevo en un minuto.'));
        return;
      }

      if (emailStatus.exists) {
        setWarning(
          emailStatus.federated
            ? { text: FEDERATED_ACCOUNT_MESSAGE, showLogin: false }
            : { text: EXISTING_ACCOUNT_MESSAGE, showLogin: true }
        );
        return;
      }

      // 2. Crear la identidad en Cognito
      const signUpResult = await AuthService.signUp(normalizedEmail, password);
      if (signUpResult.success) {
        if (signUpResult.signUpComplete) {
          await finish(); // el pool la confirmó solo: no hay código
        } else {
          setStep('verify');
        }
        return;
      }

      if (signUpResult.errorCode === 'UsernameExistsException') {
        await handleExistingCognitoUser();
        return;
      }

      setError(signUpResult.error || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  /**
   * El email ya existe en Cognito pero no en `users` (registro abandonado, o fila borrada a mano).
   * Se prueba la contraseña ingresada para saber en qué estado está esa identidad:
   * - entra → ya estaba confirmada y la contraseña coincide: se completa el alta
   * - UserNotConfirmedException → nunca verificó el email: se reenvía el código
   * - otra respuesta → la contraseña no coincide: tiene que recuperarla
   */
  const handleExistingCognitoUser = async () => {
    const attempt = await AuthService.signIn({ email: normalizedEmail, password });

    if (attempt.success) {
      await finish();
      return;
    }

    if (attempt.requiresEmailVerification) {
      const resend = await AuthService.resendSignUpCode(normalizedEmail);
      if (resend.success) {
        setStep('verify');
      } else {
        setError(resend.error || 'No se pudo enviar el código de verificación');
      }
      return;
    }

    if (attempt.errorCode === 'NotAuthorizedException') {
      setWarning({ text: EXISTING_COGNITO_ACCOUNT_MESSAGE, showLogin: true, showForgot: true });
      return;
    }

    setError(attempt.error || 'No se pudo verificar la cuenta existente');
  };

  const finish = async () => {
    setStep('finishing');
    setError('');

    setFinishingText('Iniciando sesión...');
    const signInResult = await AuthService.signIn({ email: normalizedEmail, password });
    if (!signInResult.success) {
      setStep('form');
      setWarning(
        signInResult.errorCode === 'NotAuthorizedException'
          ? { text: EXISTING_COGNITO_ACCOUNT_MESSAGE, showLogin: true, showForgot: true }
          : {
              text: `Tu email quedó verificado, pero no pudimos iniciar sesión (${signInResult.error}). Ingresá desde el login para completar la solicitud.`,
              showLogin: true,
            }
      );
      return;
    }

    try {
      setFinishingText('Creando tu cuenta...');
      try {
        await AccessService.registerCurrentIdentity(normalizedEmail, name.trim().slice(0, NAME_MAX));
      } catch (err) {
        if (getApiStatus(err) !== 409) throw err; // 409: la fila ya existía
      }

      setFinishingText('Registrando la aceptación de los términos...');
      try {
        await AccessService.acceptCurrentLegal();
      } catch {
        // No bloquea la solicitud: la app vuelve a pedir la aceptación si hace falta.
      }

      setFinishingText('Enviando la solicitud...');
      try {
        await AccessService.createAccessRequest(message);
      } catch (err) {
        if (getApiStatus(err) !== 409) throw err; // 409: ya tenía una pendiente o ya tiene acceso
      }

      const next = await checkAuth();
      navigate(next === 'authorized' ? '/dashboard' : '/access', { replace: true });
    } catch (err) {
      // Hay sesión: desde /access puede reintentar la solicitud.
      await checkAuth();
      navigate('/access', {
        replace: true,
        state: { notice: getApiMessage(err, 'Tu cuenta se creó, pero no se pudo enviar la solicitud. Intentá de nuevo.') },
      });
    } finally {
      setPassword('');
      setConfirmPassword('');
    }
  };

  const stepsIndicator = (
    <div className="auth-steps" aria-hidden>
      <span className={`auth-step ${step === 'form' ? 'active' : 'done'}`}>1. Datos</span>
      <span className={`auth-step ${step === 'verify' ? 'active' : step === 'finishing' ? 'done' : ''}`}>2. Verificar email</span>
      <span className={`auth-step ${step === 'finishing' ? 'active' : ''}`}>3. Solicitud</span>
    </div>
  );

  if (step === 'verify') {
    return (
      <AuthLayout subtitle="Solicitar acceso al panel" wide>
        {stepsIndicator}
        <EmailVerificationStep
          email={normalizedEmail}
          onVerified={finish}
          onBack={() => setStep('form')}
          backLabel="Corregir datos"
        />
      </AuthLayout>
    );
  }

  if (step === 'finishing') {
    return (
      <AuthLayout subtitle="Solicitar acceso al panel" wide>
        {stepsIndicator}
        <LoadingSpinner message={finishingText || 'Procesando...'} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      subtitle="Solicitar acceso al panel"
      wide
      footer={
        <p>
          ¿Ya tenés cuenta en Vokkado?{' '}
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            Iniciá sesión
          </button>
        </p>
      }
    >
      {stepsIndicator}
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <AuthMessage type="info">
          Completá tus datos para crear tu cuenta y pedir acceso. Un administrador va a revisar la
          solicitud; hasta que la apruebe no vas a poder usar el panel.
        </AuthMessage>

        <Input
          type="text"
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          error={fieldErrors.name}
          fullWidth
        />

        <Input
          type="email"
          label="Email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          error={fieldErrors.email}
          fullWidth
        />

        <Input
          type={showPassword ? 'text' : 'password'}
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          error={fieldErrors.password}
          fullWidth
          icon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
            </button>
          }
        />
        {!fieldErrors.password && (
          <span className="auth-field-hint">
            Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.
          </span>
        )}

        <Input
          type={showPassword ? 'text' : 'password'}
          label="Repetir contraseña"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          fullWidth
        />

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="access-message">
            ¿Para qué necesitás acceso? <span className="auth-field-hint">(opcional)</span>
          </label>
          <textarea
            id="access-message"
            className="auth-textarea"
            placeholder="Ej: Soy parte del equipo de contenidos y voy a validar productos."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MESSAGE_MAX}
            rows={3}
          />
        </div>

        <div className="auth-field">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              Acepto los{' '}
              <button type="button" className="auth-link" onClick={() => setLegalDoc('TERMS')}>
                Términos y Condiciones
              </button>{' '}
              y la{' '}
              <button type="button" className="auth-link" onClick={() => setLegalDoc('PRIVACY')}>
                Política de Privacidad
              </button>{' '}
              de Vokkado.
            </span>
          </label>
          {fieldErrors.terms && <span className="input-error-message">{fieldErrors.terms}</span>}
        </div>

        {error && <AuthMessage type="error">{error}</AuthMessage>}
        {warning && (
          <AuthMessage type="warning">
            <p>{warning.text}</p>
            {(warning.showLogin || warning.showForgot) && (
              <p className="auth-links">
                {warning.showLogin ? (
                  <button type="button" className="auth-link" onClick={() => navigate('/login')}>
                    Ir a iniciar sesión
                  </button>
                ) : <span />}
                {warning.showForgot && (
                  <button type="button" className="auth-link" onClick={() => navigate('/forgot-password')}>
                    Recuperar contraseña
                  </button>
                )}
              </p>
            )}
          </AuthMessage>
        )}

        <Button type="submit" variant="primary" size="large" fullWidth loading={loading}>
          Solicitar acceso
        </Button>
      </form>

      <LegalDocumentModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </AuthLayout>
  );
}
