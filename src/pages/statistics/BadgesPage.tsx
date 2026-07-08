/**
 * Página "Insignias": administración básica del catálogo de insignias.
 * Permite editar el nombre, el umbral (cantidad para desbloquearla), la foto y si está activa.
 * La lógica de otorgarlas vive en el backend; acá solo se edita el catálogo (badge_definitions).
 */
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { PageHeader, NotificationBanner, LoadingSpinner, Button, Modal, Input } from '../../components/ui';
import {
  StatisticsService, type BadgeDefinitionAdmin, type BadgeMetric, type BadgeTier,
} from '../../services/statistics.service';

const METRIC_LABEL: Record<BadgeMetric, string> = {
  scans: 'Escaneos', uploads: 'Colaboración (productos aprobados)', carts: 'Compras completadas',
};
const TIER_LABEL: Record<BadgeTier, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };
const TIER_COLOR: Record<BadgeTier, string> = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#f5b301' };

export function BadgesPage() {
  const [badges, setBadges] = useState<BadgeDefinitionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BadgeDefinitionAdmin | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setBadges(await StatisticsService.getBadges());
      setError(null);
    } catch {
      setError('No se pudieron cargar las insignias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Agrupadas por métrica y ordenadas por umbral (progresión bronce→oro).
  const groups = (['scans', 'uploads', 'carts'] as BadgeMetric[]).map((metric) => ({
    metric,
    items: badges.filter((b) => b.metric === metric).sort((a, b) => a.threshold - b.threshold),
  })).filter((g) => g.items.length > 0);

  return (
    <AdminLayout title="Insignias">
      <PageHeader
        title="Insignias"
        description="Editá el nombre, la cantidad para desbloquearla y la foto de cada insignia."
        count={badges.length}
        countLabel="insignias"
        countLabelSingular="insignia"
      />

      {error && <NotificationBanner type="error" message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        groups.map((group) => (
          <div key={group.metric} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '8px 0', color: 'var(--color-primary-dark)' }}>{METRIC_LABEL[group.metric]}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {group.items.map((badge) => (
                <div
                  key={badge.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 12,
                    minWidth: 280, flex: '1 1 300px', opacity: badge.isActive ? 1 : 0.55,
                  }}
                >
                  <BadgeThumb url={badge.iconUrl} tier={badge.tier} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{badge.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)' }}>
                      <span style={{ color: TIER_COLOR[badge.tier] }}>{TIER_LABEL[badge.tier]}</span>
                      {' · '}Se desbloquea con {badge.threshold}
                      {!badge.isActive && ' · Inactiva'}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setEditing(badge)}>Editar</Button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {editing && (
        <BadgeEditModal
          badge={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setBadges((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setEditing(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

function BadgeThumb({ url, tier }: { url: string | null; tier: BadgeTier }) {
  const [failed, setFailed] = useState(false);
  const size = 52;
  if (url && !failed) {
    return <img src={url} alt="" width={size} height={size} style={{ borderRadius: 10, objectFit: 'cover' }} onError={() => setFailed(true)} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: TIER_COLOR[tier] + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
    }}>🏆</div>
  );
}

function BadgeEditModal({
  badge, onClose, onSaved,
}: {
  badge: BadgeDefinitionAdmin;
  onClose: () => void;
  onSaved: (b: BadgeDefinitionAdmin) => void;
}) {
  const [name, setName] = useState(badge.name);
  const [threshold, setThreshold] = useState(String(badge.threshold));
  const [iconUrl, setIconUrl] = useState<string | null>(badge.iconUrl);
  const [isActive, setIsActive] = useState(badge.isActive);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato no soportado (JPG, PNG o WEBP)');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('La imagen supera el máximo de 4 MB');
      return;
    }
    try {
      setUploading(true);
      setError(undefined);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      setIconUrl(await StatisticsService.uploadImage(dataUrl, file.type));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const th = parseInt(threshold, 10);
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!Number.isInteger(th) || th < 1) { setError('La cantidad debe ser un entero >= 1'); return; }
    try {
      setSaving(true);
      setError(undefined);
      const updated = await StatisticsService.updateBadge(badge.id, {
        name: name.trim(), threshold: th, iconUrl, isActive,
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo guardar la insignia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show title={`Editar: ${badge.name}`} onClose={onClose} error={error}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BadgeThumb url={iconUrl} tier={badge.tier} />
          <label className="btn btn-secondary" style={{ cursor: uploading ? 'default' : 'pointer' }}>
            {uploading ? 'Subiendo…' : 'Cambiar foto'}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>

        <Input type="text" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Input type="number" label="Cantidad para desbloquear" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={1} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Insignia activa (visible para los usuarios)
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
