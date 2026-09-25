/**
 * Componente de Tabla de Alérgenos
 */
import { useMemo } from 'react';
import type { Allergen } from '../types';
import { DataTable, ColumnFilter } from '../../../components/ui';
import type { DataTableColumn, DataTableSort, ColumnFilterOption } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { AdminOnly } from '../../../components/routing/AdminOnly';

interface AllergenTableProps {
  allergens: Allergen[];
  loading: boolean;
  onEdit: (allergen: Allergen) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
  /** ALL | VALIDATED | NOT_VALIDATED */
  filterInspected: string;
  onFilterInspectedChange: (value: string) => void;
}

const INSPECTED_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados' },
  { value: 'NOT_VALIDATED', label: 'Sin validar' },
];

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

export function AllergenTable({
  allergens,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId,
  sort,
  onSortChange,
  filterInspected,
  onFilterInspectedChange,
}: AllergenTableProps) {
  const columns = useMemo<DataTableColumn<Allergen>[]>(() => [
    {
      key: 'name',
      header: 'Nombre',
      render: (allergen) => (
        <span className="td-name">{allergen.name}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      width: '150px',
      render: (allergen) => (
        <span title={allergen.createdAt ? new Date(allergen.createdAt).toLocaleString('es-UY') : ''}>
          {formatDate(allergen.createdAt)}
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
      render: (allergen) => {
        const isValidated = allergen.inspected === true;

        return (
          <button
            className={`badge badge-clickable ${isValidated ? 'validated-yes' : 'validated-no'}`}
            onClick={() => onValidationChange(allergen.id, isValidated)}
            disabled={validatingId !== null}
            title={isValidated ? 'Click para marcar como sin validar' : 'Click para validar'}
          >
            {validatingId === allergen.id ? (
              <span className="badge-loading">⏳</span>
            ) : (
              isValidated ? 'Validado' : 'Sin validar'
            )}
          </button>
        );
      },
    },
  ], [onValidationChange, validatingId, filterInspected, onFilterInspectedChange]);

  const renderActions = (allergen: Allergen) => (
    <>
      <button
        className="action-btn edit-btn"
        onClick={() => onEdit(allergen)}
        title="Editar"
      >
        <img src={editIcon} alt="Editar" className="icon-img" />
      </button>
      <AdminOnly>
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(allergen.id)}
          title="Eliminar"
        >
          <img src={deleteIcon} alt="Eliminar" className="icon-img" />
        </button>
      </AdminOnly>
    </>
  );

  return (
    <DataTable<Allergen>
      columns={columns}
      data={allergens}
      loading={loading}
      loadingMessage="Cargando alérgenos..."
      emptyMessage="No se encontraron alérgenos"
      renderActions={renderActions}
      actionsAlign="center"
      // 150px: con menos, el encabezado "ACCIONES" no entra y se recorta.
      actionsWidth="150px"
      fixedLayout
      sort={sort}
      onSortChange={onSortChange}
      className="allergen-table-container"
    />
  );
}
