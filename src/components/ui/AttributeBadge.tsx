/**
 * AttributeBadge - Etiqueta de un atributo automático (Metas, Embarazo…) en una variante.
 *
 * Son los atributos que hacen que una variante cuente para una meta ("Metas > Sodio") o avise en el
 * embarazo ("Embarazo > Carne cruda o curada"). El tooltip dice quién lo usa (lo arma quien la usa,
 * con useGoalsAdminView().describeAttribute).
 */
import { Tooltip } from './Tooltip';
import './AttributeBadge.css';

interface AttributeBadgeProps {
  label: string;
  /** Texto del tooltip (ej. "Lo usan: Reducir el sodio, Embarazo."). */
  hint?: React.ReactNode;
  /**
   * default   → confirmado.
   * pending   → lo puso la IA y nadie lo validó todavía (borde punteado).
   * suggested → sugerido, todavía no guardado.
   */
  tone?: 'default' | 'pending' | 'suggested';
  /** Texto chico al final (ej. "IA, sin validar", "por el nombre"). */
  note?: string;
  size?: 'small' | 'regular';
}

export function AttributeBadge({ label, hint, tone = 'default', note, size = 'regular' }: AttributeBadgeProps) {
  const badge = (
    <span className={`attr-badge attr-badge-${tone} attr-badge-${size}`} tabIndex={hint ? 0 : undefined}>
      <span className="attr-badge-dot" aria-hidden />
      {label}
      {note && <span className="attr-badge-note">· {note}</span>}
    </span>
  );
  return hint ? <Tooltip content={hint}>{badge}</Tooltip> : badge;
}
