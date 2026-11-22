/**
 * Puntaje NUEVO (v4) en modo sombra: se muestra al lado del actual para comparar. No se guarda ni lo ve la app.
 * Modelo: pilares (nutrición 60 % · procesamiento 25 % · aditivos 15 %) por familia de producto, con techo,
 * los mismos 5 tramos de color que la app (85/65/45/25) y confianza según la calidad de los datos. Especificación: Backend/docs/MODELO_PUNTAJE_V4.md.
 */
export interface ScoreV4Result {
  score: number | null;
  reason?: string;
  family?: string;
  pillars?: { nutrition: number; processing: number; additives: number };
  novaMarkers?: number;
  ceilingEscaped?: boolean;
  cap?: string | null;
  confidence?: 'alta' | 'media' | 'baja';
  dataIssues?: string[];
  estimates?: string[];
  version?: string;
  undeclared?: string[];
  explanation?: ScoreExplanation;
}

/** Desglose transparente (el mismo que verá la app): 100 + Σ delta = puntaje. */
export interface ScoreExplanation {
  headline: string;
  groups: Array<{ id: string; label: string; subtotal: number }>;
  steps: Array<{ id: string; group: string; label: string; detail: string | null; delta: number; estimated: boolean }>;
  good: string[];
  notices: Array<{ kind: 'undeclared' | 'estimated' | 'data' | 'info'; text: string }>;
}
const num = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + String(Math.abs(x)).replace('.', ',');

function Breakdown({ e, score }: { e: ScoreExplanation; score: number }) {
  const undeclared = e.notices.filter((n) => n.kind === 'undeclared');
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0' };
  return (
    <div style={{ marginTop: 10, fontSize: 13 }}>
      {undeclared.map((n, i) => (
        <div key={`u${i}`} role="alert" style={{ background: '#FFF3E0', border: '1px solid #FB8C00', color: '#5D4037', borderRadius: 6, padding: '6px 8px', marginBottom: 6 }}>⚠️ {n.text}</div>
      ))}
      <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>{e.headline}</p>
      <div style={{ borderTop: '1px solid #ddd', paddingTop: 6 }}>
        <div style={{ ...row, fontWeight: 600 }}><span>Punto de partida</span><span>100</span></div>
        {e.groups.map((g) => (
          <div key={g.id} style={{ marginTop: 4 }}>
            <div style={{ ...row, fontWeight: 600 }}><span>{g.label}</span><span>{num(g.subtotal)}</span></div>
            {e.steps.filter((s) => s.group === g.id).map((s) => (
              <div key={s.id} style={{ ...row, paddingLeft: 12, opacity: 0.9 }}>
                <span>{s.label}{s.detail ? <span style={{ opacity: 0.7 }}> — {s.detail}</span> : null}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{s.estimated ? '≈ ' : ''}{num(s.delta)}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ ...row, fontWeight: 700, borderTop: '1px solid #ddd', marginTop: 4, paddingTop: 6 }}><span>Puntaje final</span><span>{score}</span></div>
      </div>
      {!!e.good.length && <div style={{ marginTop: 6 }}>A favor: {e.good.join(' · ')}</div>}
      {e.notices.filter((n) => n.kind !== 'undeclared').map((n, i) => <div key={`n${i}`} style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>ⓘ {n.text}</div>)}
    </div>
  );
}

/** Mismos 5 tramos y colores que el puntaje de la app (85/65/45/25), con nombres neutros. */
function light(score: number): { color: string; label: string } {
  const s = Math.round(score);
  if (s >= 85) return { color: '#2E7D32', label: 'Muy alto' };
  if (s >= 65) return { color: '#7CB342', label: 'Alto' };
  if (s >= 45) return { color: '#F9A825', label: 'Medio' };
  if (s >= 25) return { color: '#EF6C00', label: 'Bajo' };
  return { color: '#C62828', label: 'Muy bajo' };
}

const CONFIDENCE: Record<string, { color: string; text: string }> = {
  alta: { color: '#2E7D32', text: 'Confianza alta: datos completos y coherentes' },
  media: { color: '#F9A825', text: 'Confianza media: algún dato faltante se estimó del lado conservador' },
  baja: { color: '#C62828', text: 'Confianza baja: la ficha tiene datos que se contradicen (revisarla)' },
};

const KEY_LABEL: Record<string, string> = { sugar: 'azúcares', sodium: 'sodio', sat: 'grasas saturadas', energy: 'calorías' };
const human = (s: string) => s.replace(/\b(sugar|sodium|sat|energy)\b/g, (k) => KEY_LABEL[k] ?? k);

export function ScoreV4Panel({ result }: { result: ScoreV4Result | null | undefined }) {
  if (result === undefined) return null; // backend viejo: no manda el campo
  const box: React.CSSProperties = { border: '1px dashed #9E9E9E', borderRadius: 8, padding: 12, marginTop: 16, background: 'rgba(0,0,0,0.02)' };
  const title = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <h4 style={{ margin: 0 }}>Puntaje nuevo <span style={{ fontWeight: 400, fontSize: 12 }}>(en prueba, no se publica)</span></h4>
      {result?.version && <span style={{ fontSize: 11, opacity: 0.7 }}>v{result.version}</span>}
    </div>
  );
  if (result === null) return <div style={box}>{title}<p style={{ margin: '8px 0 0' }}>No se pudo calcular.</p></div>;
  if (result.score == null) {
    return <div style={box}>{title}<p style={{ margin: '8px 0 0' }}>Sin puntaje: {result.reason}{result.family ? ` (familia: ${result.family})` : ''}.</p></div>;
  }
  const l = light(result.score);
  const conf = result.confidence ? CONFIDENCE[result.confidence] : null;
  return (
    <div style={box}>
      {title}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <div style={{ background: l.color, color: '#fff', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}
          aria-label={`Puntaje nuevo ${result.score}`}>
          {result.score}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <div><strong style={{ color: l.color }}>{l.label}</strong> · familia <strong>{result.family}</strong>{result.ceilingEscaped ? ' · salió del techo de su familia (producto limpio)' : ''}</div>
          {result.pillars && (
            <div>Nutrición <strong>{result.pillars.nutrition}</strong>/100 · Procesamiento <strong>{result.pillars.processing}</strong>/100 · Aditivos <strong>{result.pillars.additives}</strong>/100
              {result.novaMarkers ? ` · ${result.novaMarkers} marcador(es) de ultraprocesado` : ''}</div>
          )}
          {result.cap && <div>Tope aplicado: {result.cap}</div>}
          {conf && <div style={{ color: conf.color }}>{conf.text}</div>}
        </div>
      </div>
      {result.explanation && <Breakdown e={result.explanation} score={result.score} />}
      {!result.explanation && !!result.dataIssues?.length && <div style={{ fontSize: 12, marginTop: 6 }}>⚠️ Datos a revisar: {result.dataIssues.map(human).join(' · ')}</div>}
      {!result.explanation && !!result.estimates?.length && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Estimado: {result.estimates.map(human).join(' · ')}</div>}
    </div>
  );
}
