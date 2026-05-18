import { useState } from 'react';
import { Button, ConfirmDialog, PageHeader, StatCard } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useNotifications } from './hooks/useNotifications';
import type { NotificationFormData, BroadcastResult } from './types';
import './NotificationsPage.css';

export function NotificationsPage() {
  const { sending, error, setError, sendBroadcast, stats, loadingStats } = useNotifications();

  const [formData, setFormData] = useState<NotificationFormData>({ title: '', body: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResultMessage(null);

    if (!formData.title.trim() || !formData.body.trim()) {
      setError('El título y el mensaje son requeridos');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setResultMessage(null);

    try {
      const result: BroadcastResult = await sendBroadcast({
        title: formData.title.trim(),
        body: formData.body.trim(),
      });

      if (result.sent > 0) {
        setResultMessage({
          type: 'success',
          text: `Notificación enviada a ${result.sent} de ${result.totalDevices} dispositivo${result.totalDevices !== 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} fallido${result.failed !== 1 ? 's' : ''})` : ''}`,
        });
      } else if (result.totalDevices === 0) {
        setResultMessage({
          type: 'error',
          text: 'No hay dispositivos activos para recibir la notificación',
        });
      } else {
        setResultMessage({
          type: 'error',
          text: `Error al enviar: ${result.failed} dispositivo${result.failed !== 1 ? 's' : ''} fallaron`,
        });
      }

      setFormData({ title: '', body: '' });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.messages?.[0] ||
        'Error al enviar la notificación';
      setResultMessage({ type: 'error', text: msg });
    }
  };

  return (
    <AdminLayout title="Gestión de Notificaciones">
        <PageHeader
          title="Notificaciones"
          description="Envía notificaciones push a los usuarios de la app"
        />

        {/* ── Send Card ── */}
        <section className="notif-send-card">
          <div className="notif-send-header">
            <div>
              <h3 className="notif-send-title">Enviar notificación</h3>
              <p className="notif-send-subtitle">
                Se enviará a todos los dispositivos con notificaciones habilitadas
                {!loadingStats && stats.active > 0 && (
                  <span className="notif-active-badge">{stats.active} dispositivo{stats.active !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>

          {/* Result inline alert */}
          {resultMessage && (
            <div className={`notif-alert notif-alert-${resultMessage.type}`}>
              <span className="notif-alert-icon">{resultMessage.type === 'success' ? '✓' : '✕'}</span>
              <span>{resultMessage.text}</span>
              <button className="notif-alert-close" onClick={() => setResultMessage(null)}>×</button>
            </div>
          )}

          {error && !resultMessage && (
            <div className="notif-alert notif-alert-error">
              <span className="notif-alert-icon">✕</span>
              <span>{error}</span>
              <button className="notif-alert-close" onClick={() => setError('')}>×</button>
            </div>
          )}

          <form className="notif-send-form" onSubmit={handleSubmit}>
            <div className="notif-form-group">
              <label className="notif-form-label">Título *</label>
              <input
                type="text"
                className="notif-form-input"
                placeholder="Ej: ¡Nueva actualización disponible!"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                maxLength={100}
                required
              />
            </div>

            <div className="notif-form-group">
              <label className="notif-form-label">Mensaje *</label>
              <textarea
                className="notif-form-textarea"
                placeholder="Escribí el mensaje de la notificación..."
                value={formData.body}
                onChange={(e) => setFormData((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                maxLength={1000}
                required
              />
            </div>

            {/* Live preview */}
            {(formData.title.trim() || formData.body.trim()) && (
              <div className="notif-preview">
                <p className="notif-preview-label">Vista previa</p>
                <div className="notif-preview-card">
                  <strong className="notif-preview-title">{formData.title || 'Título'}</strong>
                  <p className="notif-preview-body">{formData.body || 'Mensaje...'}</p>
                </div>
              </div>
            )}

            <div className="notif-send-actions">
              <Button type="submit" variant="primary" disabled={sending || (!formData.title.trim() || !formData.body.trim())}>
                {sending ? 'Enviando...' : '📢 Enviar a todos los usuarios'}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Device Stats ── */}
        <section className="notif-stats-summary">
          <p>Total de dispositivos: <strong>{loadingStats ? '—' : stats.total}</strong></p>
          <p>Dispositivos con notificaciones activadas: <strong>{loadingStats ? '—' : stats.active}</strong></p>
          <p>Dispositivos con notificaciones desactivadas: <strong>{loadingStats ? '—' : stats.inactive}</strong></p>
        </section>

      <ConfirmDialog
        show={showConfirm}
        title="Confirmar Envío"
        message={`¿Está seguro de enviar esta notificación a todos los usuarios?\n\nTítulo: "${formData.title}"\n\nEsta acción no se puede deshacer.`}
        confirmText="Enviar"
        cancelText="Cancelar"
        variant="primary"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirm(false)}
      />
    </AdminLayout>
  );
}
