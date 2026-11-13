/**
 * Sellos ARGENTINOS del envase (Ley 27.642) en el paso Más info. Aparece abierto cuando el producto ya
 * tiene sellos argentinos (los vio la IA en las fotos o los cargó alguien); si no, la persona lo abre si
 * en la foto ve octógonos "EXCESO EN …" o las leyendas de edulcorantes/cafeína.
 * Marca lo que trae el envase; la cuenta con el criterio argentino es solo una ayuda (gana el envase).
 * Los usuarios de Argentina ven estos sellos; los de Uruguay ven los octógonos uruguayos de arriba.
 */
import { useMemo } from 'react';
import { AR_SEALS, checkArgentina, type ArSeal } from './arFrontCheck';
import type { DecreeStatus } from './decreeCheck';
import type { ValidationDetail } from '../../services/validation.service';

const STATUS: Record<DecreeStatus, { text: string; cls: string }> = {
  exceso: { text: 'Corresponde', cls: 'dc-exceso' },
  probable: { text: 'Probable', cls: 'dc-probable' },
  ok: { text: 'No corresponde', cls: 'dc-ok' },
  unknown: { text: 'No se puede saber', cls: 'dc-unknown' },
};

export function ArSealsPanel(props: {
  detail: ValidationDetail;
  name: string;
  servingSizeAmount: string;
  servingSizeUnit: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  values: ArSeal[];
  onChange: (v: ArSeal[]) => void;
}) {
  const { detail, name, servingSizeAmount, servingSizeUnit, enabled, onEnabled, values, onChange } = props;
  const result = useMemo(() => checkArgentina({
    ingredients: [...detail.ingredients]
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((i) => `${i.variantName} | ${i.ingredientName}`),
    nutrition: detail.nutrition.map((n) => ({ name: n.name, value: n.value, unit: n.unit })),
    servingSizeAmount: servingSizeAmount ? Number(servingSizeAmount.replace(',', '.')) : null,
    servingSizeUnit: servingSizeUnit || null,
    productName: name,
  }), [detail, name, servingSizeAmount, servingSizeUnit]);

  const byCode = new Map(result.findings.map((f) => [f.code, f]));
  const set = (code: ArSeal, on: boolean) => {
    const next = on ? [...new Set([...values, code])] : values.filter((c) => c !== code);
    onChange(AR_SEALS.map((s) => s.code).filter((c) => next.includes(c)));
  };
  const mismatches = AR_SEALS.filter(({ code }) => {
    const f = byCode.get(code);
    const marked = values.includes(code);
    return f && ((f.status === 'exceso' && !marked) || (f.status === 'ok' && marked) || (f.status === 'probable' && !marked));
  });

  return (
    <div className="dc-panel">
      <div className="dc-head">
        <strong>🇦🇷 Sellos argentinos (Ley 27.642)</strong>
        <label className="ar-toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
          {' '}El envase trae sellos argentinos
        </label>
        {enabled && (
          <span className="dc-sub">
            {values.length} marcados · {mismatches.length === 0 ? '✅ coincide con la cuenta' : `⚠️ ${mismatches.length} para revisar`}
          </span>
        )}
      </div>
      {!enabled && (
        <div className="dc-foot">
          Abrilo solo si la foto trae octógonos "EXCESO EN …" con "Ministerio de Salud" abajo, o los rectángulos
          "CONTIENE EDULCORANTES" / "CONTIENE CAFEÍNA" (productos argentinos). Los uruguayos dicen "EXCESO …" sin "EN" y "MSP".
        </div>
      )}
      {enabled && (
        <>
          <ul className="dc-list">
            {AR_SEALS.map(({ code, label }) => {
              const f = byCode.get(code);
              const marked = values.includes(code);
              const mismatch = !!f && ((f.status === 'exceso' && !marked) || (f.status === 'ok' && marked) || (f.status === 'probable' && !marked));
              return (
                <li key={code} className={mismatch ? 'dc-row dc-mismatch' : 'dc-row'}>
                  <div className="dc-row-top">
                    <label className="dc-label">
                      <input type="checkbox" checked={marked} onChange={(e) => set(code, e.target.checked)} /> {label}
                    </label>
                    {f && <span className={`dc-chip ${STATUS[f.status].cls}`}>{STATUS[f.status].text}</span>}
                  </div>
                  {f && <div className="dc-detail">{f.detail}</div>}
                </li>
              );
            })}
          </ul>
          {result.notes.map((n) => <div key={n} className="dc-note">ℹ️ {n}</div>)}
          <div className="dc-foot">
            Marcá lo que trae el ENVASE. La cuenta usa el criterio argentino (% de las calorías, ≥): es distinto del uruguayo,
            así que puede dar sellos que en Uruguay no van. "Exceso en calorías" solo va junto con azúcares o grasas.
          </div>
        </>
      )}
    </div>
  );
}
