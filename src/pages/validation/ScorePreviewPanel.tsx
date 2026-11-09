/**
 * "Ver POSIBLE PUNTAJE" (paso Finalizar): calcula el puntaje con lo cargado hasta ahora, con el
 * mismo motor que usa la app, pero sin guardarlo. Sirve para ver antes de validar si el número
 * tiene sentido (si sale raro, casi siempre es un dato mal cargado: porción, unidad, una fila).
 */
import { useState } from 'react';
import { Button } from '../../components/ui';
import { ValidationService, type ScorePreview, type ScoreHighlightItem } from '../../services/validation.service';

/** Mismos cortes y colores que el ScoreBadge de la app. */
function band(score: number): { color: string; label: string } {
  if (score >= 85) return { color: '#2E7D32', label: 'Muy bueno' };
  if (score >= 65) return { color: '#7CB342', label: 'Bueno' };
  if (score >= 45) return { color: '#F9A825', label: 'Regular' };
  if (score >= 25) return { color: '#EF6C00', label: 'Malo' };
  return { color: '#C62828', label: 'Muy malo' };
}

const STEPS: { key: keyof ScorePreview['breakdown']; label: string; sign: -1 | 1 }[] = [
  { key: 'penaltyIngredientes', label: 'Ingredientes', sign: -1 },
  { key: 'penaltyToxicidad', label: 'Toxicidad de ingredientes', sign: -1 },
  { key: 'penaltyRedFlags', label: 'Ingredientes de alerta', sign: -1 },
  { key: 'nutritionNegativeImpact', label: 'Nutrientes en exceso', sign: -1 },
  { key: 'nutritionPositiveImpact', label: 'Nutrientes beneficiosos', sign: 1 },
  { key: 'penaltyUltraProcessed', label: 'Ultraprocesado', sign: -1 },
  { key: 'penaltyPobrezaNutricional', label: 'Pobreza nutricional', sign: -1 },
  { key: 'penaltyAmortiguacion', label: 'Amortiguación (lo que no se llegó a restar)', sign: 1 },
];

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-UY');
const items = (xs: ScoreHighlightItem[] | undefined) =>
  (xs ?? []).map((x) => `${x.name} ${fmt(x.valuePer100)} ${x.unit}`).join(', ');

interface Props {
  productId: string;
  /** Guarda lo que está en pantalla antes de calcular (porción, ultraprocesado, alcohol…). */
  beforeCalc: () => Promise<void>;
  isAlcoholic: boolean;
}

export function ScorePreviewPanel({ productId, beforeCalc, isAlcoholic }: Props) {
  const [data, setData] = useState<ScorePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await beforeCalc();
      setData(await ValidationService.previewScore(productId));
    } catch {
      setError('No pudimos calcular el puntaje. Revisá tu conexión e intentá de nuevo.');
    } finally { setLoading(false); }
  };

  const b = data?.score != null ? band(Math.round(data.score)) : null;
  const h = data?.highlights;

  return (
    <div className="vw-score-preview">
      <div className="vw-score-preview-head">
        <Button variant="outline" onClick={run} disabled={loading}>
          {loading ? 'Calculando…' : data ? '↻ Recalcular' : '🔢 Ver POSIBLE PUNTAJE'}
        </Button>
        <span className="vw-score-preview-note">Estimado con lo cargado ahora. No se guarda ni se publica.</span>
      </div>
      {error && <div className="vw-score-preview-error">{error}</div>}
      {data && (
        data.score == null ? (
          <p className="vw-score-preview-none">
            {isAlcoholic
              ? 'Sin puntaje: los productos con alcohol (0,5% o más) no llevan número en la app.'
              : 'Sin puntaje: faltan datos para calcularlo (ingredientes o tabla nutricional).'}
          </p>
        ) : (
          <div className="vw-score-preview-body">
            <div className="vw-score-badge" style={{ background: b!.color }} aria-label={`Puntaje ${Math.round(data.score)}`}>
              {Math.round(data.score)}
            </div>
            <div className="vw-score-preview-detail">
              <strong style={{ color: b!.color }}>{b!.label}</strong>
              <ul>
                <li>Base: 100</li>
                {STEPS.filter((s) => Math.abs(data.breakdown[s.key] as number) >= 0.05).map((s) => {
                  const v = data.breakdown[s.key] as number;
                  // penaltyIngredientes puede ser negativo (= bonus): se muestra con el signo real.
                  const signed = s.sign * v;
                  return <li key={s.key}>{s.label}: <strong>{signed > 0 ? '+' : '−'}{fmt(Math.abs(signed))}</strong></li>;
                })}
              </ul>
              {h && (h.excesses.length > 0 || h.beneficials.length > 0) && (
                <div className="vw-score-preview-hl">
                  {h.excesses.length > 0 && <div>⚠️ En exceso (por 100): {items(h.excesses)}</div>}
                  {h.beneficials.length > 0 && <div>✅ Beneficiosos (por 100): {items(h.beneficials)}</div>}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
