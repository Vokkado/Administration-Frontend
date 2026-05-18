/**
 * Modal para mostrar el desglose del cálculo de puntaje
 */

interface ScoreBreakdown {
  scoreFinal: number | null;
  penaltyIngredientes: number;
  penaltyToxicidad: number;
  penaltyRedFlags: number;
  nutritionNegativeImpact: number;
  nutritionPositiveImpact: number;
  penaltyUltraProcessed: number;
  penaltyPobrezaNutricional: number;
  penaltyAlcohol?: number;
  penaltyAmortiguacion?: number;
}

interface ScoreCalculationResult {
  score: {
    score: number | null;
    scoreVersion: string;
    scoreCalculatedAt: string;
    highlights: any;
  };
  breakdown: ScoreBreakdown;
  logs: string[];
}

interface ScoreBreakdownModalProps {
  show: boolean;
  productName: string;
  result: ScoreCalculationResult | null;
  onClose: () => void;
}

const BREAKDOWN_ROWS = [
  { key: 'penaltyIngredientes', label: 'Paso 1 - Ingredientes & Proporción', max: 40, type: 'mixed' },
  { key: 'penaltyToxicidad', label: 'Paso 2 - Riesgo promedio', max: 15, type: 'negative' },
  { key: 'penaltyRedFlags', label: 'Paso 3 - Red flags individuales', max: 10, type: 'negative' },
  { key: 'nutritionNegativeImpact', label: 'Paso 4 - Nutrición (negativos)', max: 45, type: 'negative' },
  { key: 'nutritionPositiveImpact', label: 'Paso 4 - Nutrición (positivos)', max: 20, type: 'positive' },
  { key: 'penaltyUltraProcessed', label: 'Paso 5 - Ultra-procesado', max: 20, type: 'negative' },
  { key: 'penaltyPobrezaNutricional', label: 'Paso 6 - Pobreza nutricional', max: 15, type: 'negative' },
  { key: 'penaltyAlcohol', label: 'Paso 7 - Graduación alcohólica', max: 60, type: 'negative' },
  { key: 'penaltyAmortiguacion', label: 'Paso 8 - Amortiguación caída libre', max: 18, type: 'positive' },
] as const;

function getScoreColor(score: number | null): string {
  if (score === null) return '#9E9E9E';
  if (score >= 85) return '#388E3C';
  if (score >= 65) return '#689F38';
  if (score >= 45) return '#F9A825';
  if (score >= 25) return '#EF6C00';
  return '#D32F2F';
}

function formatValue(value: number, type: string): string {
  if (type === 'positive') return `+${value.toFixed(1)}`;
  if (type === 'mixed') {
    return value >= 0 ? `-${value.toFixed(1)}` : `+${Math.abs(value).toFixed(1)}`;
  }
  return `-${value.toFixed(1)}`;
}

/** Filled circular score badge */
function ScoreCircle({ score }: { score: number | null }) {
  const color = getScoreColor(score);

  return (
    <div className="score-circle-filled" style={{ background: color }}>
      <span className="score-circle-number">{score !== null ? score : '—'}</span>
    </div>
  );
}

export function ScoreBreakdownModal({ show, productName, result, onClose }: ScoreBreakdownModalProps) {
  if (!show || !result) return null;

  const { score, breakdown, logs } = result;
  const finalScore = breakdown.scoreFinal ?? score.score;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content score-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>Cálculo de Puntaje</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Product name + score circle */}
          <div className="score-header">
            <ScoreCircle score={finalScore} />
            <div className="score-header-info">
              <div className="score-product-name">{productName}</div>
              <div className="score-version">Score v{score.scoreVersion}</div>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="score-breakdown-section">
            <h4>Desglose</h4>
            <table className="score-breakdown-table">
              <thead>
                <tr>
                  <th>Paso</th>
                  <th>Impacto</th>
                  <th>Máximo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="score-base-row">
                  <td>Base</td>
                  <td className="score-value-positive">100</td>
                  <td></td>
                </tr>
                {BREAKDOWN_ROWS.map((row) => {
                  const value = (breakdown[row.key as keyof ScoreBreakdown] as number) ?? 0;
                  const formatted = formatValue(value, row.type);
                  const isPositive = row.type === 'positive' || (row.type === 'mixed' && value < 0);
                  return (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td className={isPositive ? 'score-value-positive' : value === 0 ? 'score-value-neutral' : 'score-value-negative'}>
                        {formatted}
                      </td>
                      <td className="score-max-col">{row.type === 'positive' ? `+${row.max}` : `-${row.max}`}</td>
                    </tr>
                  );
                })}
                <tr className="score-total-row">
                  <td><strong>Total</strong></td>
                  <td style={{ color: getScoreColor(finalScore) }}><strong>{finalScore !== null ? finalScore : '—'}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Logs */}
          <div className="score-logs-section">
            <h4>Detalle del cálculo</h4>
            <pre className="score-logs">{logs.join('\n')}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
