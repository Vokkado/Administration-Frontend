/**
 * Sesiones y dispositivos: dónde está abierta la cuenta (app, panel, web del nutricionista), con
 * el último uso de cada una. Se puede cerrar una sesión puntual o todas, incluida esta.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, ConfirmDialog, NotificationBanner, LoadingSpinner } from '../../components/ui';
import { useAuthContext } from '../../contexts/AuthContext';
import { getApiMessage } from '../../services/apiError';
import { SessionsService, type DeviceSession } from '../../modules/auth/services/sessions.service';
import './SessionsPage.css';

const CLIENT_INFO: Record<DeviceSession['client'], { label: string; icon: string }> = {
  APP: { label: 'App Vokkado', icon: '📱' },
  ADMIN: { label: 'Panel de administración', icon: '🖥️' },
  NUTRITIONIST: { label: 'Web del nutricionista', icon: '💻' },
};

/** "hace 5 minutos", "hace 3 días"… */
function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? 'hace un momento' : `hace ${minutes} minutos`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

export function SessionsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthContext();

  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toClose, setToClose] = useState<DeviceSession | null>(null);
  const [showCloseAll, setShowCloseAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSessions(await SessionsService.list());
      setError('');
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron cargar tus sesiones'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** La sesión de este navegador ya se cerró en el servidor: salir y volver al login. */
  const leaveThisBrowser = async () => {
    SessionsService.clearLocal();
    await signOut();
    navigate('/login');
  };

  const confirmCloseOne = async () => {
    const session = toClose;
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const revokedCurrent = await SessionsService.revoke(session.id);
      setToClose(null);
      if (revokedCurrent) {
        await leaveThisBrowser();
        return;
      }
      setSuccess('Sesión cerrada');
      await load();
    } catch (err) {
      setToClose(null);
      setError(getApiMessage(err, 'No se pudo cerrar la sesión'));
    } finally {
      setBusy(false);
    }
  };

  const confirmCloseAll = async () => {
    setBusy(true);
    setError('');
    try {
      await SessionsService.revokeAll();
      setShowCloseAll(false);
      await leaveThisBrowser();
    } catch (err) {
      setShowCloseAll(false);
      setError(getApiMessage(err, 'No se pudieron cerrar las sesiones'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Sesiones y dispositivos">
      <p className="sessions-intro">
        Estos son los dispositivos donde tu cuenta está abierta. Si no reconocés alguno, cerrá esa
        sesión o cerrá todas.
      </p>

      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />

      {sessions === null && !error && <LoadingSpinner message="Cargando sesiones..." />}

      {sessions && sessions.length === 0 && (
        <p className="sessions-empty">No hay sesiones registradas todavía.</p>
      )}

      {sessions && sessions.length > 0 && (
        <>
          <ul className="sessions-list">
            {sessions.map((session) => {
              const info = CLIENT_INFO[session.client] ?? CLIENT_INFO.APP;
              const status = session.isCurrent
                ? { text: 'Este dispositivo', tone: 'current' }
                : session.isActiveNow
                ? { text: 'Activa ahora', tone: 'active' }
                : { text: `Último uso ${timeAgo(session.lastSeenAt)}`, tone: 'idle' };
              return (
                <li key={session.id} className="sessions-item">
                  <span className="sessions-icon" aria-hidden>
                    {info.icon}
                  </span>
                  <div className="sessions-body">
                    <strong>{session.deviceName || info.label}</strong>
                    <span className="sessions-meta">
                      {[info.label, session.platform].filter(Boolean).join(' · ')}
                    </span>
                    <span className={`sessions-status sessions-status--${status.tone}`}>
                      {status.text}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    disabled={busy}
                    onClick={() => setToClose(session)}
                  >
                    Cerrar
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="sessions-close-all">
            <Button variant="danger" disabled={busy} onClick={() => setShowCloseAll(true)}>
              Cerrar sesión en todos los dispositivos
            </Button>
            <small>Incluye este navegador: vas a tener que volver a iniciar sesión en todos lados.</small>
          </div>
        </>
      )}

      <ConfirmDialog
        show={toClose !== null}
        title="¿Cerrar esta sesión?"
        message={
          toClose?.isCurrent
            ? 'Es la sesión de este navegador: vas a tener que volver a iniciar sesión.'
            : `Se cerrará la sesión en ${toClose?.deviceName || 'ese dispositivo'}.`
        }
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        variant="danger"
        loading={busy}
        onConfirm={confirmCloseOne}
        onCancel={() => setToClose(null)}
      />

      <ConfirmDialog
        show={showCloseAll}
        title="¿Cerrar sesión en todos los dispositivos?"
        message="Se cerrará tu cuenta en la app, el panel y la web del nutricionista, incluido este navegador."
        confirmText="Cerrar en todos"
        cancelText="Cancelar"
        variant="danger"
        loading={busy}
        onConfirm={confirmCloseAll}
        onCancel={() => setShowCloseAll(false)}
      />
    </AdminLayout>
  );
}
