/**
 * Estado de acceso al panel para un usuario con sesión pero sin rol:
 * pedir acceso, ver la solicitud pendiente o el rechazo. También cubre cuenta desactivada y
 * error al verificar.
 */

import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, LoadingSpinner } from '../../components/ui';
import { useAuthContext } from '../../contexts/AuthContext';
import { AccessService } from '../../modules/auth/services/access.service';
import { ROLE_LABELS, ROLES, type AccessRequest } from '../../modules/auth/types';
import { AuthLayout, AuthMessage } from './AuthLayout';
import { getApiMessage, getApiStatus } from '../../services/apiError';

const MESSAGE_MAX = 500;

const formatDate = (value: string) =>
  new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function AccessPage() {
  const { status, statusError, user, checkAuth, signOut } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;

  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const loadRequest = useCallback(async () => {
    setLoadingRequest(true);
    setError('');
    try {
      setRequest(await AccessService.getMyAccessRequest());
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo obtener el estado de tu solicitud.'));
    } finally {
      setLoadingRequest(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'no-access') loadRequest();
  }, [status, loadRequest]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const next = await checkAuth();
      if (next === 'authorized') navigate('/dashboard', { replace: true });
    } finally {
      setChecking(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await AccessService.createAccessRequest(message);
      setRequest(created);
      setMessage('');
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo enviar la solicitud.'));
      if (getApiStatus(err) === 409) await loadRequest();
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthLayout subtitle="Acceso al panel">
        <LoadingSpinner message="Verificando tu acceso..." />
      </AuthLayout>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  const accountFooter = (
    <p className="auth-account">
      {user?.email && <>Sesión iniciada como <strong>{user.email}</strong> · </>}
      <button type="button" className="auth-link" onClick={handleSignOut}>
        Cerrar sesión
      </button>
    </p>
  );

  if (status === 'authorized') {
    return (
      <AuthLayout subtitle="Acceso al panel" footer={accountFooter}>
        <div className="auth-status-card">
          <AuthMessage type="success">Tenés acceso al panel de administración.</AuthMessage>
          <Button variant="primary" size="large" fullWidth onClick={() => navigate('/dashboard', { replace: true })}>
            Ir al panel
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'deactivated') {
    return (
      <AuthLayout subtitle="Acceso al panel" footer={accountFooter}>
        <div className="auth-status-card">
          <AuthMessage type="warning">
            Tu cuenta está desactivada. Para volver a usarla, reactivala desde la app de Vokkado.
          </AuthMessage>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout subtitle="Acceso al panel" footer={accountFooter}>
        <div className="auth-status-card">
          <AuthMessage type="error">{statusError || 'No se pudo verificar tu acceso.'}</AuthMessage>
          <Button variant="primary" size="large" fullWidth loading={checking} onClick={handleRecheck}>
            Reintentar
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // status === 'no-access'
  const isPending = request?.status === 'pending';
  const wasRejected = request?.status === 'rejected';
  // Tiene un rol del panel que todavía no habilita ninguna sección (p.ej. Editor de catálogo).
  const pendingPanelRole = user?.roles.find((role) => role === ROLES.ADMIN_NUTRITIONIST);

  return (
    <AuthLayout subtitle="Acceso al panel" footer={accountFooter} wide>
      <div className="auth-status-card">
        {notice && <AuthMessage type="warning">{notice}</AuthMessage>}

        {loadingRequest ? (
          <LoadingSpinner message="Cargando tu solicitud..." />
        ) : pendingPanelRole ? (
          <>
            <h2 className="auth-status-title">Acceso aprobado</h2>
            <AuthMessage type="info">
              <p>
                Tu cuenta tiene el rol <strong>{ROLE_LABELS[pendingPanelRole] || pendingPanelRole}</strong>. Las
                secciones del panel para ese rol todavía no están habilitadas.
              </p>
              <p>Si necesitás otro tipo de acceso, pedíselo a un administrador.</p>
            </AuthMessage>
          </>
        ) : isPending ? (
          <>
            <h2 className="auth-status-title">Solicitud pendiente</h2>
            <AuthMessage type="info">
              <p>
                Tu solicitud de acceso está siendo revisada por un administrador. Cuando la aprueben
                vas a poder ingresar al panel con esta misma cuenta.
              </p>
              {request?.message && <p><strong>Tu mensaje:</strong> {request.message}</p>}
            </AuthMessage>
            <p className="auth-status-meta">Enviada el {formatDate(request!.createdAt)}</p>
            <Button variant="outline" size="large" fullWidth loading={checking} onClick={handleRecheck}>
              Ya me aprobaron, verificar de nuevo
            </Button>
          </>
        ) : (
          <>
            <h2 className="auth-status-title">No tenés acceso al panel</h2>

            {wasRejected ? (
              <AuthMessage type="warning">
                <p>Tu última solicitud fue rechazada el {formatDate(request!.reviewedAt || request!.updatedAt)}.</p>
                {request?.reviewNote && <p><strong>Motivo:</strong> {request.reviewNote}</p>}
                <p>Si creés que es un error, podés enviar una nueva solicitud.</p>
              </AuthMessage>
            ) : (
              <AuthMessage type="info">
                Tu cuenta de Vokkado todavía no tiene permisos para el panel de administración.
                Enviá una solicitud y un administrador la va a revisar.
              </AuthMessage>
            )}

            <form className="login-form" onSubmit={handleRequest}>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="access-request-message">
                  ¿Para qué necesitás acceso? <span className="auth-field-hint">(opcional)</span>
                </label>
                <textarea
                  id="access-request-message"
                  className="auth-textarea"
                  placeholder="Ej: Soy parte del equipo de contenidos y voy a validar productos."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MESSAGE_MAX}
                  rows={3}
                />
              </div>

              <Button type="submit" variant="primary" size="large" fullWidth loading={submitting}>
                Solicitar acceso
              </Button>
            </form>
          </>
        )}

        {error && <AuthMessage type="error">{error}</AuthMessage>}
      </div>
    </AuthLayout>
  );
}
