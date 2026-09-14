/**
 * Componente de Tabla de Ingredientes
 */
import { useMemo } from 'react';
import { DataTable, ColumnFilter } from '../../../components/ui';
import type { DataTableColumn, DataTableSort, ColumnFilterOption } from '../../../components/ui';
import type { Ingredient } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { 
  RISK_LABELS, 
  RISK_COLORS,
} from '../types';

interface IngredientTableProps {
  ingredients: Ingredient[];
  loading: boolean;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
  filterInspected: string;
  onFilterInspectedChange: (value: string) => void;
  filterRisk: string;
  onFilterRiskChange: (value: string) => void;
  filterReason: string;
  onFilterReasonChange: (value: string) => void;
}

const INSPECTED_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados' },
  { value: 'NOT_VALIDATED', label: 'Sin validar' },
];

const REASON_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'WITH_REASON', label: 'Con justificación' },
  { value: 'WITHOUT_REASON', label: 'Sin justificación' },
];

const RISK_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  ...Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })),
];

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

export function IngredientTable({
  ingredients,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId,
  sort,
  onSortChange,
  filterInspected,
  onFilterInspectedChange,
  filterRisk,
  onFilterRiskChange,
  filterReason,
  onFilterReasonChange,
}: IngredientTableProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 8) return '#388E3C';
    if (score >= 5) return '#FBC02D';
    if (score >= 3) return '#F57C00';
    return '#D32F2F';
  };

  const columns = useMemo<DataTableColumn<Ingredient>[]>(() => [
    {
      key: 'name',
      header: 'Nombre',
      render: (ingredient) => (
        <span className="td-name">{ingredient.name}</span>
      ),
    },
    {
      key: 'toxicityLevel',
      header: 'Nivel de Riesgo',
      align: 'center',
      width: '190px',
      headerAction: (
        <ColumnFilter
          value={filterRisk}
          options={RISK_OPTIONS}
          onChange={onFilterRiskChange}
          title="Filtrar por nivel de riesgo"
        />
      ),
      render: (ingredient) => {
        const riskKey = (ingredient.toxicityLevel || 'NONE') as keyof typeof RISK_LABELS;
        return (
          <span 
            className={`badge badge-risk badge-risk-${riskKey}`}
            style={{ 
              backgroundColor: `${RISK_COLORS[riskKey] || '#999'}20`,
              color: RISK_COLORS[riskKey] || '#999',
              borderColor: RISK_COLORS[riskKey] || '#999'
            }}
          >
            {RISK_LABELS[riskKey] || ingredient.toxicityLevel || 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'score',
      header: 'Puntuación',
      hideOnMobile: true,
      align: 'center',
      width: '140px',
      render: (ingredient) => (
        <span 
          className="score-badge"
          style={{ 
            backgroundColor: `${getScoreColor(ingredient.score)}20`,
            color: getScoreColor(ingredient.score),
            borderColor: getScoreColor(ingredient.score)
          }}
        >
          {ingredient.score}/10
        </span>
      ),
    },
    {
      key: 'isNutritive',
      header: 'Nutritivo',
      hideOnMobile: true,
      align: 'center',
      width: '130px',
      render: (ingredient) => (
        <span className={`badge ${ingredient.isNutritive ? 'validated-yes' : 'validated-no'}`}>
          {ingredient.isNutritive ? '✓ Sí' : '✗ No'}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Justificación',
      hideOnMobile: true,
      align: 'center',
      width: '175px',
      headerAction: (
        <ColumnFilter
          value={filterReason}
          options={REASON_OPTIONS}
          onChange={onFilterReasonChange}
          title="Filtrar por justificación"
        />
      ),
      render: (ingredient) => ingredient.reason ? (
        <span 
          className="score-badge" 
          title={ingredient.reason}
          style={{ 
            backgroundColor: '#C8E6C9',
            color: '#388E3C',
            borderColor: '#388E3C',
            cursor: 'help'
          }}
        >
          📝 Sí
        </span>
      ) : (
        <span 
          className="score-badge"
          title="Sin justificación"
          style={{ 
            backgroundColor: '#F5F5F5',
            color: '#9E9E9E',
            borderColor: '#BDBDBD',
            cursor: 'default'
          }}
        >
          —
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      width: '150px',
      render: (ingredient) => (
        <span title={ingredient.createdAt ? new Date(ingredient.createdAt).toLocaleString('es-UY') : ''}>
          {formatDate(ingredient.createdAt)}
        </span>
      ),
    },
    {
      key: 'isInspected',
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
      render: (ingredient) => {
        const isValidated = ingredient.isInspected === true;
        return (
          <button
            className={`badge badge-clickable ${isValidated ? 'validated-yes' : 'validated-no'}`}
            onClick={() => onValidationChange(ingredient.id, isValidated)}
            disabled={validatingId !== null}
            title={isValidated ? 'Click para marcar como sin validar' : 'Click para validar'}
          >
            {validatingId === ingredient.id ? (
              <span className="badge-loading">⏳</span>
            ) : (
              <>
                {isValidated ? 'Validado' : 'Sin validar'}
              </>
            )}
          </button>
        );
      },
    },
  ], [
    onValidationChange, validatingId,
    filterInspected, onFilterInspectedChange,
    filterRisk, onFilterRiskChange,
    filterReason, onFilterReasonChange,
  ]);

  return (
    <DataTable<Ingredient>
      columns={columns}
      data={ingredients}
      loading={loading}
      loadingMessage="Cargando ingredientes..."
      emptyMessage="No se encontraron ingredientes"
      keyExtractor={(ingredient) => ingredient.id}
      actionsAlign="center"
      // 150px: con menos, el encabezado "ACCIONES" no entra y se recorta.
      actionsWidth="150px"
      fixedLayout
      sort={sort}
      onSortChange={onSortChange}
      renderActions={(ingredient) => (
        <>
          <button 
            className="action-btn edit-btn"
            onClick={() => onEdit(ingredient)}
            title="Editar"
          >
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button 
            className="action-btn delete-btn"
            onClick={() => onDelete(ingredient.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </>
      )}
    />
  );
}
