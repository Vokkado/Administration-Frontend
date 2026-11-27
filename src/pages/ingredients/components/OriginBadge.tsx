/**
 * De dónde salió un ingrediente o variante y si alguien lo aprobó, para mostrarlo al BUSCARLO
 * (buscadores del wizard de validación y del alta de variantes): así se elige sabiendo si lo que
 * se vincula ya está revisado o lo inventó la IA.
 *
 *   IA · sin validar   (rojo)    lo creó la IA al cargar un producto y nadie lo revisó
 *   IA · aprobado, sin validar (ámbar) lo creó la IA y está en un producto que una persona validó: la
 *                                 etiqueta lo respalda, pero nadie le cargó restricciones ni atributos
 *   IA · validado      (verde)   lo creó la IA y una persona ya lo validó
 *   Manual · validado  (verde)   lo cargó una persona y está aprobado
 *   Manual · sin validar (ámbar) cargado por una persona (o la carga inicial) pero nunca revisado
 */
import './OriginBadge.css';

/** `approved`: está en al menos un producto validado (aprobado por personas aunque no esté validado). */
export function originLabel(createdByAi: boolean | undefined, inspected: boolean, approved?: boolean): { text: string; tone: 'red' | 'green' | 'amber' } {
  const origin = createdByAi ? 'IA' : 'Manual';
  if (!inspected && createdByAi && approved) return { text: 'IA · aprobado, sin validar', tone: 'amber' };
  if (!inspected) return { text: `${origin} · sin validar`, tone: createdByAi ? 'red' : 'amber' };
  return { text: `${origin} · validado`, tone: 'green' };
}

export function OriginBadge({ createdByAi, inspected, approved, prefix }: {
  createdByAi?: boolean;
  inspected: boolean;
  /** Está en al menos un producto validado. */
  approved?: boolean;
  /** Para distinguir de qué es el badge cuando hay dos ("ingrediente: …"). */
  prefix?: string;
}) {
  const { text, tone } = originLabel(createdByAi, inspected, approved);
  return (
    <span className={`origin-badge is-${tone}`} title={prefix ? `${prefix} ${text}` : text}>
      {prefix && <span className="origin-badge-prefix">{prefix}</span>}
      {text}
    </span>
  );
}
