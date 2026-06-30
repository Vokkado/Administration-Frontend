/**
 * Página "Términos y Privacidad" (admin): edita el contenido vigente de Términos y
 * Condiciones / Política de Privacidad y publica nuevas versiones. Publicar dispara,
 * UNA vez, el cartel de re-aceptación en la app para todo usuario que esté en una
 * versión anterior (no hace falta tocar código para actualizar los términos).
 */
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, ConfirmDialog, NotificationBanner, LoadingSpinner } from '../../components/ui';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { LegalService, type LegalDocType, type LegalVersionHistoryItem } from '../../services/legal.service';
import './LegalPage.css';

const TABS: Array<{ key: LegalDocType; label: string }> = [
  { key: 'TERMS', label: 'Términos y Condiciones' },
  { key: 'PRIVACY', label: 'Política de Privacidad' },
];

export function LegalPage() {
  const [activeTab, setActiveTab] = useState<LegalDocType>('TERMS');
  const [history, setHistory] = useState<LegalVersionHistoryItem[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const crud = useCRUDActions();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const versions = await LegalService.listVersions(activeTab);
      setHistory(versions);
      setContent(versions[0]?.content ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el documento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const current = history[0];
  const isDirty = content.trim() !== (current?.content ?? '').trim();

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      await LegalService.publish(activeTab, content);
      setShowPublishConfirm(false);
      crud.showSuccess('✅ Nueva versión publicada. Los usuarios verán el cartel de aceptación la próxima vez que abran la app.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al publicar la versión');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AdminLayout title="Términos y Privacidad">
      <div className="legal-page-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`legal-page-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <NotificationBanner type="success" message={crud.successMessage} />
      <NotificationBanner type="error" message={error} />

      {loading ? (
        <LoadingSpinner message="Cargando documento..." />
      ) : (
        <>
          <div className="legal-meta">
            {current ? (
              <p>
                Versión vigente: <strong>v{current.version}</strong> · publicada el{' '}
                {new Date(current.publishedAt).toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' })}
                {current.publishedByName ? ` por ${current.publishedByName}` : ''}
              </p>
            ) : (
              <p>Sin versiones publicadas todavía.</p>
            )}
            <p className="legal-meta-hint">
              Formato: una línea que empieza con <code>## </code> es un subtítulo, una línea con <code>- </code> es un ítem de lista, y una línea en blanco separa párrafos.
            </p>
          </div>

          <textarea
            className="textarea legal-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
          />

          <div className="legal-actions">
            <Button
              variant="primary"
              onClick={() => setShowPublishConfirm(true)}
              disabled={!isDirty || !content.trim() || publishing}
            >
              Publicar nueva versión
            </Button>
          </div>

          {history.length > 0 && (
            <div className="legal-history">
              <h4>Historial de versiones</h4>
              <table className="dt-table">
                <tbody>
                  {history.map((v) => (
                    <tr key={v.id}>
                      <td>v{v.version}</td>
                      <td>{new Date(v.publishedAt).toLocaleString('es-UY')}</td>
                      <td>{v.publishedByName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        show={showPublishConfirm}
        title="Publicar nueva versión"
        message="Esto crea una nueva versión vigente. Todo usuario que esté en una versión anterior va a ver el cartel para re-aceptar la próxima vez que abra la app. ¿Confirmás?"
        confirmText="Publicar"
        cancelText="Cancelar"
        variant="primary"
        loading={publishing}
        onConfirm={handlePublish}
        onCancel={() => setShowPublishConfirm(false)}
      />
    </AdminLayout>
  );
}
