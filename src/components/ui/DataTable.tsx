/**
 * Componente DataTable genérico
 * Tabla reutilizable con soporte responsive, loading, empty state y acciones personalizadas.
 */
import { useRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { useColumnWidths } from './useColumnWidths';
import './DataTable.css';

export type DataTableAlign = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  /** `key` de la columna por la que se ordena. */
  key: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  width?: string;
  /** Alineación de la columna (encabezado y celdas). Por defecto, izquierda. */
  align?: DataTableAlign;
  /**
   * Hace clickeable el encabezado para ordenar por esta columna. El ordenamiento lo
   * resuelve quien usa la tabla (normalmente el backend): acá solo se emite el cambio.
   */
  sortable?: boolean;
  /**
   * Control extra al lado del título (por ejemplo, un filtro). Va FUERA del botón de
   * ordenar: anidar botones es HTML inválido y rompe el click.
   */
  headerAction?: React.ReactNode;
  /**
   * Permite ajustar el ancho arrastrando el borde derecho del encabezado (doble clic lo
   * restablece). Solo con `fixedLayout`; se recuerda por tabla si hay `widthsStorageKey`.
   */
  resizable?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  keyExtractor?: (item: T) => string;
  renderActions?: (item: T) => React.ReactNode;
  actionsHeader?: string;
  /** Alineación de la columna de acciones. Por defecto, izquierda. */
  actionsAlign?: DataTableAlign;
  /** Ancho de la columna de acciones (necesario con `fixedLayout`). */
  actionsWidth?: string;
  rowClassName?: (item: T) => string;
  className?: string;
  /**
   * Anchos de columna fijos (`table-layout: fixed`) en vez de calculados por contenido.
   * Las columnas dejan de moverse al cambiar de página o al cargar, y habilita mostrar
   * esqueletos en la primera carga sin que después salte nada. Requiere dar `width` a las
   * columnas angostas; las que no lo declaren se reparten el espacio sobrante en partes iguales.
   */
  fixedLayout?: boolean;
  /** Orden actual, para pintar la flecha en el encabezado correspondiente. */
  sort?: DataTableSort;
  /** Se llama al clickear un encabezado sortable. Sin esto, ninguna columna ordena. */
  onSortChange?: (sort: DataTableSort) => void;
  /** Clave para recordar los anchos ajustados por el usuario (columnas `resizable`). */
  widthsStorageKey?: string;
}

/** Filas fantasma de la primera carga (solo con anchos fijos). */
const SKELETON_ROWS = [0, 1, 2, 3, 4];

/** Ancho mínimo de una columna sin `width` (o con `width` en %) cuando la tabla usa anchos fijos. */
const FLEX_COLUMN_MIN_PX = 200;

/**
 * Con `table-layout: fixed` las columnas sin `width` se quedan con el sobrante, y en pantallas
 * angostas ese sobrante llega a cero y el texto pisa a la columna vecina. Se fija un ancho
 * mínimo para que la tabla haga scroll horizontal en vez de aplastar columnas.
 */
function fixedMinWidth(widths: Array<string | undefined>): string | undefined {
  let total = 0;
  for (const width of widths) {
    if (!width || width.endsWith('%')) total += FLEX_COLUMN_MIN_PX;
    else if (width.endsWith('px')) total += parseFloat(width);
    else return undefined;
  }
  return `${total}px`;
}

/** En celular las columnas `hideOnMobile` no se dibujan: no tienen que sumar al mínimo. */
function fixedMinWidthVars<T>(columns: DataTableColumn<T>[], actionsWidth: string | undefined | null) {
  const actions = actionsWidth === null ? [] : [actionsWidth];
  return {
    '--dt-min-width': fixedMinWidth([...columns.map((c) => c.width), ...actions]),
    '--dt-min-width-mobile': fixedMinWidth([...columns.filter((c) => !c.hideOnMobile).map((c) => c.width), ...actions]),
  } as React.CSSProperties;
}

const MIN_RESIZABLE_PX = 120;
const MAX_RESIZABLE_PX = 900;
const RESIZE_KEYBOARD_STEP_PX = 16;

const pxOf = (width?: string) => (width?.endsWith('px') ? parseFloat(width) : null);

/**
 * La tabla siempre ocupa todo el ancho: lo que sobra se reparte entre las columnas en
 * proporción a su ancho declarado. Para que el borde quede donde se soltó, se calcula el
 * ancho declarado que, después de ese reparto, da `target` píxeles en pantalla.
 */
function declaredWidthFor(target: number, othersPx: number, tablePx: number): number {
  if (target + othersPx >= tablePx) return target;
  return (target * othersPx) / (tablePx - target);
}

interface ResizeHandleProps {
  label: string;
  onResize: (renderedPx: number) => void;
  onCommit: () => void;
  onReset: () => void;
}

function ResizeHandle({ label, onResize, onCommit, onReset }: ResizeHandleProps) {
  const currentWidth = (el: HTMLElement) => el.parentElement!.getBoundingClientRect().width;

  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startWidth = currentWidth(handle);
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura el arrastre igual funciona mientras el puntero siga sobre el borde.
    }
    document.body.classList.add('dt-resizing');

    const move = (ev: PointerEvent) => onResize(startWidth + ev.clientX - startX);
    const end = (ev: PointerEvent) => {
      if (ev.clientX !== startX) move(ev);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      document.body.classList.remove('dt-resizing');
      onCommit();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    const step = e.key === 'ArrowRight' ? RESIZE_KEYBOARD_STEP_PX : e.key === 'ArrowLeft' ? -RESIZE_KEYBOARD_STEP_PX : 0;
    if (!step) return;
    e.preventDefault();
    onResize(currentWidth(e.currentTarget) + step);
    onCommit();
  };

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Ajustar el ancho de la columna ${label}`}
      tabIndex={0}
      className="dt-resize-handle"
      title="Arrastrá para ajustar el ancho. Doble clic para restablecerlo."
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={onReset}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

const alignClass = (align?: DataTableAlign) => (align && align !== 'left' ? `dt-align-${align}` : '');
const cellClass = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ') || undefined;

export function DataTable<T>({
  columns,
  data,
  loading = false,
  loadingMessage = 'Cargando...',
  emptyMessage = 'No se encontraron resultados',
  emptyIcon,
  keyExtractor = (item: any) => item.id,
  renderActions,
  actionsHeader = 'Acciones',
  actionsAlign,
  actionsWidth,
  rowClassName,
  className,
  sort,
  onSortChange,
  fixedLayout = false,
  widthsStorageKey,
}: DataTableProps<T>) {
  const { widths: customWidths, resize, reset, persist } = useColumnWidths(widthsStorageKey);
  const tableRef = useRef<HTMLTableElement>(null);

  // Primera carga sin anchos fijos: los anchos los define el contenido, así que dibujar
  // encabezados con filas fantasma haría que las columnas se corran al llegar los datos.
  // Con `fixedLayout` eso no pasa y se muestran esqueletos.
  if (loading && data.length === 0 && !fixedLayout) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  // Vacío de verdad (ya cargó y no hay nada).
  if (!loading && data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />;
  }

  const hasActions = !!renderActions;
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const canResize = (col: DataTableColumn<T>) => fixedLayout && !!col.resizable;
  const widthOf = (col: DataTableColumn<T>) =>
    canResize(col) && customWidths[col.key] ? `${customWidths[col.key]}px` : col.width;
  const sizedColumns = columns.map((col) => ({ ...col, width: widthOf(col) }));

  const resizeColumn = (col: DataTableColumn<T>, renderedPx: number) => {
    const table = tableRef.current;
    if (!table) return;
    const headers = Array.from(table.tHead!.rows[0].cells);
    const tablePx = table.parentElement!.clientWidth;
    let othersPx = 0;
    headers.forEach((th, i) => {
      if (i === columns.indexOf(col) || th.offsetWidth === 0) return;
      const declared = i < columns.length ? pxOf(sizedColumns[i].width) : pxOf(actionsWidth);
      othersPx += declared ?? th.offsetWidth;
    });
    const target = Math.min(Math.max(renderedPx, MIN_RESIZABLE_PX), MAX_RESIZABLE_PX);
    resize(col.key, declaredWidthFor(target, othersPx, tablePx));
  };
  const showSkeleton = loading && data.length === 0;

  return (
    <div className={`dt-wrapper${className ? ` ${className}` : ''}${loading ? ' is-loading' : ''}`}>
      <table
        ref={tableRef}
        className={`dt-table${fixedLayout ? ' dt-fixed' : ''}`}
        style={fixedLayout ? fixedMinWidthVars(sizedColumns, hasActions ? actionsWidth : null) : undefined}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = !!col.sortable && !!onSortChange;
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={cellClass(
                    col.hideOnMobile && 'dt-hide-mobile',
                    alignClass(col.align),
                    isSortable && 'dt-sortable',
                    canResize(col) && 'dt-resizable',
                  )}
                  style={widthOf(col) ? { width: widthOf(col) } : undefined}
                  aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="dt-th-content">
                    {isSortable ? (
                      <button
                        type="button"
                        className="dt-sort-btn"
                        // Clickear la columna activa invierte; una nueva columna arranca ascendente.
                        onClick={() =>
                          onSortChange!({
                            key: col.key,
                            direction: active && sort!.direction === 'asc' ? 'desc' : 'asc',
                          })
                        }
                      >
                        {col.header}
                        <span className={`dt-sort-arrow${active ? ' is-active' : ''}`}>
                          {active ? (sort!.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                    {col.headerAction}
                  </span>
                  {canResize(col) && (
                    <ResizeHandle
                      label={col.header}
                      onResize={(px) => resizeColumn(col, px)}
                      onCommit={persist}
                      onReset={() => reset(col.key)}
                    />
                  )}
                </th>
              );
            })}
            {hasActions && (
              <th
                className={cellClass(alignClass(actionsAlign))}
                style={actionsWidth ? { width: actionsWidth } : undefined}
              >
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>
        <tbody aria-busy={loading || undefined} aria-label={loading ? loadingMessage : undefined}>
          {showSkeleton && SKELETON_ROWS.map((row) => (
            <tr key={row} className="dt-skeleton-row">
              {Array.from({ length: columnCount }, (_, i) => (
                <td key={i}><span className="dt-skeleton-bar" /></td>
              ))}
            </tr>
          ))}
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={rowClassName?.(item) || undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cellClass(col.hideOnMobile && 'dt-hide-mobile', alignClass(col.align))}
                >
                  {col.render(item)}
                </td>
              ))}
              {hasActions && (
                // La celda queda como table-cell (centrada vertical); el flex va en el div interno:
                // un <td> con display:flex se sale del layout de tabla y los botones suben al tope.
                <td className={cellClass('dt-actions-cell', alignClass(actionsAlign))}>
                  <div className="dt-actions">{renderActions!(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
