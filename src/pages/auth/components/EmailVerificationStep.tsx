/**
 * Paso de verificación de email (código de Cognito). Lo usan el login (cuenta sin verificar)
 * y "Solicitar acceso".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input } from '../../../components/ui';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { AuthMessage } from '../AuthLayout';

const RESEND_COOLDOWN_SECONDS = 30;

interface EmailVerificationStepProps {
  email: string;
  /** Se llama con el código ya confirmado en Cognito. */
  onVerified: () => Promise<void> | void;
  onBack?: () => void;
  backLabel?: string;
  /** Mandar un código nuevo al montar (cuando el usuario llega sin uno vigente). */
  sendCodeOnMount?: boolean;
}

export function EmailVerificationStep({
  email,
  onVerified,
  onBack,
  backLabel = 'Volver',
  sendCodeOnMount = false,
}: EmailVerificationStepProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = useCallback(async () => {
    const result = await AuthService.resendSignUpCode(email);
    if (result.success) {
      setError('');
      setInfo('Te enviamos un código nuevo.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setInfo('');
      setError(result.error || 'No se pudo reenviar el código');
    }
  }, [email]);

  // Una sola vez (el ref evita el doble envío de StrictMode en desarrollo).
  const sentOnMount = useRef(false);
  useEffect(() => {
    if (!sendCodeOnMount || sentOnMount.current) return;
    sentOnMount.current = true;
    void resend();
  }, [sendCodeOnMount, resend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const result = await AuthService.confirmSignUp(email, code);
      if (!result.success) {
        setError(result.error || 'No se pudo verificar el código');
        return;
      }
      await onVerified();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <AuthMessage type="info">
        Enviamos un código de verificación a <strong>{email}</strong>. Revisá tu bandeja de entrada
        (y la carpeta de spam).
      </AuthMessage>

      <Input
        type="text"
        label="Código de verificación"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        fullWidth
        autoFocus
      />

      {error && <AuthMessage type="error">{error}</AuthMessage>}
      {info && <AuthMessage type="success">{info}</AuthMessage>}

      <Button type="submit" variant="primary" size="large" fullWidth loading={loading} disabled={code.length < 6}>
        Verificar email
      </Button>

      <div className="auth-links">
        {onBack ? (
          <button type="button" className="auth-link" onClick={onBack}>
            {backLabel}
          </button>
        ) : <span />}
        <button type="button" className="auth-link" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );
}
