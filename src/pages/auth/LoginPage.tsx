/**
 * Página de Login del panel
 *
 * Cualquier usuario de Vokkado con email y contraseña puede iniciar sesión; si no tiene rol para
 * el panel, se lo lleva a /access para ver o crear su solicitud de acceso.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import { AccessService } from '../../modules/auth/services/access.service';
import { AuthLayout, AuthMessage } from './AuthLayout';
import { EmailVerificationStep } from './components/EmailVerificationStep';
import { FEDERATED_ACCOUNT_MESSAGE } from './authMessages';
import { getApiMessage } from '../../services/apiError';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { signIn, status } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: Location; notice?: string } | null;
  const from = navState?.from;
  const notice = navState?.notice;
  const fromPath = from ? `${from.pathname}${from.search ?? ''}` : '/dashboard';

  // Sesión ya resuelta (p.ej. recargó /login estando logueado).
  useEffect(() => {
    if (loading || verifying) return;
    if (status === 'authorized') navigate(fromPath, { replace: true });
    else if (status === 'no-access' || status === 'deactivated' || status === 'error') navigate('/access', { replace: true });
  }, [status, loading, verifying, navigate, fromPath]);

  const goAfterLogin = (next?: string) => {
    navigate(next === 'authorized' ? fromPath : '/access', { replace: true });
  };

  const doSignIn = async () => {
    const result = await signIn(email.trim(), password);

    if (result.success) {
      goAfterLogin(result.status);
      return;
    }

    if (result.requiresEmailVerification) {
      setVerifying(true);
      return;
    }

    // Credenciales incorrectas: si la cuenta es de Google/Apple, avisar en vez del error genérico.
    if (result.errorCode === 'NotAuthorizedException' || result.errorCode === 'UserNotFoundException') {
      try {
        const emailStatus = await AccessService.getEmailStatus(email.trim());
        if (emailStatus.exists && emailStatus.federated) {
          setWarning(FEDERATED_ACCOUNT_MESSAGE);
          return;
        }
      } catch {
        // Si falla el chequeo (rate limit, red), queda el mensaje genérico.
      }
    }

    setError(result.error || 'Error al iniciar sesión');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setLoading(true);
    try {
      await doSignIn();
    } catch (err) {
      setError(getApiMessage(err, 'Error inesperado'));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout subtitle="Verificá tu email">
        <EmailVerificationStep
          email={email.trim()}
          sendCodeOnMount
          onBack={() => setVerifying(false)}
          backLabel="Volver al login"
          onVerified={async () => {
            setVerifying(false);
            setLoading(true);
            try {
              await doSignIn();
            } finally {
              setLoading(false);
            }
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      subtitle="Panel de Administración"
      footer={<p>Solo pueden ingresar usuarios con acceso aprobado</p>}
    >
      <form className="login-form" onSubmit={handleSubmit}>
        {notice && !error && !warning && <AuthMessage type="success">{notice}</AuthMessage>}

        <Input
          type="email"
          label="Email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
        />

        <Input
          type={showPassword ? "text" : "password"}
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
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

        <div className="auth-links">
          <span />
          <button type="button" className="auth-link" onClick={() => navigate('/forgot-password')}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {error && <AuthMessage type="error">{error}</AuthMessage>}
        {warning && <AuthMessage type="warning">{warning}</AuthMessage>}

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
        >
          Iniciar Sesión
        </Button>

        <div className="auth-divider">¿No tenés acceso al panel?</div>

        <Button
          type="button"
          variant="outline"
          size="large"
          fullWidth
          onClick={() => navigate('/request-access')}
          disabled={loading}
        >
          Solicitar acceso
        </Button>
      </form>
    </AuthLayout>
  );
}
