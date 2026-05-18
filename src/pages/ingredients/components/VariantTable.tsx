/**
 * Componente de Tabla de Variantes de Ingrediente
 * Usa el componente genérico DataTable para renderizar la tabla.
 */
import { useMemo } from 'react';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { IngredientVariant } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

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
}

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
        key: 'validated',
        header: 'Validado',
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
    [getIngredientName, getAttributeName, onValidationChange, validatingId],
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
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(variant.id)}
          title="Eliminar variante"
        >
          <img src={deleteIcon} alt="Eliminar" className="icon-img" />
        </button>
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
      renderActions={renderActions}
      className="ingredient-table-container"
    />
  );
}
