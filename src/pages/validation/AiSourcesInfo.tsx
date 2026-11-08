/**
 * "Información de la IA": (1) la etiqueta en cada fuente — fotos guardadas en nuestro S3 y el texto de
 * ingredientes y tabla de cada súper o sitio de la marca, para no tener que abrir otra pestaña — y
 * (2) de dónde salió cada dato que completó el enriquecimiento automático. Se muestra en la columna
 * derecha del wizard, debajo de las fotos del usuario, en todos los pasos.
 *
 * Las fotos/textos se traen con "Traer fotos y textos" (sin IA) o al usar "Completar con IA (Beta)".
 */
import { useState } from 'react';
import { ValidationService, type EnrichmentSourceSummary, type LabelSources } from '../../services/validation.service';

const STORE_LABELS: Record<string, string> = {
  eldorado: 'El Dorado',
  tata: 'TATA',
  tiendainglesa: 'Tienda Inglesa',
  disco: 'Disco',
  devoto: 'Devoto',
  geant: 'Géant',
  openfoodfacts: 'OpenFoodFacts',
  conaprole: 'Conaprole (sitio de la marca)',
  schneck: 'Schneck (sitio de la marca)',
  eltrigal: 'El Trigal (sitio de la marca)',
  sarubbi: 'Sarubbi (sitio de la marca)',
  felfort: 'Felfort (sitio de la marca)',
  laespecialista: 'La Especialista (sitio de la marca)',
  farmashop: 'Farmashop (tienda online)',
  avanti: 'Avanti (sitio de la marca)',
};

function storeLabel(store: string): string {
  return STORE_LABELS[store] ?? store;
}

interface AiSourcesInfoProps {
  sources: EnrichmentSourceSummary[] | null | undefined;
  /** Fotos y textos guardados de cada fuente. */
  labelSources?: LabelSources | null;
  productId: string;
  onChanged: () => void;
}

export function AiSourcesInfo({ sources, labelSources, productId, onChanged }: AiSourcesInfoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchSources = async () => {
    setLoading(true); setError(null);
    try { await ValidationService.aiSources(productId); onChanged(); }
    catch { setError('No se pudieron traer las fuentes. Probá de nuevo.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="vw-ai-sources">
      <LabelSourcesView labelSources={labelSources} loading={loading} error={error} onFetch={fetchSources} />
      {sources && sources.length > 0 && <EnrichmentSummary sources={sources} />}
    </div>
  );
}

/** Fotos (miniaturas que se abren en grande) y texto de cada fuente. */
function LabelSourcesView({ labelSources, loading, error, onFetch }: {
  labelSources?: LabelSources | null; loading: boolean; error: string | null; onFetch: () => void;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const user = labelSources?.userPhotos;
  const userImgs = (user
    ? [user.ingredients ? { url: user.ingredients, label: 'Ingredientes' } : null, user.nutritionFacts ? { url: user.nutritionFacts, label: 'Tabla' } : null]
    : []).filter((x): x is { url: string; label: string } => !!x);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h4 className="vw-ai-sources-title" style={{ margin: 0 }}>📷 La etiqueta en cada fuente</h4>
        <button type="button" className="vw-ai-fetch-btn" onClick={onFetch} disabled={loading}>
          {loading ? 'Buscando…' : labelSources ? '↻ Actualizar' : 'Traer fotos y textos'}
        </button>
      </div>
      {error && <p className="vw-ai-sources-hint" style={{ color: 'var(--color-error)' }}>{error}</p>}
      {!labelSources && !loading && (
        <p className="vw-ai-sources-hint">
          Trae la portada, las fotos de la etiqueta y el texto de ingredientes y tabla de cada súper o sitio de la marca, y los deja guardados acá. No usa IA.
        </p>
      )}
      {labelSources && (
        <>
          <p className="vw-ai-sources-hint">Buscado el {new Date(labelSources.fetchedAt).toLocaleString('es-UY')}. Tocá una foto para verla grande.</p>
          {userImgs.length > 0 && (
            <SourceCard title="Fotos del usuario (privadas: no usar como portada)" images={userImgs} onZoom={setZoom} />
          )}
          {labelSources.sources.map((s, i) => (
            <SourceCard
              key={`${s.store}-${i}`}
              title={storeLabel(s.store)}
              url={s.url}
              images={[
                ...(s.coverUrl ? [{ url: s.coverUrl, label: 'Portada' }] : []),
                ...s.labelImageUrls.map((u, k) => ({ url: u, label: `Etiqueta ${k + 1}` })),
              ]}
              ingredientsText={s.ingredientsText}
              nutritionText={s.nutritionText}
              onZoom={setZoom}
            />
          ))}
          {labelSources.sources.length === 0 && userImgs.length === 0 && (
            <p className="vw-ai-sources-hint">No se encontró nada en los súper ni en el sitio de la marca.</p>
          )}
        </>
      )}
      {zoom && (
        <div
          role="dialog"
          aria-label="Foto en grande"
          onClick={() => setZoom(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 16 }}
        >
          <img src={zoom} alt="Etiqueta" style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain', background: '#fff', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

function SourceCard({ title, url, images, ingredientsText, nutritionText, onZoom }: {
  title: string; url?: string | null; images: { url: string; label: string }[];
  ingredientsText?: string | null; nutritionText?: string | null; onZoom: (u: string) => void;
}) {
  return (
    <div className="vw-ai-source-item" style={{ display: 'block', marginTop: 8 }}>
      <strong>{title}</strong>
      {url && <>{' — '}<a href={url} target="_blank" rel="noopener noreferrer">ver fuente</a></>}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {images.map((im) => (
            <button
              key={im.url}
              type="button"
              onClick={() => onZoom(im.url)}
              title={im.label}
              style={{ padding: 0, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'zoom-in' }}
            >
              <img src={im.url} alt={im.label} loading="lazy" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            </button>
          ))}
        </div>
      )}
      {ingredientsText && <SourceText label="Ingredientes" text={ingredientsText} />}
      {nutritionText && <SourceText label="Tabla" text={nutritionText} />}
    </div>
  );
}

function SourceText({ label, text }: { label: string; text: string }) {
  return (
    <details style={{ marginTop: 6 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13 }}>{label} (texto)</summary>
      <p style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: '4px 0 0', color: '#374151' }}>{text}</p>
    </details>
  );
}

/** Resumen de lo que usó el enriquecimiento automático al cargar el producto. */
function EnrichmentSummary({ sources }: { sources: EnrichmentSourceSummary[] }) {
  return (
    <div>
      <h4 className="vw-ai-sources-title">🤖 Qué usó la IA al cargarlo</h4>
      <p className="vw-ai-sources-hint">
        El enriquecimiento automático buscó este producto en los súper y OpenFoodFacts. Esto es lo que encontró en cada fuente:
      </p>
      <ul className="vw-ai-sources-list">
        {sources.map((s, i) => {
          const parts: string[] = [];
          if (s.usedCover) parts.push('portada');
          if (s.usedNutritionText) parts.push('nutrición (texto)');
          if (s.usedIngredientsText) parts.push('ingredientes (texto)');
          if (s.galleryCount > 0) parts.push(`${s.galleryCount} foto${s.galleryCount > 1 ? 's' : ''} de etiqueta (leída por IA)`);
          return (
            <li key={`${s.store}-${i}`} className="vw-ai-source-item">
              <strong>{storeLabel(s.store)}</strong>
              {parts.length > 0 ? `: ${parts.join(', ')}` : ': sin datos usables'}
              {s.url && (
                <>
                  {' — '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">ver fuente</a>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
