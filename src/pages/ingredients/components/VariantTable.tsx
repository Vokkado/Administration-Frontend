/**
 * Componente de Tabla de Variantes de Ingrediente
 * Usa el componente genérico DataTable para renderizar la tabla.
 */
import { useMemo } from 'react';
import { DataTable, ColumnFilter, AttributeBadge } from '../../../components/ui';
import type { DataTableColumn, DataTableSort, ColumnFilterOption } from '../../../components/ui';
import type { IngredientVariant } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { AdminOnly } from '../../../components/routing/AdminOnly';
import { useGoalsAdminView } from '../../../hooks/useGoalsAdminView';

interface VariantTableProps {
  variants: IngredientVariant[];
  loading: boolean;
  getIngredientName: (id: string) => string;
  getAttributeName: (id: string) => string;
  /** ¿El atributo se asigna solo (Metas, Embarazo…)? Esos se muestran resaltados. */
  isAutoAttribute: (id: string) => boolean;
  onEdit: (variant: IngredientVariant) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  onViewProducts: (variant: IngredientVariant) => void;
  validatingId: string | null;
  filterInspected: string;
  onFilterInspectedChange: (value: string) => void;
  filterAuto: string;
  onFilterAutoChange: (value: string) => void;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
}

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

const AUTO_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'WITH', label: 'Con atributos de metas / embarazo' },
  { value: 'WITHOUT', label: 'Sin atributos de metas / embarazo' },
];

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
  isAutoAttribute,
  onEdit,
  onDelete,
  onValidationChange,
  onViewProducts,
  validatingId,
  filterInspected,
  onFilterInspectedChange,
  filterAuto,
  onFilterAutoChange,
  sort,
  onSortChange,
}: VariantTableProps) {
  const { describeAttribute } = useGoalsAdminView();
  const columns = useMemo<DataTableColumn<IngredientVariant>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        width: '23%',
        resizable: true,
        render: (variant) => (
          <span className="td-name" title={variant.name}>{variant.name}</span>
        ),
      },
      {
        key: 'ingredient',
        header: 'Ingrediente',
        align: 'center',
        width: '160px',
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
        width: '200px',
        headerAction: (
          <ColumnFilter
            value={filterAuto}
            options={AUTO_OPTIONS}
            onChange={onFilterAutoChange}
            title="Filtrar por atributos de metas / embarazo"
          />
        ),
        render: (variant) => {
          const attrs = variant.attributeIds || [];
          // Los de Metas / Embarazo van resaltados; el resto, en la lista común (hasta 3).
          const auto = attrs.filter((id) => isAutoAttribute(id));
          const others = attrs.filter((id) => !isAutoAttribute(id));
          return (
            <div className="variant-attributes">
              {auto.length > 0 && (
                <span className="attr-badge-row">
                  {auto.map((id) => (
                    <AttributeBadge key={id} label={getAttributeName(id)} size="small" hint={describeAttribute(id)} />
                  ))}
                </span>
              )}
              {attrs.length === 0 && <span className="no-attributes">Sin atributos</span>}
              {others.slice(0, 3).map((attrId) => (
                <span key={attrId} className="badge badge-attribute">
                  {getAttributeName(attrId)}
                </span>
              ))}
              {others.length > 3 && (
                <span className="badge badge-more">
                  +{others.length - 3} más
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
        width: '115px',
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
        width: '140px',
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
    [
      getIngredientName,
      getAttributeName,
      isAutoAttribute,
      describeAttribute,
      onValidationChange,
      validatingId,
      filterInspected,
      onFilterInspectedChange,
      filterAuto,
      onFilterAutoChange,
    ],
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
      actionsWidth="155px"
      fixedLayout
      widthsStorageKey="ingredient-variants"
      sort={sort}
      onSortChange={onSortChange}
      renderActions={renderActions}
      className="ingredient-table-container"
    />
  );
}
