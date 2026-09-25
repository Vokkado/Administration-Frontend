/**
 * Componente de Tabla de Variantes de Ingrediente
 * Usa el componente genérico DataTable para renderizar la tabla.
 */
import { useMemo } from 'react';
import { DataTable, ColumnFilter } from '../../../components/ui';
import type { DataTableColumn, DataTableSort, ColumnFilterOption } from '../../../components/ui';
import type { IngredientVariant } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { AdminOnly } from '../../../components/routing/AdminOnly';

interface VariantTableProps {
  variants: IngredientVariant[];
  loading: boolean;
  getIngredientName: (id: string) => string;
  getAttributeName: (id: string) => string;
  onEdit: (variant: IngredientVariant) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  onViewProducts: (variant: IngredientVariant) => void;
  validatingId: string | null;
  filterInspected: string;
  onFilterInspectedChange: (value: string) => void;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
}

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

const INSPECTED_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados' },
  { value: 'NOT_VALIDATED', label: 'Sin validar' },
];

export function VariantTable({
  variants,
  loading,
  getIngredientName,
  getAttributeName,
  onEdit,
  onDelete,
  onValidationChange,
  onViewProducts,
  validatingId,
  filterInspected,
  onFilterInspectedChange,
  sort,
  onSortChange,
}: VariantTableProps) {
  const columns = useMemo<DataTableColumn<IngredientVariant>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (variant) => (
          <span className="td-name">{variant.name}</span>
        ),
      },
      {
        key: 'ingredient',
        header: 'Ingrediente',
        align: 'center',
        width: '200px',
        render: (variant) => (
          <span className="badge badge-type">
            {getIngredientName(variant.ingredientId)}
          </span>
        ),
      },
      {
        key: 'attributes',
        header: 'Atributos',
        hideOnMobile: true,
        align: 'center',
        width: '260px',
        render: (variant) => {
          const attrs = variant.attributeIds || [];
          return (
            <div className="variant-attributes">
              {attrs.length === 0 ? (
                <span className="no-attributes">Sin atributos</span>
              ) : (
                attrs.slice(0, 3).map((attrId) => (
                  <span key={attrId} className="badge badge-attribute">
                    {getAttributeName(attrId)}
                  </span>
                ))
              )}
              {attrs.length > 3 && (
                <span className="badge badge-more">
                  +{attrs.length - 3} más
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Creado',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        width: '150px',
        render: (variant) => (
          <span title={variant.createdAt ? new Date(variant.createdAt).toLocaleString('es-UY') : ''}>
            {formatDate(variant.createdAt)}
          </span>
        ),
      },
      {
        key: 'validated',
        header: 'Validado',
        align: 'center',
        width: '160px',
        headerAction: (
          <ColumnFilter
            value={filterInspected}
            options={INSPECTED_OPTIONS}
            onChange={onFilterInspectedChange}
            title="Filtrar por estado de validación"
          />
        ),
        render: (variant) => {
          const isValidated = variant.isInspected === true;
          return (
            <button
              className={`badge badge-clickable ${isValidated ? 'validated-yes' : 'validated-no'}`}
              onClick={() => onValidationChange(variant.id, isValidated)}
              disabled={validatingId !== null}
              title={
                isValidated
                  ? 'Clic para marcar como sin validar'
                  : 'Clic para validar'
              }
            >
              {validatingId === variant.id ? (
                <span className="badge-loading">⏳</span>
              ) : isValidated ? (
                'Validado'
              ) : (
                'Sin validar'
              )}
            </button>
          );
        },
      },
    ],
    [getIngredientName, getAttributeName, onValidationChange, validatingId, filterInspected, onFilterInspectedChange],
  );

  const renderActions = useMemo(
    () => (variant: IngredientVariant) => (
      <>
        <button
          className="action-btn view-products-btn"
          onClick={() => onViewProducts(variant)}
          title="Ver productos con esta variante"
        >
          📦
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(variant)}
          title="Editar variante"
        >
          <img src={editIcon} alt="Editar" className="icon-img" />
        </button>
        <AdminOnly>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(variant.id)}
            title="Eliminar variante"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </AdminOnly>
      </>
    ),
    [onViewProducts, onEdit, onDelete],
  );

  return (
    <DataTable<IngredientVariant>
      columns={columns}
      data={variants}
      loading={loading}
      loadingMessage="Cargando variantes..."
      emptyMessage="No se encontraron variantes de ingrediente"
      keyExtractor={(variant) => variant.id}
      actionsAlign="center"
      actionsWidth="170px"
      fixedLayout
      sort={sort}
      onSortChange={onSortChange}
      renderActions={renderActions}
      className="ingredient-table-container"
    />
  );
}
