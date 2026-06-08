/**
 * Muestra las 3 fotos originales que subió el usuario al cargar el producto por IA
 * (portada / ingredientes / información nutricional). Solo aparece en modo edición y si el
 * backend devuelve URLs (producto IA). Cada foto se puede agrandar en un lightbox.
 */
import { useEffect, useState } from 'react';
import { apiService } from '../../../../services/api.service';
import { ImageLightbox } from '../../../../components/ui';

interface ProductSourceImagesSectionProps {
  productId?: string;
}

interface SourceImages {
  cover: string | null;
  ingredients: string | null;
  nutritionFacts: string | null;
  uploader: { id: string; email: string } | null;
}

const PHOTOS: Array<{ key: keyof SourceImages; label: string }> = [
  { key: 'cover', label: 'Portada' },
  { key: 'ingredients', label: 'Ingredientes' },
  { key: 'nutritionFacts', label: 'Información nutricional' },
];

export function ProductSourceImagesSection({ productId }: ProductSourceImagesSectionProps) {
  const [images, setImages] = useState<SourceImages | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [uploaderRevealed, setUploaderRevealed] = useState(false);

  useEffect(() => {
    if (!productId) {
      setImages(null);
      return;
    }
    let active = true;
    setFailed({});
    setUploaderRevealed(false);
    apiService
      .get<{ success: boolean; data: SourceImages }>(`/products/${productId}/source-images`)
      .then((resp) => { if (active) setImages(resp.data); })
      .catch(() => { if (active) setImages(null); });
    return () => { active = false; };
  }, [productId]);

  if (!images) return null;

  const hasAnyPhoto = PHOTOS.some((p) => images[p.key] && !failed[p.key]);
  const uploader = images.uploader;
  if (!hasAnyPhoto && !uploader) return null;

  return (
    <div className="form-group form-group-full">
      <label className="form-label">Fotos cargadas por el usuario (IA)</label>

      {hasAnyPhoto && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PHOTOS.map((p) => {
            const url = images[p.key] as string | undefined;
            if (!url || failed[p.key]) return null;
            return (
              <div key={p.key} style={{ textAlign: 'center' }}>
                <img
                  src={url}
                  alt={p.label}
                  onClick={() => setLightboxSrc(url)}
                  onError={() => setFailed((f) => ({ ...f, [p.key]: true }))}
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
            );
          })}
        </div>
      )}

      {uploader && (
        <div style={{ marginTop: 12 }}>
          <small className="form-hint" style={{ display: 'block', marginBottom: 4 }}>
            Cargado por {uploaderRevealed ? '' : '(click para revelar)'}
          </small>
          <span
            onClick={() => setUploaderRevealed(true)}
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

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
