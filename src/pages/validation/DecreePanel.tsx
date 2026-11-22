/**
 * Panel "Decreto 34/021" del paso Más info: hace la cuenta del rotulado frontal uruguayo con la tabla,
 * la porción y los ingredientes, y la compara con los octógonos marcados. Solo sugiere: los botones
 * marcan/desmarcan, la persona decide (y si el envase trae el octógono, gana el envase).
 */
import { useMemo } from 'react';
import { checkDecree, type DecreeFinding, type DecreeKey } from './decreeCheck';
import type { ValidationDetail } from '../../services/validation.service';

const STATUS: Record<DecreeFinding['status'], { text: string; cls: string }> = {
  exceso: { text: 'Corresponde', cls: 'dc-exceso' },
  probable: { text: 'Probable', cls: 'dc-probable' },
  ok: { text: 'No corresponde', cls: 'dc-ok' },
  unknown: { text: 'No se puede saber', cls: 'dc-unknown' },
};

export function DecreePanel(props: {
  detail: ValidationDetail;
  name: string;
  servingSizeAmount: string;
  servingSizeUnit: string;
  values: Record<DecreeKey, boolean>;
  onSet: (key: DecreeKey, v: boolean) => void;
}) {
  const { detail, name, servingSizeAmount, servingSizeUnit, values, onSet } = props;
  const result = useMemo(() => checkDecree({
    ingredients: [...detail.ingredients]
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((i) => `${i.variantName} | ${i.ingredientName}`),
    nutrition: detail.nutrition.map((n) => ({ name: n.name, value: n.value, unit: n.unit })),
    servingSizeAmount: servingSizeAmount ? Number(servingSizeAmount.replace(',', '.')) : null,
    servingSizeUnit: servingSizeUnit || null,
    productName: name,
  }), [detail, name, servingSizeAmount, servingSizeUnit]);

  // Portadas que publican súper/marca (guardadas en label_sources): primero las que coinciden por EAN.
  const fronts = (detail.product.labelSources?.sources ?? [])
    .filter((s) => s.coverUrl)
    .map((s) => ({ url: s.coverUrl as string, store: s.store, name: s.name, byEan: !!s.matchedByEan }))
    // Primero las seguras (mismo código de barras); las "solo por nombre" pueden ser otro producto.
    .sort((a, b) => Number(b.byEan) - Number(a.byEan));

  // Diferencias claras (la cuenta no deja dudas) y dudosas (probable vs no marcado).
  const sure = result.findings.filter((f) => (f.status === 'exceso' && !values[f.key]) || (f.status === 'ok' && values[f.key]));
  const doubtful = result.findings.filter((f) => f.status === 'probable' && !values[f.key]);

  return (
    <div className="dc-panel">
      <div className="dc-head">
        <strong>📜 Chequeo del decreto 34/021 (MSP)</strong>
        <span className="dc-sub">
          {result.liquid == null ? 'Falta la porción' : `Por ${result.liquid ? '100 ml (líquido)' : '100 g (sólido)'}`}
          {' · '}
          {sure.length === 0 && doubtful.length === 0 ? '✅ coincide con lo marcado' : `⚠️ ${sure.length + doubtful.length} para revisar`}
        </span>
        {sure.length > 0 && (
          <button type="button" className="dc-apply" onClick={() => sure.forEach((f) => onSet(f.key, f.status === 'exceso'))}>
            Aplicar lo seguro ({sure.length})
          </button>
        )}
      </div>
      <ul className="dc-list">
        {result.findings.map((f) => {
          const marked = values[f.key];
          const mismatch = (f.status === 'exceso' && !marked) || (f.status === 'ok' && marked) || (f.status === 'probable' && !marked);
          return (
            <li key={f.key} className={mismatch ? 'dc-row dc-mismatch' : 'dc-row'}>
              <div className="dc-row-top">
                <span className="dc-label">{f.label}</span>
                <span className={`dc-chip ${STATUS[f.status].cls}`}>{STATUS[f.status].text}</span>
                <span className="dc-marked">{marked ? 'marcado ✓' : 'sin marcar'}</span>
                {mismatch && f.status !== 'unknown' && (
                  <button type="button" className="dc-btn" onClick={() => onSet(f.key, f.status !== 'ok')}>
                    {f.status === 'ok' ? 'Desmarcar' : 'Marcar'}
                  </button>
                )}
              </div>
              <div className="dc-detail">{f.detail}</div>
            </li>
          );
        })}
      </ul>
      {fronts.length > 0 && (
        <div className="dc-fronts">
          <div className="dc-fronts-title">Frentes publicados (súper y marca): mirá si traen octógonos</div>
          <div className="dc-fronts-row">
            {fronts.map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="dc-front" title={f.name ?? f.store}>
                <img src={f.url} alt={f.store} loading="lazy" />
                <span>{f.store}{f.byEan ? ' · mismo código' : ' · por nombre'}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {result.notes.map((n) => <div key={n} className="dc-note">ℹ️ {n}</div>)}
      <div className="dc-foot">
        Solo va el octógono del nutriente que se agregó (sal, azúcar, grasas) y cuando supera el límite. Si el frente del envase trae el octógono, gana el envase.
      </div>
    </div>
  );
}
