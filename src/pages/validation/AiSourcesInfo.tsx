/**
 * "Información de la IA": de dónde salió cada dato que completó el enriquecimiento
 * automático (súper que matcheó, si aportó portada/texto de nutrición/ingredientes,
 * o si tuvo que leer una foto de etiqueta). Se muestra debajo de las fotos del
 * usuario en los pasos "Básico" y "Composición" del wizard.
 *
 * `null` = el producto no pasó por enriquecimiento IA (se cargó a mano, o solo tiene
 * lo que subió el usuario). No es un error: no se muestra nada.
 */
import type { EnrichmentSourceSummary } from '../../services/validation.service';

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
};

function storeLabel(store: string): string {
  return STORE_LABELS[store] ?? store;
}

interface AiSourcesInfoProps {
  sources: EnrichmentSourceSummary[] | null | undefined;
  /** true = va debajo de otro contenido en la misma card (separador arriba). */
  bordered?: boolean;
}

export function AiSourcesInfo({ sources, bordered }: AiSourcesInfoProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={`vw-ai-sources ${bordered ? 'vw-ai-sources--bordered' : ''}`}>
      <h4 className="vw-ai-sources-title">🤖 Información de la IA</h4>
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
