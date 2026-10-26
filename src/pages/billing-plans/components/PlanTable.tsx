import { DataTable, StatusBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import type { BillingPlan } from '../types';

interface PlanTableProps {
  plans: BillingPlan[];
  loading: boolean;
  onEdit: (plan: BillingPlan) => void;
  onHistory: (plan: BillingPlan) => void;
}

export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return 'Gratis';
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

const columns: DataTableColumn<BillingPlan>[] = [
  {
    key: 'name',
    header: 'Plan',
    render: (plan) => (
      <div className="plan-cell">
        <span className="plan-name">{plan.name}</span>
        <code className="plan-code">{plan.code}</code>
      </div>
    ),
  },
  {
    key: 'price',
    header: 'Precio / mes',
    render: (plan) => formatPrice(plan.priceAmount, plan.currency),
  },
  {
    key: 'maxPatients',
    header: 'Pacientes activos',
    render: (plan) => (plan.maxPatients === null ? 'Sin límite' : `Hasta ${plan.maxPatients}`),
  },
  {
    key: 'visibility',
    header: 'Estado',
    render: (plan) => (
      <div className="plan-badges">
        {plan.isActive ? <StatusBadge variant="active">Activo</StatusBadge> : <StatusBadge variant="inactive">Inactivo</StatusBadge>}
        {plan.isPublic ? (
          <StatusBadge variant="info">Contratable</StatusBadge>
        ) : (
          <StatusBadge variant="pending" title="No aparece en la web: se asigna como concesión (beta, promociones)">
            Interno
          </StatusBadge>
        )}
      </div>
    ),
  },
  {
    key: 'liveSubscriptions',
    header: 'Suscripciones vigentes',
    hideOnMobile: true,
    render: (plan) => plan.liveSubscriptions,
  },
];

export function PlanTable({ plans, loading, onEdit, onHistory }: PlanTableProps) {
  return (
    <DataTable<BillingPlan>
      columns={columns}
      data={plans}
      loading={loading}
      loadingMessage="Cargando planes..."
      emptyMessage="No hay planes"
      keyExtractor={(plan) => plan.code}
      className="plan-table-container"
      actionsHeader="Acciones"
      renderActions={(plan) => (
        <>
          <button className="action-btn edit-btn" onClick={() => onEdit(plan)} title="Editar">
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button className="action-btn history-btn" onClick={() => onHistory(plan)} title="Historial de cambios">
            Historial
          </button>
        </>
      )}
    />
  );
}
