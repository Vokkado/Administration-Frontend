/**
 * Componente de tabla para valores nutricionales
 */
import type { Nutrition_Fact } from '../types';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

const BENEFIT_LABELS: Record<Nutrition_Fact['benefit'], string> = {
  BENEFICIAL: 'Beneficioso',
  NOT_BENEFICIAL: 'No beneficioso',
  NEUTRAL: 'Neutral',
  TOTAL_FATS: 'Grasas totales',
};

interface NutritionFactTableProps {
  nutritionFacts: Nutrition_Fact[];
  loading: boolean;
  onEdit: (nutritionFact: Nutrition_Fact) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
}

export function NutritionFactTable({
  nutritionFacts,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId,
}: NutritionFactTableProps) {
  const columns: DataTableColumn<Nutrition_Fact>[] = [
    {
      key: 'name',
      header: 'Nombre',
      width: '30%',
      render: (nf) => (
        <div className="nutrition-fact-name">
          <span className="name-text">{nf.name}</span>
        </div>
      ),
    },
    {
      key: 'baseUnit',
      header: 'Unidad Base',
      width: '12%',
      render: (nf) => <span className="badge">{nf.baseUnit || 'g'}</span>,
    },
    {
      key: 'benefit',
      header: 'Beneficioso',
      width: '12%',
      render: (nf) =>
        <div className="nutrition-fact-name">
          <span className="name-text">{BENEFIT_LABELS[nf.benefit]}</span>
        </div>
    },
    {
      key: 'createdAt',
      header: 'Fecha de Creación',
      width: '18%',
      hideOnMobile: true,
      render: (nf) => (
        <span className="date-text">
          {new Date(nf.createdAt).toLocaleDateString('es-ES')}
        </span>
      ),
    },
    {
      key: 'inspected',
      header: 'Validado',
      width: '16%',
      render: (nf) => (
        <button
          className={`badge badge-clickable ${nf.inspected ? 'validated-yes' : 'validated-no'}`}
          onClick={() => onValidationChange(nf.id, nf.inspected)}
          disabled={validatingId !== null}
          title={nf.inspected ? 'Click para marcar como sin validar' : 'Click para validar'}
        >
          {validatingId === nf.id ? (
            <span className="badge-loading">⏳</span>
          ) : (
            nf.inspected ? 'Validado' : 'Sin validar'
          )}
        </button>
      ),
    },
  ];

  return (
    <DataTable<Nutrition_Fact>
      columns={columns}
      data={nutritionFacts}
      loading={loading}
      loadingMessage="Cargando valores nutricionales..."
      emptyIcon="📊"
      emptyMessage="No se encontraron valores nutricionales"
      keyExtractor={(nf) => nf.id}
      renderActions={(nf) => (
        <div className="table-actions">
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(nf)}
            title="Editar"
          >
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(nf.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </div>
      )}
    />
  );
}
