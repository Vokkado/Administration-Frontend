/**
 * Input de posición en una lista ordenable, con borrador local.
 *
 * Mientras tiene el foco muestra lo que se escribe sin tocar el orden (si cada tecla
 * reordenara, la fila se iría de la vista a mitad de tipeo). Se confirma con Enter o al
 * salir del campo; Esc descarta. Avisa el número acotado a 1..max, y solo si cambió.
 */
import { useRef, useState } from 'react';

interface PositionInputProps {
  /** Posición actual (1-based). */
  value: number;
  max: number;
  /** Para el aria-label: "Posición de <name>". */
  name: string;
  onCommit: (position: number) => void;
  disabled?: boolean;
  className?: string;
}

export function PositionInput({ value, max, name, onCommit, disabled, className }: PositionInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const handleBlur = () => {
    const raw = draft;
    setDraft(null);
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    if (raw === null || raw === '') return;
    const n = Math.min(Math.max(parseInt(raw, 10), 1), max);
    if (!Number.isNaN(n) && n !== value) onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      aria-label={`Posición de ${name}`}
      disabled={disabled}
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        if (/^\d*$/.test(e.target.value)) setDraft(e.target.value);
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelRef.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}
