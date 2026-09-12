/**
 * Componente DataTable genérico
 * Tabla reutilizable con soporte responsive, loading, empty state y acciones personalizadas.
 */
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import './DataTable.css';

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  width?: string;
  /** Alineación de la columna (encabezado y celdas). Por defecto, izquierda. */
  align?: DataTableAlign;
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
  rowClassName?: (item: T) => string;
  className?: string;
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
  rowClassName,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  if (data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />;
  }

  const hasActions = !!renderActions;

  return (
    <div className={`dt-wrapper${className ? ` ${className}` : ''}`}>
      <table className="dt-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cellClass(col.hideOnMobile && 'dt-hide-mobile', alignClass(col.align))}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
            {hasActions && <th className={cellClass(alignClass(actionsAlign))}>{actionsHeader}</th>}
          </tr>
        </thead>
        <tbody>
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
                <td className={cellClass('dt-actions', alignClass(actionsAlign))}>{renderActions!(item)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
