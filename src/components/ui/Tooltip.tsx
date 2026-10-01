/**
 * Tooltip - Globo explicativo al pasar el mouse (o enfocar con teclado) sobre un elemento.
 *
 * Reemplaza al `title` nativo cuando el texto importa: aparece enseguida, admite varias
 * líneas y se ve igual en todos los navegadores. Se renderiza en un portal para que no lo
 * recorte el `overflow` de un modal o una card.
 */
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Clase extra para el disparador (el span que envuelve a `children`). */
  className?: string;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;
/** Evita que el globo parpadee al pasar el mouse por encima de una fila de badges. */
const SHOW_DELAY_MS = 120;

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  const show = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
  };
  const hide = () => {
    window.clearTimeout(timerRef.current);
    setOpen(false);
    setPos(null);
  };

  // Se posiciona después de montar, cuando ya se conoce el tamaño real del globo:
  // arriba del disparador si entra, si no abajo, y siempre dentro del viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !bubbleRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();
    const below = t.top - GAP - b.height < VIEWPORT_MARGIN;
    const top = below ? t.bottom + GAP : t.top - GAP - b.height;
    const centered = t.left + t.width / 2 - b.width / 2;
    const left = Math.min(Math.max(centered, VIEWPORT_MARGIN), window.innerWidth - b.width - VIEWPORT_MARGIN);
    setPos({ top, left, below });
  }, [open]);

  // Con position: fixed el globo quedaría flotando en otro lado al scrollear.
  useLayoutEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [open]);

  useLayoutEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        className={`ui-tooltip-trigger ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open && createPortal(
        <div
          ref={bubbleRef}
          id={id}
          role="tooltip"
          className={`ui-tooltip ${pos?.below ? 'is-below' : ''}`}
          style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
