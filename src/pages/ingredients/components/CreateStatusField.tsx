/**
 * Campo "Estado" del alta de ingrediente / variante: con qué estado nace.
 *
 * Por defecto nace sin validar (mismo nombre que en la tabla y su filtro). Elegir "Validado" lo da por revisado y queda a nombre de quien lo
 * crea. Son dos opciones excluyentes (radio), no una casilla suelta en el pie del modal.
 */
import { useId } from 'react';
import './CreateStatusField.css';

interface CreateStatusFieldProps {
  validated: boolean;
  onChange: (validated: boolean) => void;
  /** "ingrediente" o "variante", para el texto de ayuda. */
  noun: 'ingrediente' | 'variante';
  disabled?: boolean;
}

export function CreateStatusField({ validated, onChange, noun, disabled = false }: CreateStatusFieldProps) {
  const name = useId();
  const it = noun === 'variante' ? 'la' : 'lo';

  const options = [
    { value: false, tone: 'pending', label: 'Sin validar' },
    { value: true, tone: 'validated', label: noun === 'variante' ? 'Validada' : 'Validado' },
  ] as const;

  return (
    <fieldset className="csf" disabled={disabled}>
      <legend className="csf-legend">Estado</legend>
      <div className="csf-options">
        {options.map((o) => (
          <label key={o.label} className={`csf-option csf-option--${o.tone}${validated === o.value ? ' is-on' : ''}`}>
            <input
              type="radio"
              name={name}
              className="csf-input"
              checked={validated === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="csf-dot" aria-hidden="true" />
            {o.label}
          </label>
        ))}
      </div>
      <p className="csf-hint">
        {validated
          ? `Ya revisaste sus datos: ${it} creás validad${noun === 'variante' ? 'a' : 'o'} y queda a tu nombre.`
          : `Queda en la lista de pendientes hasta que alguien ${it} revise.`}
      </p>
    </fieldset>
  );
}
