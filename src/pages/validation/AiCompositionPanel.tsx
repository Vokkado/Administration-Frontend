/**
 * "✨ Completar con IA (Beta)" del paso Composición.
 *
 * Encadena 3 pedidos cortos al backend (la Lambda corta a los 30 s):
 *   1. fuentes (fotos del usuario + súper/marca, sin IA) · 2. leer la etiqueta · 3. elegir del catálogo.
 * Muestra una PROPUESTA comparada con lo que hay; nada se guarda hasta que la persona tilda y aplica.
 * Los ingredientes que no existen en el catálogo NO se crean solos: quedan como "crear a mano".
 */
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { ValidationService, type AiProposal, type ValidationDetail } from '../../services/validation.service';

type Step = 'idle' | 'sources' | 'orient' | 'extract' | 'map' | 'apply';
const STEP_LABEL: Record<Step, string> = {
  idle: '', sources: 'Buscando fotos y textos de la etiqueta…', orient: 'Enderezando las fotos giradas…', extract: 'Leyendo la etiqueta…',
  map: 'Buscando cada ingrediente en el catálogo…', apply: 'Aplicando lo elegido…',
};

const chip = (bg: string, color: string): React.CSSProperties => ({ fontSize: 11, padding: '1px 7px', borderRadius: 8, background: bg, color, whiteSpace: 'nowrap' });
const STATUS_CHIP: Record<string, React.CSSProperties> = {
  igual: chip('#ecfdf5', '#047857'), nuevo: chip('#eff6ff', '#1d4ed8'), cambia: chip('#fffbeb', '#b45309'),
  crear: chip('#fef2f2', '#b91c1c'), revisar: chip('#fffbeb', '#b45309'), 'falta en catálogo': chip('#fef2f2', '#b91c1c'), quitar: chip('#fef2f2', '#b91c1c'),
};
const CONF_COLOR = { alta: '#047857', media: '#b45309', baja: '#b91c1c' } as const;
const fmt = (v: number | null) => (v == null ? '—' : String(v).replace('.', ','));

export function AiCompositionPanel({ productId, detail, busy, setBusy, onChanged }: {
  productId: string; detail: ValidationDetail; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void;
}) {
  const saved = detail.product.aiCompositionDraft;
  const [proposal, setProposal] = useState<AiProposal | null>(saved?.proposal ?? null);
  const [usage, setUsage] = useState(saved?.usage ?? []);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!!saved?.proposal);
  // Lo tildado. Claves: ing:<i>, ingdel:<variantId>, al:<id>, aldel:<id>, nut:<i>, nutdel:<id>
  const [checked, setChecked] = useState<Set<string>>(() => defaults(saved?.proposal ?? null));

  const run = async () => {
    setError(null); setOpen(true);
    try {
      setStep('sources'); await ValidationService.aiSources(productId);
      setStep('orient'); await ValidationService.aiOrient(productId);
      setStep('extract'); await ValidationService.aiExtract(productId);
      setStep('map'); const p = await ValidationService.aiMap(productId);
      setProposal(p); setChecked(defaults(p));
      const d = await ValidationService.getDetail(productId);
      setUsage(d.product.aiCompositionDraft?.usage ?? []);
      onChanged(); // refresca "Información de la IA" con las fotos y textos nuevos
    } catch (e) {
      setError(apiMessage(e) || 'La IA no respondió a tiempo. Probá de nuevo en un rato.');
    } finally { setStep('idle'); }
  };

  const toggle = (k: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const apply = async () => {
    if (!proposal) return;
    setBusy(true); setStep('apply'); setError(null);
    try {
      // Ingredientes: quitar los tildados, agregar los nuevos tildados y ordenar como la etiqueta.
      for (const r of proposal.removeIngredients) if (checked.has(`ingdel:${r.variantId}`)) await ValidationService.removeIngredient(productId, r.variantId);
      for (const [i, ing] of proposal.ingredients.entries()) {
        if (ing.variantId && ing.status === 'nuevo' && checked.has(`ing:${i}`)) await ValidationService.addIngredient(productId, ing.variantId);
      }
      const fresh = await ValidationService.getDetail(productId);
      const linked = fresh.ingredients.map((x) => x.variantId);
      const labelOrder = proposal.ingredients.map((x) => x.variantId).filter((v): v is string => !!v && linked.includes(v));
      const order = [...labelOrder, ...linked.filter((v) => !labelOrder.includes(v))];
      if (checked.has('order') && order.join() !== linked.join()) await ValidationService.reorderIngredients(productId, order);
      // Alérgenos.
      for (const a of proposal.allergens) if (a.status !== 'igual' && checked.has(`al:${a.allergenId}`)) await ValidationService.addAllergen(productId, a.allergenId, a.presence);
      for (const a of proposal.removeAllergens) if (checked.has(`aldel:${a.allergenId}`)) await ValidationService.removeAllergen(productId, a.allergenId);
      // Tabla.
      for (const [i, n] of proposal.nutrition.entries()) {
        if (n.nutritionFactId && n.value != null && (n.status === 'nuevo' || n.status === 'cambia') && checked.has(`nut:${i}`)) {
          await ValidationService.upsertNutrition(productId, n.nutritionFactId, n.value, n.unit);
        }
      }
      for (const n of proposal.removeNutrition) if (checked.has(`nutdel:${n.nutritionFactId}`)) await ValidationService.removeNutrition(productId, n.nutritionFactId);
      setChecked(new Set());
      onChanged();
    } catch (e) {
      setError(apiMessage(e) || 'No se pudo aplicar todo. Recargá y revisá la lista.');
      onChanged();
    } finally { setBusy(false); setStep('idle'); }
  };

  // ¿El orden de la etiqueta difiere del cargado? (solo entre los que ya están vinculados)
  const orderDiffers = useMemo(() => {
    if (!proposal) return false;
    const linked = detail.ingredients.map((x) => x.variantId);
    const label = proposal.ingredients.map((x) => x.variantId).filter((v): v is string => !!v && linked.includes(v));
    return label.join() !== linked.filter((v) => label.includes(v)).join();
  }, [proposal, detail.ingredients]);
  const pending = useMemo(() => (proposal ? countApplicable(proposal, checked) + (orderDiffers && checked.has('order') ? 1 : 0) : 0), [proposal, checked, orderDiffers]);
  const cost = usage.reduce((a, u) => ({ p: a.p + u.promptTokens, c: a.c + u.completionTokens, ms: a.ms + u.ms }), { p: 0, c: 0, ms: 0 });
  const working = step !== 'idle';

  return (
    <div className="vp-sugg" style={{ marginBottom: 16, borderColor: '#c4b5fd', background: '#faf5ff' }}>
      <div className="vp-sugg-head">
        <p className="vp-sugg-note">
          <strong>✨ Completar con IA</strong> <span style={chip('#ede9fe', '#6d28d9')}>Beta</span>{' '}
          Lee la etiqueta (fotos del usuario, sitio de la marca y súper) y propone ingredientes en orden, alérgenos declarados y la tabla.
          No guarda nada: tildá lo que está bien y aplicalo.
        </p>
        <Button variant="outline" onClick={run} loading={working && step !== 'apply'} disabled={busy || working}>
          {proposal ? '↻ Volver a analizar' : '✨ Completar con IA'}
        </Button>
      </div>
      {working && <div className="vp-sugg-note">⏳ {STEP_LABEL[step]}</div>}
      {error && <div className="vp-sugg-note" role="alert" style={{ color: 'var(--color-error)' }}>{error}</div>}

      {proposal && (
        <>
          <button type="button" className="vw-ai-fetch-btn" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setOpen(!open)}>
            {open ? 'Ocultar propuesta' : 'Ver propuesta'}
          </button>
          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <div className="vp-sugg-note">
                Fuente: {proposal.sourceUsed || '—'}
                {!proposal.labelReadable && <strong style={{ color: '#b91c1c' }}> · No se pudo leer la etiqueta en ninguna fuente: no aprobar sin conseguirla.</strong>}
              </div>

              {proposal.doubts.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
                  <strong style={{ fontSize: 13 }}>Dudas para revisar</strong>
                  <ul style={{ margin: '4px 0 0 18px', fontSize: 13 }}>{proposal.doubts.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}

              <Block title={`Ingredientes (${proposal.ingredients.length}) — en el orden de la etiqueta`}>
                {proposal.ingredients.map((ing, i) => (
                  <Row key={i}
                    check={ing.status === 'nuevo' ? { on: checked.has(`ing:${i}`), toggle: () => toggle(`ing:${i}`) } : null}
                    status={ing.status}
                    main={<><span style={{ color: '#6b7280' }}>{i + 1}.</span> “{ing.labelText}” → {ing.variantName
                      ? <strong>{ing.variantName}</strong>
                      : <em>crear a mano: “{ing.newVariant}”</em>}
                      {ing.variantId && !ing.validated && <span style={chip('#fef2f2', '#b91c1c')} title="Variante o ingrediente sin validar">sin validar</span>}</>}
                    sub={<><span style={{ color: CONF_COLOR[ing.confidence] }}>confianza {ing.confidence}</span>{ing.reason ? ` · ${ing.reason}` : ''}</>}
                  />
                ))}
                {orderDiffers && (
                  <Row check={{ on: checked.has('order'), toggle: () => toggle('order') }} status="cambia"
                    main={<>Ordenar los ingredientes como la etiqueta</>} />
                )}
                {proposal.removeIngredients.map((r) => (
                  <Row key={r.variantId} check={{ on: checked.has(`ingdel:${r.variantId}`), toggle: () => toggle(`ingdel:${r.variantId}`) }}
                    status="revisar" main={<>No lo encontró en la etiqueta: <strong>{r.variantName}</strong></>}
                    sub="Ni la lectura ni la segunda mirada lo vieron. Tildalo solo si de verdad no está en la etiqueta: se quita del producto." />
                ))}
              </Block>

              <Block title="Alérgenos declarados">
                {proposal.allergens.length === 0 && proposal.removeAllergens.length === 0 && <span className="vp-sugg-note">La etiqueta no declara alérgenos.</span>}
                {proposal.allergens.map((a) => (
                  <Row key={a.allergenId} status={a.status}
                    check={a.status !== 'igual' ? { on: checked.has(`al:${a.allergenId}`), toggle: () => toggle(`al:${a.allergenId}`) } : null}
                    main={<>{a.presence === 'MAY_CONTAIN' ? 'Puede contener' : 'Contiene'}: <strong>{a.name}</strong></>} />
                ))}
                {proposal.removeAllergens.map((a) => (
                  <Row key={a.allergenId} status="quitar" check={{ on: checked.has(`aldel:${a.allergenId}`), toggle: () => toggle(`aldel:${a.allergenId}`) }}
                    main={<>Quitar <strong>{a.name}</strong> (la etiqueta no lo declara)</>} />
                ))}
              </Block>

              <Block title={`Tabla nutricional${proposal.portion.basis ? ` (por ${proposal.portion.basis})` : ''}`}>
                <div className="vp-sugg-note">
                  Porción de la etiqueta: {proposal.portion.amount != null ? `${fmt(proposal.portion.amount)} ${proposal.portion.unit ?? ''}` : '—'}
                  {' · '}cargada: {proposal.portion.current.amount != null ? `${fmt(proposal.portion.current.amount)} ${proposal.portion.current.unit ?? ''}` : '—'}
                  {proposal.portion.amount != null && proposal.portion.amount !== proposal.portion.current.amount && <strong style={{ color: '#b45309' }}> · corregila en “Más info”</strong>}
                </div>
                {proposal.nutrition.map((n, i) => (
                  <Row key={i} status={n.status}
                    check={n.nutritionFactId && (n.status === 'nuevo' || n.status === 'cambia') ? { on: checked.has(`nut:${i}`), toggle: () => toggle(`nut:${i}`) } : null}
                    main={<><strong>{n.name}</strong>: {fmt(n.value)} {n.unit ?? ''}{n.status === 'cambia' && n.current ? <span style={{ color: '#6b7280' }}> (antes {fmt(n.current.value)} {n.current.unit ?? ''})</span> : null}</>}
                    sub={n.suspect ? <span style={{ color: '#b91c1c' }}>⚠ {n.suspect}</span> : n.unitWarning ? <span style={{ color: '#b45309' }}>{n.unitWarning}</span> : n.status === 'falta en catálogo' ? 'No existe ese nutriente: crealo en Nutrientes si corresponde.' : undefined} />
                ))}
                {proposal.removeNutrition.map((n) => (
                  <Row key={n.nutritionFactId} status="quitar" check={{ on: checked.has(`nutdel:${n.nutritionFactId}`), toggle: () => toggle(`nutdel:${n.nutritionFactId}`) }}
                    main={<>Quitar <strong>{n.name}</strong> (no es una fila de la tabla)</>} />
                ))}
              </Block>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={apply} disabled={busy || working || pending === 0}>
                  Aplicar {pending} {pending === 1 ? 'cambio' : 'cambios'}
                </Button>
                {usage.length > 0 && (
                  <span className="vp-sugg-note" title="Tokens de la última corrida (lectura + catálogo)">
                    {Math.round(cost.ms / 100) / 10} s de IA · {cost.p.toLocaleString('es-UY')} tokens de entrada + {cost.c.toLocaleString('es-UY')} de salida · {usage[0]?.model}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function Row({ check, status, main, sub }: {
  check: { on: boolean; toggle: () => void } | null; status: string; main: React.ReactNode; sub?: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, background: '#fff', border: '1px solid #ede9fe', borderRadius: 8, padding: '6px 10px', cursor: check ? 'pointer' : 'default' }}>
      <span style={{ width: 16, flexShrink: 0, paddingTop: 1 }}>{check ? <input type="checkbox" checked={check.on} onChange={check.toggle} /> : null}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{main}</span>
        {sub && <span style={{ display: 'block', color: '#6b7280', fontSize: 12, marginTop: 2 }}>{sub}</span>}
      </span>
      <span style={STATUS_CHIP[status] ?? chip('#f3f4f6', '#374151')}>{status}</span>
    </label>
  );
}

/** Por defecto se tilda lo nuevo/cambiado con buena confianza y las bajas; lo dudoso queda sin tildar. */
function defaults(p: AiProposal | null): Set<string> {
  const s = new Set<string>(['order']);
  if (!p) return s;
  p.ingredients.forEach((ing, i) => { if (ing.status === 'nuevo' && ing.confidence !== 'baja') s.add(`ing:${i}`); });
  p.allergens.forEach((a) => { if (a.status !== 'igual') s.add(`al:${a.allergenId}`); });
  p.removeAllergens.forEach((a) => s.add(`aldel:${a.allergenId}`));
  p.nutrition.forEach((n, i) => { if (n.nutritionFactId && !n.unitWarning && !n.suspect && (n.status === 'nuevo' || n.status === 'cambia')) s.add(`nut:${i}`); });
  p.removeNutrition.forEach((n) => s.add(`nutdel:${n.nutritionFactId}`));
  return s;
}

function countApplicable(p: AiProposal, checked: Set<string>): number {
  let n = 0;
  p.ingredients.forEach((ing, i) => { if (ing.status === 'nuevo' && ing.variantId && checked.has(`ing:${i}`)) n++; });
  p.removeIngredients.forEach((r) => { if (checked.has(`ingdel:${r.variantId}`)) n++; });
  p.allergens.forEach((a) => { if (a.status !== 'igual' && checked.has(`al:${a.allergenId}`)) n++; });
  p.removeAllergens.forEach((a) => { if (checked.has(`aldel:${a.allergenId}`)) n++; });
  p.nutrition.forEach((x, i) => { if (x.nutritionFactId && (x.status === 'nuevo' || x.status === 'cambia') && checked.has(`nut:${i}`)) n++; });
  p.removeNutrition.forEach((x) => { if (checked.has(`nutdel:${x.nutritionFactId}`)) n++; });
  return n;
}

/** Mensaje del backend (axios) si vino uno. */
function apiMessage(e: unknown): string | null {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === 'string' ? msg : null;
}
