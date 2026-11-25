/**
 * Columna "Validado" de ingredientes y variantes: el chip "Validado" / "Sin validar", que es el botón
 * para validar o desvalidar. Quién y cuándo van en la columna de al lado ("Validado por", ValidatedBy).
 *
 * Los dos chips tienen el mismo ancho y la columna va alineada a la izquierda, así arrancan y terminan
 * en el mismo lugar en todas las filas.
 */
import { Tooltip } from '../../../components/ui';
import { validatedByText } from '../../../utils/validatedBy';
import './ValidationStatus.css';

interface ValidationStatusProps {
  isValidated: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function ValidationStatus({ isValidated, loading, disabled, onClick }: ValidationStatusProps) {
  const action = isValidated ? 'Clic para marcar sin validar' : 'Clic para validar';
  return (
    <Tooltip content={action}>
      <button
        type="button"
        className={`badge badge-clickable validation-chip ${isValidated ? 'validated-yes' : 'validated-no'}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${isValidated ? 'Validado' : 'Sin validar'}. ${action}`}
        aria-busy={loading || undefined}
      >
        {loading ? <span className="badge-loading">⏳</span> : isValidated ? 'Validado' : 'Sin validar'}
      </button>
    </Tooltip>
  );
}

interface ValidatedByProps {
  isValidated: boolean;
  email?: string | null;
  at?: string | null;
}

/**
 * Columna "Validado por": usuario (la parte del email antes de la @) y, debajo, la fecha. Del mismo alto
 * que el chip, así las filas validadas y sin validar miden lo mismo. Email completo y hora en el tooltip.
 */
export function ValidatedBy({ isValidated, email, at }: ValidatedByProps) {
  if (!isValidated) return <span className="validated-by-empty">—</span>;

  const date = at ? new Date(at) : null;
  const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-UY') : null;
  const full = validatedByText(email, at);
  if (!email && !when) {
    return (
      <Tooltip content={full}>
        <span className="validated-by-empty">Sin registro</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={full}>
      <span className="validated-by" tabIndex={0}>
        <span className="validated-by-who">{email ? email.split('@')[0] : 'Sin registro'}</span>
        {when && <span className="validated-by-when">{when}</span>}
      </span>
    </Tooltip>
  );
}
