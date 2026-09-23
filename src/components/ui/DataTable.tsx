/**
 * Componente DataTable genérico
 * Tabla reutilizable con soporte responsive, loading, empty state y acciones personalizadas.
 */
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
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
}

/** Filas fantasma de la primera carga (solo con anchos fijos). */
const SKELETON_ROWS = [0, 1, 2, 3, 4];

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
}: DataTableProps<T>) {
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
  const showSkeleton = loading && data.length === 0;

  return (
    <div className={`dt-wrapper${className ? ` ${className}` : ''}${loading ? ' is-loading' : ''}`}>
      <table className={`dt-table${fixedLayout ? ' dt-fixed' : ''}`}>
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
                  )}
                  style={col.width ? { width: col.width } : undefined}
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
