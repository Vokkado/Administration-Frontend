/**
 * Componente de Tabla de Restricciones
 */
import type { Restriction } from '../types';
import type { DataTableColumn } from '../../../components/ui';
import { DataTable } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { RESTRICTION_TYPE_LABELS, MODE_LABELS, INGREDIENT_CATEGORY_LABELS } from '../types';
import type { IngredientCategory } from '../types';

interface RestrictionTableProps {
  restrictions: Restriction[];
  loading: boolean;
  onEdit: (restriction: Restriction) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
}

export function RestrictionTable({
  restrictions,
  loading,
  onEdit,
  onDelete,
  onToggleActive
}: RestrictionTableProps) {
  const columns: DataTableColumn<Restriction>[] = [
    {
      key: 'name',
      header: 'Nombre',
      width: '21%',
      render: (restriction) => <span className="td-name">{restriction.name}</span>,
    },
    {
      key: 'description',
      header: 'Descripción',
      width: '22%',
      hideOnMobile: true,
      render: (restriction) => (
        <span className="td-description">{restriction.description || '-'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '11%',
      render: (restriction) => (
        <span className={`badge badge-${restriction.type.toLowerCase()}`}>
          {RESTRICTION_TYPE_LABELS[restriction.type]}
        </span>
      ),
    },
    {
      key: 'mode',
      header: 'Modo',
      width: '10%',
      render: (restriction) => (
        <span className={`badge badge-mode-${restriction.mode.toLowerCase()}`}>
          {MODE_LABELS[restriction.mode]}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      width: '13%',
      hideOnMobile: true,
      render: (restriction) =>
        restriction.category
          ? INGREDIENT_CATEGORY_LABELS[restriction.category as IngredientCategory] || restriction.category
          : '-',
    },
    {
      key: 'isAbsolute',
      header: 'Absoluta',
      width: '8%',
      hideOnMobile: true,
      render: (restriction) =>
        restriction.isAbsolute ? (
          <span className="badge badge-validated">Sí</span>
        ) : (
          <span className="badge badge-pending">No</span>
        ),
    },
    {
      key: 'active',
      header: 'Estado',
      width: '7%',
      render: (restriction) => (
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={restriction.active}
            onChange={() => onToggleActive(restriction.id, restriction.active)}
          />
          <span className="toggle-slider"></span>
        </label>
      ),
    },
  ];

  return (
    <DataTable<Restriction>
      columns={columns}
      data={restrictions}
      className="restriction-table-container"
      loading={loading}
      loadingMessage="Cargando restricciones..."
      emptyMessage="No se encontraron restricciones"
      keyExtractor={(restriction) => restriction.id}
      rowClassName={(restriction) => (!restriction.active ? 'row-inactive' : '')}
      renderActions={(restriction) => (
        <>
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(restriction)}
            title="Editar"
          >
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(restriction.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </>
      )}
    />
  );
}
