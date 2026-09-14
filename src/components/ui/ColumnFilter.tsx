/**
 * Filtro de columna: un embudo en el encabezado que abre un menú con opciones.
 * Pensado para la prop `headerAction` de las columnas del DataTable.
 *
 * El menú se renderiza en un portal a `document.body`. Adentro de la tabla quedaba sujeto
 * al `overflow` del contenedor y al contexto de posicionamiento de sus ancestros, así que
 * terminaba recortado o lejos del botón. En el body solo depende de las coordenadas que
 * se calculan al abrir.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ColumnFilter.css';

export interface ColumnFilterOption {
  value: string;
  label: string;
}

interface ColumnFilterProps {
  value: string;
  options: ColumnFilterOption[];
  onChange: (value: string) => void;
  /** Valor que representa "sin filtrar". Con cualquier otro, el embudo se marca activo. */
  neutralValue?: string;
  /** Texto del tooltip del botón. */
  title?: string;
}

/** Debe coincidir con el ancho del menú en el CSS: se usa para alinearlo con el botón. */
const MENU_WIDTH = 190;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
/** Tope de alto; con más opciones (categorías) el menú scrollea por dentro. */
const MENU_MAX_HEIGHT = 320;
/** Menos espacio que esto abajo del botón y el menú se abre hacia arriba. */
const MIN_SPACE_BELOW = 200;

export function ColumnFilter({
  value,
  options,
  onChange,
  neutralValue = 'ALL',
  title = 'Filtrar',
}: ColumnFilterProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Coordenadas de viewport calculadas al abrir. null = cerrado.
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const isOpen = position !== null;
  const isActive = value !== neutralValue;

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setPosition(null);
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    // Si se scrollea la página, las coordenadas guardadas quedan viejas y el menú se cierra.
    // El scroll DENTRO del menú se ignora: si no, scrollear la lista lo cerraría.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const toggle = () => {
    if (isOpen) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Alineado por la derecha con el botón, sin salirse de la pantalla.
    const maxLeft = document.documentElement.clientWidth - MENU_WIDTH - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - MENU_WIDTH, maxLeft));

    // Si abajo no entra, se abre hacia arriba; el alto se acota al espacio disponible.
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const openUp = spaceBelow < MIN_SPACE_BELOW && spaceAbove > spaceBelow;
    const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(120, openUp ? spaceAbove : spaceBelow));

    setPosition({
      top: openUp ? rect.top - MENU_GAP - maxHeight : rect.bottom + MENU_GAP,
      left,
      maxHeight,
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`dt-column-filter${isActive ? ' is-active' : ''}`}
        onClick={toggle}
        title={isActive ? `${title} (filtro aplicado)` : title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Con filtro puesto el embudo se rellena: se distingue del estado normal sin
            depender solo del color, que se pierde de vista en un encabezado de un tirón. */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={isActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="dt-column-filter-menu"
          role="listbox"
          style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? 'is-selected' : undefined}
              onClick={() => { onChange(option.value); setPosition(null); }}
            >
              {option.label}
              {option.value === value && <span aria-hidden>✓</span>}
            </button>
          ))}

          {/* Solo aparece con filtro puesto: sin filtro no tendría nada que limpiar. */}
          {isActive && (
            <button
              type="button"
              className="dt-column-filter-clear"
              onClick={() => { onChange(neutralValue); setPosition(null); }}
            >
              ✕ Limpiar filtro
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
