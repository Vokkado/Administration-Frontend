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

export function ProductSourceImagesSection({ productId }: ProductSourceImagesSectionProps) {
  const { photos, uploader, markFailed } = useSourceImages(productId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [revealedFor, setRevealedFor] = useState<string | null>(null);

  const uploaderRevealed = !!productId && revealedFor === productId;
  const hasAnyPhoto = photos.length > 0;
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
              <small className="form-hint" style={{ display: 'block', marginTop: 4 }}>{p.label}</small>
            </div>
          ))}
        </div>
      )}

      {uploader && (
        <div style={{ marginTop: 12 }}>
          <small className="form-hint" style={{ display: 'block', marginBottom: 4 }}>
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
