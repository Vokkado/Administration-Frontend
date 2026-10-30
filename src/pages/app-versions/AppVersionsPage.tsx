/**
 * Página "Versiones de la app" (admin): la versión mínima y la actual de Android y de iOS.
 * Con una versión menor a la mínima, la app muestra un cartel que no se puede cerrar hasta actualizar.
 */
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, ConfirmDialog, Input, LoadingSpinner, NotificationBanner, PageHeader } from '../../components/ui';
import {
  AppVersionsService,
  compareVersions,
  isValidVersion,
  type AppPlatform,
  type AppVersionConfig,
} from '../../services/app-versions.service';
import { getApiMessage } from '../../services/apiError';
import './AppVersionsPage.css';

const PLATFORMS: Array<{ key: AppPlatform; label: string; store: string; icon: string }> = [
  { key: 'ANDROID', label: 'Android', store: 'Google Play', icon: '🤖' },
  { key: 'IOS', label: 'iOS', store: 'App Store', icon: '🍎' },
];

interface Draft {
  minVersion: string;
  latestVersion: string;
}

function validate(draft: Draft): { min?: string; latest?: string } {
  const min = draft.minVersion.trim();
  const latest = draft.latestVersion.trim();
  const errors: { min?: string; latest?: string } = {};
  if (!isValidVersion(min)) errors.min = 'Formato 1.2.3';
  if (!isValidVersion(latest)) errors.latest = 'Formato 1.2.3';
  if (!errors.min && !errors.latest && compareVersions(min, latest) > 0) {
    errors.min = 'No puede ser mayor que la actual';
  }
  return errors;
}

export function AppVersionsPage() {
  const [configs, setConfigs] = useState<AppVersionConfig[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<AppPlatform | null>(null);
  const [toConfirm, setToConfirm] = useState<AppPlatform | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyConfigs = (list: AppVersionConfig[]) => {
    setConfigs(list);
    setDrafts(Object.fromEntries(list.map((c) => [c.platform, { minVersion: c.minVersion, latestVersion: c.latestVersion }])));
  };

  useEffect(() => {
    AppVersionsService.list()
      .then(applyConfigs)
      .catch((err: unknown) => setError(getApiMessage(err, 'Error al cargar las versiones')));
  }, []);

  const configOf = (platform: AppPlatform) => configs?.find((c) => c.platform === platform);

  const setDraft = (platform: AppPlatform, field: keyof Draft, value: string) =>
    setDrafts((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));

  const save = async (platform: AppPlatform) => {
    const draft = drafts[platform];
    setSaving(platform);
    setError('');
    setSuccess('');
    try {
      const saved = await AppVersionsService.update(platform, draft.minVersion.trim(), draft.latestVersion.trim());
      // Se relee para mostrar quién lo cambió; solo se pisa esta plataforma, no lo que se esté editando en la otra.
      const fresh = await AppVersionsService.list().catch(() => null);
      const config = fresh?.find((c) => c.platform === platform) ?? saved;
      setConfigs((prev) => (prev ?? []).map((c) => (c.platform === platform ? config : c)));
      setDrafts((prev) => ({ ...prev, [platform]: { minVersion: config.minVersion, latestVersion: config.latestVersion } }));
      const label = PLATFORMS.find((p) => p.key === platform)?.label;
      setSuccess(`Versiones de ${label} guardadas.`);
      setToConfirm(null);
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Error al guardar las versiones'));
    } finally {
      setSaving(null);
    }
  };

  // Subir la mínima bloquea gente: se confirma. Bajarla o tocar solo la actual, no.
  const requestSave = (platform: AppPlatform) => {
    const current = configOf(platform);
    const raisesMin = current && compareVersions(drafts[platform].minVersion.trim(), current.minVersion) > 0;
    if (raisesMin) setToConfirm(platform);
    else save(platform);
  };

  const confirming = toConfirm ? PLATFORMS.find((p) => p.key === toConfirm) : null;

  return (
    <AdminLayout className="page-app-versions">
      <PageHeader
        title="Versiones de la app"
        description="La mínima es obligatoria: con una menor, la app muestra un cartel para actualizar y no deja seguir. La actual es la última publicada en la tienda."
      />

      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />

      {configs === null && !error && <LoadingSpinner message="Cargando versiones..." />}

      {configs && (
        <>
          <div className="app-versions-grid">
            {PLATFORMS.map((platform) => {
              const config = configOf(platform.key);
              const draft = drafts[platform.key];
              if (!config || !draft) return null;
              const errors = validate(draft);
              const isDirty =
                draft.minVersion.trim() !== config.minVersion || draft.latestVersion.trim() !== config.latestVersion;
              const isSaving = saving === platform.key;
              return (
                <section key={platform.key} className="app-versions-card">
                  <header className="app-versions-card-header">
                    <span className="app-versions-icon" aria-hidden>{platform.icon}</span>
                    <div>
                      <h3>{platform.label}</h3>
                      <span>{platform.store}</span>
                    </div>
                  </header>

                  <div className="app-versions-fields">
                    <Input
                      label="Versión mínima (obligatoria)"
                      value={draft.minVersion}
                      onChange={(e) => setDraft(platform.key, 'minVersion', e.target.value)}
                      error={errors.min}
                      placeholder="1.0.0"
                      inputMode="decimal"
                      disabled={isSaving}
                      fullWidth
                    />
                    <Input
                      label="Versión actual (en la tienda)"
                      value={draft.latestVersion}
                      onChange={(e) => setDraft(platform.key, 'latestVersion', e.target.value)}
                      error={errors.latest}
                      placeholder="1.0.0"
                      inputMode="decimal"
                      disabled={isSaving}
                      fullWidth
                    />
                  </div>

                  <footer className="app-versions-card-footer">
                    <small>
                      Actualizado el{' '}
                      {new Date(config.updatedAt).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })}
                      {config.updatedByName ? ` por ${config.updatedByName}` : ''}
                    </small>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => requestSave(platform.key)}
                      disabled={!isDirty || !!errors.min || !!errors.latest || saving !== null}
                      loading={isSaving}
                    >
                      Guardar
                    </Button>
                  </footer>
                </section>
              );
            })}
          </div>

          <div className="app-versions-hint">
            <strong>Antes de subir la mínima</strong>
            <ul>
              <li>Esperá a que la versión nueva esté publicada en la tienda de esa plataforma: si no, la gente queda bloqueada sin poder actualizar.</li>
              <li>Apple revisa cada versión y puede tardar más que Google: por eso cada plataforma tiene la suya.</li>
              <li>La versión es la de <code>version</code> en <code>app.json</code>, no el número de build.</li>
            </ul>
          </div>
        </>
      )}

      <ConfirmDialog
        show={confirming != null}
        title="¿Subir la versión mínima?"
        message={
          confirming
            ? `Todos los usuarios de ${confirming.label} con una versión menor a la ${drafts[confirming.key]?.minVersion.trim()} van a ver el cartel y no van a poder usar la app hasta actualizar. Confirmá que esa versión ya está en ${confirming.store}.`
            : ''
        }
        confirmText="Subir mínima"
        cancelText="Cancelar"
        variant="primary"
        loading={saving !== null}
        onConfirm={() => toConfirm && save(toConfirm)}
        onCancel={() => setToConfirm(null)}
      />
    </AdminLayout>
  );
}
