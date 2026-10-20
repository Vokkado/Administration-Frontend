/**
 * Formato y validación de los umbrales de las metas en el admin. La validación es la misma que
 * hace el backend (rango, entero, coherencia) para avisar antes de guardar; el backend igual manda.
 */
import type { AdminGoal, GoalParamSpec, GoalParamValue, GoalUses, PerBasisValue } from '../../services/goals.service';
import { NUTRIENT_LABELS, ROLE_LABELS, SEAL_LABELS } from '../../services/goals.service';

/** Código interno para mostrar como id: reduce_sugar → REDUCE_SUGAR. */
export const displayCode = (code: string) => code.toUpperCase();

/** 0.75 → "0,75"; 500 → "500". */
export function fmtNumber(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** "500 mg (sólidos) · 200 mg (líquidos)" o "3 posiciones". */
export function formatParamValue(spec: GoalParamSpec, value: GoalParamValue): string {
  if (typeof value === 'number') return `${fmtNumber(value)} ${spec.unit}`;
  return `${fmtNumber(value.g)} ${spec.unit} /100 g · ${fmtNumber(value.ml)} ${spec.unit} /100 ml`;
}

/** Qué datos usa una meta, en palabras ("Tabla: Sodio", "Octógono de sodio", "Ingredientes: Fuentes de sodio"). */
export function describeUses(uses: GoalUses): string[] {
  return [
    ...uses.nutrients.map((n) => `Tabla: ${NUTRIENT_LABELS[n] ?? n}`),
    ...uses.seals.map((s) => SEAL_LABELS[s] ?? s),
    ...uses.roles.map((r) => `Ingredientes: ${ROLE_LABELS[r] ?? r}`),
    ...uses.product.map(() => 'Ultraprocesado (criterio NOVA 4)'),
  ];
}

// ── Formulario de umbrales ────────────────────────────────────────────────

/** Valores como texto (lo que se tipea), por clave y base. */
export type ParamDraft = Record<string, { g: string; ml: string } | string>;

export function toDraft(goal: AdminGoal): ParamDraft {
  const draft: ParamDraft = {};
  for (const spec of goal.paramSpecs) {
    const v = goal.params[spec.key] ?? spec.default;
    draft[spec.key] = typeof v === 'number' ? String(v) : { g: String(v.g), ml: String(v.ml) };
  }
  return draft;
}

const parse = (s: string): number => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

/** Draft → valores numéricos (NaN si algo no es número; lo marca validateDraft). */
export function fromDraft(specs: GoalParamSpec[], draft: ParamDraft): Record<string, GoalParamValue> {
  const out: Record<string, GoalParamValue> = {};
  for (const spec of specs) {
    const d = draft[spec.key];
    out[spec.key] = typeof d === 'string' ? parse(d) : { g: parse(d?.g ?? ''), ml: parse(d?.ml ?? '') };
  }
  return out;
}

function inRange(spec: GoalParamSpec, n: number, basis: 'g' | 'ml' | null): string | null {
  if (!Number.isFinite(n)) return 'Tiene que ser un número';
  const range = basis === 'ml' && spec.mlRange ? spec.mlRange : { min: spec.min, max: spec.max };
  if (n < range.min || n > range.max) return `Entre ${fmtNumber(range.min)} y ${fmtNumber(range.max)} ${spec.unit}`;
  if (spec.integer && !Number.isInteger(n)) return 'Tiene que ser un número entero';
  return null;
}

export interface DraftErrors {
  /** Por clave: 'g' / 'ml' / 'value' → mensaje. */
  fields: Record<string, Partial<Record<'g' | 'ml' | 'value', string>>>;
  /** Errores entre campos (coherencia). */
  general: string[];
}

export function validateDraft(goal: AdminGoal, values: Record<string, GoalParamValue>): DraftErrors {
  const errors: DraftErrors = { fields: {}, general: [] };
  for (const spec of goal.paramSpecs) {
    const v = values[spec.key];
    const field: DraftErrors['fields'][string] = {};
    if (typeof v === 'number') {
      const e = inRange(spec, v, null);
      if (e) field.value = e;
    } else {
      const eg = inRange(spec, v.g, 'g');
      const em = inRange(spec, v.ml, 'ml');
      if (eg) field.g = eg;
      if (em) field.ml = em;
    }
    if (Object.keys(field).length > 0) errors.fields[spec.key] = field;
  }
  if (Object.keys(errors.fields).length > 0) return errors;
  for (const c of goal.coherence) {
    const [a, b] = c.lessThan;
    const va = values[a];
    const vb = values[b];
    const ok =
      typeof va === 'number' && typeof vb === 'number'
        ? va < vb
        : typeof va === 'object' && typeof vb === 'object' && (va as PerBasisValue).g < (vb as PerBasisValue).g && (va as PerBasisValue).ml < (vb as PerBasisValue).ml;
    if (!ok) errors.general.push(c.message);
  }
  return errors;
}

export const hasErrors = (e: DraftErrors) => Object.keys(e.fields).length > 0 || e.general.length > 0;

/** ¿Cambió algún umbral respecto de lo guardado? */
export function paramsChanged(goal: AdminGoal, values: Record<string, GoalParamValue>): boolean {
  return goal.paramSpecs.some((spec) => {
    const before = goal.params[spec.key];
    const after = values[spec.key];
    if (typeof before === 'number' || typeof after === 'number') return before !== after;
    return before.g !== after.g || before.ml !== after.ml;
  });
}

/** "12/10/2026, 14:05". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
