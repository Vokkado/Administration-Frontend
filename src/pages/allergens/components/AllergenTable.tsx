/**
 * Componente de Tabla de Alérgenos
 */
import { useMemo } from 'react';
import type { Allergen } from '../types';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface AllergenTableProps {
  allergens: Allergen[];
  loading: boolean;
  onEdit: (allergen: Allergen) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
}

export function AllergenTable({
  allergens,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId
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
      key: 'validated',
      header: 'Validado',
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
  ], [onValidationChange, validatingId]);

  const renderActions = (allergen: Allergen) => (
    <>
      <button
        className="action-btn edit-btn"
        onClick={() => onEdit(allergen)}
        title="Editar"
      >
        <img src={editIcon} alt="Editar" className="icon-img" />
      </button>
      <button
        className="action-btn delete-btn"
        onClick={() => onDelete(allergen.id)}
        title="Eliminar"
      >
        <img src={deleteIcon} alt="Eliminar" className="icon-img" />
      </button>
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
      className="allergen-table-container"
    />
  );
}
