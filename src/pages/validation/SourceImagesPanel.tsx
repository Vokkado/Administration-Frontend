/**
 * Panel de fotos del usuario para el paso de composición: una foto grande siempre visible
 * (sticky) más una tira de miniaturas para cambiar entre portada / ingredientes / nutricional.
 * Click en la foto grande abre el lightbox (zoom + flechas) sin perder la selección.
 */
import { useState } from 'react';
import { ImageLightbox } from '../../components/ui';
import { useSourceImages } from '../../hooks/useSourceImages';
import './ValidationWizardPage.css';

interface SourceImagesPanelProps {
  productId: string;
  /** Foto que conviene mostrar primero según el paso (ej. la etiqueta de ingredientes). */
  initialKey?: 'cover' | 'ingredients' | 'nutritionFacts';
}

export function SourceImagesPanel({ productId, initialKey = 'ingredients' }: SourceImagesPanelProps) {
  const { photos, loading, markFailed } = useSourceImages(productId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // URL que ya terminó de bajar: mientras no coincida con la activa, se muestra el loader.
  const [shownUrl, setShownUrl] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="vw-photo-panel">
        <h3 className="vw-photo-panel-title">Fotos del usuario</h3>
        <div className="vw-photo-main vw-photo-loading">
          <span className="vw-photo-spinner" />
          <span>Cargando fotos…</span>
        </div>
        <div className="vw-photo-thumbs">
          {[0, 1, 2].map((i) => <span key={i} className="vw-photo-thumb-skeleton" />)}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="vw-photo-panel">
        <h3 className="vw-photo-panel-title">Fotos del usuario</h3>
        <p className="vw-photo-panel-empty">Este producto no tiene fotos cargadas.</p>
      </div>
    );
  }

  // La selección se resuelve al vuelo: si la foto elegida desapareció, cae en la preferida.
  const wanted = selectedKey ?? initialKey;
  const activeIndex = Math.max(0, photos.findIndex((p) => p.key === wanted));
  const active = photos[activeIndex];

  return (
    <div className="vw-photo-panel">
      <h3 className="vw-photo-panel-title">Fotos del usuario</h3>

      <div className="vw-photo-main-wrap">
        <img
          key={active.url}
          src={active.url}
          alt={active.label}
          title="Click para ampliar"
          className="vw-photo-main"
          onClick={() => setLightboxIndex(activeIndex)}
          onLoad={() => setShownUrl(active.url)}
          onError={() => markFailed(active.key)}
        />
        {shownUrl !== active.url && (
          <div className="vw-photo-main-loader">
            <span className="vw-photo-spinner" />
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="vw-photo-thumbs">
          {photos.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`vw-photo-thumb ${p.key === active.key ? 'is-active' : ''}`}
              onClick={() => setSelectedKey(p.key)}
              title={p.label}
            >
              <img src={p.url} alt="" onError={() => markFailed(p.key)} />
              <span>{p.short}</span>
            </button>
          ))}
        </div>
      )}

      <p className="vw-photo-panel-hint">Click en la foto para ampliar, con zoom y flechas.</p>

      <ImageLightbox
        images={photos.map((p) => ({ src: p.url, alt: p.label }))}
        index={lightboxIndex}
        onIndexChange={(i) => {
          // Navegar en el lightbox también cambia la foto del panel.
          setLightboxIndex(i);
          setSelectedKey(photos[i].key);
        }}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
