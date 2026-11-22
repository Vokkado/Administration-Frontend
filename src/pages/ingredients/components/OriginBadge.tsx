/**
 * De dónde salió un ingrediente o variante y si alguien lo aprobó, para mostrarlo al BUSCARLO
 * (buscadores del wizard de validación y del alta de variantes): así se elige sabiendo si lo que
 * se vincula ya está revisado o lo inventó la IA.
 *
 *   IA · sin validar   (rojo)    lo creó la IA al cargar un producto y nadie lo revisó
 *   IA · validado      (verde)   lo creó la IA y una persona ya lo aprobó
 *   Manual · validado  (verde)   lo cargó una persona y está aprobado
 *   Manual · sin validar (ámbar) cargado por una persona (o la carga inicial) pero nunca revisado
 */
import './OriginBadge.css';

export function originLabel(createdByAi: boolean | undefined, inspected: boolean): { text: string; tone: 'red' | 'green' | 'amber' } {
  const origin = createdByAi ? 'IA' : 'Manual';
  if (!inspected) return { text: `${origin} · sin validar`, tone: createdByAi ? 'red' : 'amber' };
  return { text: `${origin} · validado`, tone: 'green' };
}

export function OriginBadge({ createdByAi, inspected, prefix }: {
  createdByAi?: boolean;
  inspected: boolean;
  /** Para distinguir de qué es el badge cuando hay dos ("ingrediente: …"). */
  prefix?: string;
}) {
  const { text, tone } = originLabel(createdByAi, inspected);
  return (
    <span className={`origin-badge is-${tone}`} title={prefix ? `${prefix} ${text}` : text}>
      {prefix && <span className="origin-badge-prefix">{prefix}</span>}
      {text}
    </span>
  );
}
