/**
 * Ultraprocesado en el asistente (2026-11-28): lo deciden los ATRIBUTOS de los ingredientes ("Ultraprocesado (NOVA 4)" y
 * "Ultraprocesado leve (NOVA 4)", tipo "Procesamiento (NOVA)"), los mismos que usan el puntaje y la meta. El tilde del
 * producto es solo un RESPALDO: cuenta cuando la lista no muestra nada y tiene un ingrediente compuesto que puede esconder
 * aditivos ("pan rallado", "condimento preparado"). Para cambiar lo que dice la lista, se editan los atributos del ingrediente.
 */
import type { ValidationIngredient } from '../../services/validation.service';

export const NOVA_STRONG_ATTRIBUTE = 'Ultraprocesado (NOVA 4)';
export const NOVA_SOFT_ATTRIBUTE = 'Ultraprocesado leve (NOVA 4)';

interface Props {
  ingredients: ValidationIngredient[];
  value: boolean;
  onSet: (v: boolean) => void;
}

const has = (i: ValidationIngredient, name: string) => (i.autoAttributes ?? []).some((a) => a.attributeName === name);
const short = (n: string) => n.replace(/\s*\(.*$/, '').replace(/\s+-\s+ins.*$/i, '').trim();
const list = (xs: ValidationIngredient[]) =>
  xs.slice(0, 4).map((i) => short(i.variantName || i.ingredientName)).join(', ') + (xs.length > 4 ? ` y ${xs.length - 4} más` : '');

export function NovaPanel({ ingredients, value, onSet }: Props) {
  const strong = ingredients.filter((i) => has(i, NOVA_STRONG_ATTRIBUTE));
  const soft = ingredients.filter((i) => !has(i, NOVA_STRONG_ATTRIBUTE) && has(i, NOVA_SOFT_ATTRIBUTE));

  let tone: 'ok' | 'warn' | 'info' = 'ok';
  let text: string;
  let action: { label: string; v: boolean } | null = null;

  if (ingredients.length === 0) {
    tone = 'info';
    text = 'Sin ingredientes cargados: solo cuenta el tilde. Cargá los ingredientes para que lo decidan sus atributos.';
  } else if (strong.length) {
    text = `Ultraprocesado por sus ingredientes: ${list(strong)}. Lo deciden los atributos; el tilde no hace falta.`;
    if (value) { action = { label: 'Destildar (no hace falta)', v: false }; tone = 'info'; }
  } else if (soft.length) {
    tone = 'info';
    text = `Ultraprocesado leve: ${list(soft)} (aditivos de textura, conservación o color natural). Resta poco en el puntaje y la meta da un aviso.`;
  } else if (value) {
    tone = 'warn';
    text = 'Ningún ingrediente tiene el atributo de ultraprocesado. El tilde solo cuenta como respaldo si la lista tiene un ingrediente compuesto que puede esconder aditivos (ej. "pan rallado", "condimento preparado"). Si la lista está completa y no hay nada, destildalo.';
    action = { label: 'Destildar', v: false };
  } else {
    text = 'Ningún ingrediente tiene el atributo de ultraprocesado. Si la etiqueta tiene un ingrediente compuesto que esconde aditivos, marcá el tilde como respaldo.';
  }

  return (
    <div className={`nova-panel nova-${tone}`}>
      <strong>Ultraprocesado (por atributos):</strong> <span>{text}</span>
      <div className="form-hint">Para corregirlo, editá el atributo del ingrediente (tipo "Procesamiento (NOVA)").</div>
      {action && (
        <button type="button" className="nova-btn" onClick={() => onSet(action!.v)}>{action.label}</button>
      )}
    </div>
  );
}
