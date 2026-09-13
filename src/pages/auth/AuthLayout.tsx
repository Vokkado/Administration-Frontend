/**
 * Layout compartido de las pantallas de autenticación (login, solicitar acceso, recuperar
 * contraseña, estado de acceso).
 */

import vokkadoIcon from '../../../assets/images/icon.png';
import './LoginPage.css';
import './AuthPages.css';

interface AuthLayoutProps {
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tarjeta más ancha para formularios largos. */
  wide?: boolean;
}

export function AuthLayout({ subtitle, children, footer, wide = false }: AuthLayoutProps) {
  return (
    <div className="login-page">
      <div className="login-decorations">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>

      <div className={`login-container${wide ? ' auth-container-wide' : ''}`}>
        <div className="login-header">
          <img src={vokkadoIcon} alt="Vokkado" className="login-logo" />
          <h1>Vokkado</h1>
          <p>{subtitle}</p>
        </div>

        {children}

        {footer && <div className="login-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface AuthMessageProps {
  type: 'error' | 'info' | 'success' | 'warning';
  children: React.ReactNode;
}

export function AuthMessage({ type, children }: AuthMessageProps) {
  if (type === 'error') {
    return (
      <div className="login-error" role="alert">
        <span>{children}</span>
      </div>
    );
  }
  return (
    <div className={`auth-message auth-message-${type}`} role="status">
      {children}
    </div>
  );
}
