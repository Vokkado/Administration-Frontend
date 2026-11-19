/**
 * Puntaje NUEVO (v4) en modo sombra: se muestra al lado del actual para comparar. No se guarda ni lo ve la app.
 * Modelo: pilares (nutrición 60 % · procesamiento 25 % · aditivos 15 %) por familia de producto, con techo,
 * semáforo 70/40 y confianza según la calidad de los datos. Especificación: Backend/docs/MODELO_PUNTAJE_V4.md.
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
}

/** Semáforo del modelo nuevo: verde ≥70, amarillo 40–69, rojo <40. */
function light(score: number): { color: string; label: string } {
  if (score >= 70) return { color: '#2E7D32', label: 'Verde' };
  if (score >= 40) return { color: '#F9A825', label: 'Amarillo' };
  return { color: '#C62828', label: 'Rojo' };
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
      {!!result.dataIssues?.length && <div style={{ fontSize: 12, marginTop: 6 }}>⚠️ Datos a revisar: {result.dataIssues.map(human).join(' · ')}</div>}
      {!!result.estimates?.length && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Estimado: {result.estimates.map(human).join(' · ')}</div>}
    </div>
  );
}
