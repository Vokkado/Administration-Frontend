/**
 * Muestra las 3 fotos originales que subió el usuario al cargar el producto por IA
 * (portada / ingredientes / información nutricional). Solo aparece en modo edición y si el
 * backend devuelve URLs (producto IA). Cada foto se puede agrandar en un lightbox.
 */
import { useState } from 'react';
import { ImageLightbox } from '../../../../components/ui';
import { useSourceImages } from '../../../../hooks/useSourceImages';

interface ProductSourceImagesSectionProps {
  productId?: string;
}

/** Textos auxiliares en gris (la clase `form-hint` los pinta marrón e itálica). */
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--color-grey-500)' };

export function ProductSourceImagesSection({ productId }: ProductSourceImagesSectionProps) {
  const { photos, uploader, loading, markFailed } = useSourceImages(productId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [revealedFor, setRevealedFor] = useState<string | null>(null);

  const uploaderRevealed = !!productId && revealedFor === productId;
  const hasAnyPhoto = photos.length > 0;

  if (loading) {
    return (
      <div className="form-group form-group-full">
        <label className="form-label">Fotos cargadas por el usuario (IA)</label>
        {/* `pulse` y `spin` son animaciones globales (components/ui/shared.css). */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 120, height: 120, borderRadius: 8, background: '#f0f0f0', animation: 'pulse 1.2s ease-in-out infinite' }} />
          ))}
        </div>
        <small style={{ ...hintStyle, display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              border: '2px solid var(--color-grey-200)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          Cargando fotos…
        </small>
      </div>
    );
  }

  if (!hasAnyPhoto && !uploader) return null;

  return (
    <div className="form-group form-group-full">
      <label className="form-label">Fotos cargadas por el usuario (IA)</label>

      {hasAnyPhoto && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {photos.map((p, i) => (
            <div key={p.key} style={{ textAlign: 'center' }}>
              <img
                src={p.url}
                alt={p.label}
                title="Click para agrandar"
                onClick={() => setLightboxIndex(i)}
                onError={() => markFailed(p.key)}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                  background: '#fafafa',
                  cursor: 'zoom-in',
                  display: 'block',
                }}
              />
              <small style={{ ...hintStyle, display: 'block', marginTop: 4 }}>{p.label}</small>
            </div>
          ))}
        </div>
      )}

      {uploader && (
        <div style={{ marginTop: 12 }}>
          <small style={{ ...hintStyle, display: 'block', marginBottom: 4 }}>
            Cargado por {uploaderRevealed ? '' : '(click para revelar)'}
          </small>
          <span
            onClick={() => setRevealedFor(productId ?? null)}
            title={uploaderRevealed ? '' : 'Click para revelar'}
            style={{
              display: 'inline-block',
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '4px 8px',
              borderRadius: 4,
              background: uploaderRevealed ? 'transparent' : '#eaeaea',
              cursor: uploaderRevealed ? 'text' : 'pointer',
              userSelect: uploaderRevealed ? 'auto' : 'none',
              filter: uploaderRevealed ? 'none' : 'blur(5px)',
              transition: 'filter 0.15s ease',
            }}
          >
            {uploader.email} · {uploader.id}
          </span>
        </div>
      )}

      <ImageLightbox
        images={photos.map((p) => ({ src: p.url, alt: p.label }))}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
