import { useState } from 'react';
import { Button, ImageLightbox } from '../../components/ui';
import { ScorePhotosService, type ScorePhotoLite } from '../../services/score-photos.service';
import { getApiMessage } from '../../services/apiError';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' }) : '');

/**
 * Fotos de la tabla nutricional que mandó un usuario porque el puntaje de este producto quedó aproximado (le faltaba
 * información). Se cargan los datos de la tabla acá mismo; al validar el producto quedan revisadas solas. Si el producto
 * ya estaba validado y solo se corrigió la tabla, se pueden marcar a mano.
 */
export function ScoreTablePhotos({ photos, onChanged }: { photos: ScorePhotoLite[]; onChanged: () => void }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = photos.filter((p) => !p.reviewedAt);
  const shown = pending.length ? pending : photos.slice(0, 1);
  const images = shown.filter((p) => p.imageUrl).map((p) => ({ src: p.imageUrl as string, alt: 'Foto de la tabla nutricional' }));

  const markAll = async () => {
    setBusy(true);
    setError('');
    try {
      await Promise.all(pending.map((p) => ScorePhotosService.markReviewed(p.id)));
      onChanged();
    } catch (e) {
      setError(getApiMessage(e, 'No se pudieron marcar las fotos'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`vw-photo-panel vw-score-photos ${pending.length ? 'vw-score-photos--pending' : ''}`}>
      <div className="vw-score-photos-head">
        <strong>📷 {pending.length ? `Foto de la tabla que mandó un usuario${pending.length > 1 ? ` (${pending.length})` : ''}` : 'Foto de la tabla (ya revisada)'}</strong>
        <span>
          {pending.length
            ? 'El puntaje quedó aproximado porque faltaban datos. Cargá la tabla y la porción desde la foto: al validar, queda revisada.'
            : `Revisada el ${fmt(shown[0]?.reviewedAt ?? null)}`}
        </span>
      </div>
      <div className="vw-score-photos-grid">
        {shown.map((p, i) => (
          p.imageUrl
            ? (
              <button key={p.id} type="button" className="vw-score-photos-thumb" onClick={() => setViewing(i)} title="Ver la foto grande">
                <img src={p.imageUrl} alt="Foto de la tabla nutricional" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                <span>{fmt(p.createdAt)}</span>
              </button>
            )
            : <div key={p.id} className="vw-score-photos-thumb vw-score-photos-thumb--broken">El enlace venció: recargá el producto.</div>
        ))}
      </div>
      {pending.length > 0 && (
        <div className="vw-score-photos-actions">
          <Button variant="outline" size="small" onClick={markAll} disabled={busy}>
            {busy ? 'Marcando…' : 'Ya cargué los datos (sin validar de nuevo)'}
          </Button>
        </div>
      )}
      {error && <div className="vw-score-photos-error">{error}</div>}
      {viewing !== null && images.length > 0 && (
        <ImageLightbox images={images} index={Math.min(viewing, images.length - 1)} onIndexChange={setViewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
