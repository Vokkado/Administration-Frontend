/**
 * Recuperar contraseña (Cognito). Las cuentas de Google/Apple no tienen contraseña: aviso.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import { Button, Input } from '../../components/ui';
import { AuthService, validatePasswordRules } from '../../modules/auth/services/auth.service';
import { AccessService } from '../../modules/auth/services/access.service';
import { AuthLayout, AuthMessage } from './AuthLayout';
import { FEDERATED_ACCOUNT_MESSAGE } from './authMessages';

type Step = 'email' | 'reset';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setLoading(true);
    try {
      try {
        const status = await AccessService.getEmailStatus(normalizedEmail);
        if (status.exists && status.federated) {
          setWarning(FEDERATED_ACCOUNT_MESSAGE);
          return;
        }
      } catch {
        // Si el chequeo falla, se intenta igual con Cognito.
      }

      const result = await AuthService.requestPasswordReset(normalizedEmail);
      if (result.success) {
        setStep('reset');
      } else if (result.errorCode === 'UserNotFoundException') {
        setError('No encontramos una cuenta con ese email.');
      } else {
        setError(result.error || 'No se pudo enviar el código');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const passwordError = validatePasswordRules(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.confirmPasswordReset(normalizedEmail, code, password);
      if (result.success) {
        navigate('/login', { replace: true, state: { notice: 'Contraseña actualizada. Ya podés iniciar sesión.' } });
      } else {
        setError(result.error || 'No se pudo actualizar la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      subtitle="Recuperar contraseña"
      footer={
        <button type="button" className="auth-link" onClick={() => navigate('/login')}>
          Volver al login
        </button>
      }
    >
      {step === 'email' ? (
        <form className="login-form" onSubmit={sendCode}>
          <AuthMessage type="info">
            Ingresá el email de tu cuenta y te enviamos un código para elegir una contraseña nueva.
          </AuthMessage>

          <Input
            type="email"
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
            autoFocus
          />

          {error && <AuthMessage type="error">{error}</AuthMessage>}
          {warning && <AuthMessage type="warning">{warning}</AuthMessage>}

          <Button type="submit" variant="primary" size="large" fullWidth loading={loading}>
            Enviar código
          </Button>
        </form>
      ) : (
        <form className="login-form" onSubmit={confirmReset}>
          <AuthMessage type="info">
            Enviamos un código a <strong>{normalizedEmail}</strong>.
          </AuthMessage>

          <Input
            type="text"
            label="Código"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            fullWidth
            autoFocus
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Contraseña nueva"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
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
          <span className="auth-field-hint">
            Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.
          </span>

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Repetir contraseña"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            fullWidth
          />

          {error && <AuthMessage type="error">{error}</AuthMessage>}

          <Button type="submit" variant="primary" size="large" fullWidth loading={loading} disabled={code.length < 6}>
            Cambiar contraseña
          </Button>

          <div className="auth-links">
            <button type="button" className="auth-link" onClick={() => { setStep('email'); setError(''); }}>
              Cambiar email
            </button>
            <span />
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
