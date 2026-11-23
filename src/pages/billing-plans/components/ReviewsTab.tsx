import { useState } from 'react';
import { DataTable, FilterButtonGroup, NotificationBanner } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { BillingPlan, ChargeReview, UpgradeReview } from '../types';
import { formatDate } from './accessFormat';
import { planNames } from './couponFormat';
import { formatPrice } from './PlanTable';
import { ResolveReviewModal, type ReviewToResolve } from './ResolveReviewModal';

interface ReviewsTabProps {
  plans: BillingPlan[];
  upgrades: UpgradeReview[];
  charges: ChargeReview[];
  loading: boolean;
  error: string;
  resolveUpgrade: (upgradeId: string, note: string | null) => Promise<void>;
  resolveCharge: (subscriptionId: string, note: string | null) => Promise<void>;
}

type View = 'upgrades' | 'charges';

const who = (email: string | null) => email ?? 'titular sin email';

/**
 * Pestaña "Revisiones" de Planes: cobros que el backend marcó para que una persona los mire (nunca se
 * resuelven solos con plata). Los dos casos van por separado, uno a la vez; cada fila trae la referencia
 * con la que se busca el cobro en Mercado Pago.
 */
export function ReviewsTab({ plans, upgrades, charges, loading, error, resolveUpgrade, resolveCharge }: ReviewsTabProps) {
  const [chosen, setChosen] = useState<View | null>(null);
  const [resolving, setResolving] = useState<ReviewToResolve | null>(null);
  const [success, setSuccess] = useState('');
  // Hasta que se elija, abre en el caso que tiene algo para revisar.
  const view: View = chosen ?? (upgrades.length === 0 && charges.length > 0 ? 'charges' : 'upgrades');

  const upgradeColumns: DataTableColumn<UpgradeReview>[] = [
    { key: 'owner', header: 'Nutricionista', render: (r) => who(r.ownerEmail) },
    {
      key: 'change',
      header: 'Suba',
      render: (r) => (
        <div className="plan-cell">
          <span className="plan-name">
            {planNames([r.fromPlanCode], plans)} → {r.toPlanName}
          </span>
          <span className="plan-code">{r.amount > 0 ? `Cobro de ${formatPrice(r.amount, r.currency)}` : 'Sin cobro aparte'}</span>
        </div>
      ),
    },
    { key: 'reason', header: 'Motivo', render: (r) => <span className="review-reason">{r.reason}</span> },
    {
      key: 'reference',
      header: 'En Mercado Pago',
      hideOnMobile: true,
      render: (r) => (
        <div className="plan-cell">
          <span className="plan-code">Referencia {r.externalReference}</span>
          {r.providerOrderId && <span className="plan-code">Orden {r.providerOrderId}</span>}
          {r.providerPaymentId && <span className="plan-code">Pago {r.providerPaymentId}</span>}
        </div>
      ),
    },
    { key: 'since', header: 'Desde', render: (r) => formatDate(r.flaggedAt) },
  ];

  const chargeColumns: DataTableColumn<ChargeReview>[] = [
    { key: 'owner', header: 'Nutricionista', render: (r) => who(r.ownerEmail) },
    { key: 'plan', header: 'Plan', render: (r) => r.planName },
    {
      key: 'charges',
      header: 'Cobros sin devolver',
      render: (r) => (
        <div className="plan-cell">
          {r.charges.length === 0
            ? 'Sin detalle'
            : r.charges.map((c) => (
                <span key={c.id} className="plan-code">
                  {c.amount !== null && c.currency ? formatPrice(c.amount, c.currency) : 'Monto sin dato'}
                  {c.date ? ` · ${formatDate(c.date)}` : ''} · pago {c.id}
                </span>
              ))}
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'En Mercado Pago',
      hideOnMobile: true,
      render: (r) => <span className="plan-code">Referencia {r.externalReference}</span>,
    },
    { key: 'since', header: 'Desde', render: (r) => (r.flaggedAt ? formatDate(r.flaggedAt) : '—') },
  ];

  const closeButton = (review: ReviewToResolve) => (
    <button className="action-btn history-btn" onClick={() => setResolving(review)}>
      Cerrar
    </button>
  );

  return (
    <>
      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />

      <div className="review-switch">
        <FilterButtonGroup
          value={view}
          onChange={(v) => setChosen(v as View)}
          options={[
            { value: 'upgrades', label: `Subas de plan (${upgrades.length})` },
            { value: 'charges', label: `Cobrado sin plan (${charges.length})` },
          ]}
        />
      </div>

      {view === 'upgrades' ? (
        <>
          <p className="plan-note review-intro">
            El cobro de una suba salió distinto de lo esperado (se devolvió, se cobró otro monto, quedó sin resultado o la suscripción
            cambió mientras se cobraba). La suscripción sigue en el plan mayor: si corresponde volver al anterior o devolver la
            diferencia, se hace a mano.
          </p>
          <DataTable<UpgradeReview>
            columns={upgradeColumns}
            data={upgrades}
            loading={loading}
            loadingMessage="Cargando revisiones..."
            emptyIcon="✅"
            emptyMessage="No hay subas para revisar"
            emptyDescription="Cuando el cobro de una suba salga distinto de lo esperado, aparece acá."
            keyExtractor={(r) => r.upgradeId}
            className="plan-table-container"
            actionsHeader="Acciones"
            renderActions={(r) =>
              closeButton({
                summary: `suba de ${planNames([r.fromPlanCode], plans)} a ${r.toPlanName} de ${who(r.ownerEmail)}`,
                resolve: (note) => resolveUpgrade(r.upgradeId, note),
              })
            }
          />
        </>
      ) : (
        <>
          <p className="plan-note review-intro">
            Mercado Pago cobró una suscripción que nunca se activó: pagó y no tiene el plan. No hay devolución automática: devolvé el
            dinero desde Mercado Pago. Si Mercado Pago lo devuelve solo, la revisión se cierra sola.
          </p>
          <DataTable<ChargeReview>
            columns={chargeColumns}
            data={charges}
            loading={loading}
            loadingMessage="Cargando revisiones..."
            emptyIcon="✅"
            emptyMessage="No hay cobros sin plan"
            emptyDescription="Si Mercado Pago cobra una suscripción que nunca se activó, aparece acá."
            keyExtractor={(r) => r.subscriptionId}
            className="plan-table-container"
            actionsHeader="Acciones"
            renderActions={(r) =>
              closeButton({
                summary: `cobro sin plan (${r.planName}) de ${who(r.ownerEmail)}`,
                resolve: (note) => resolveCharge(r.subscriptionId, note),
              })
            }
          />
        </>
      )}

      <ResolveReviewModal
        review={resolving}
        onClose={() => setResolving(null)}
        onResolved={(message) => {
          setResolving(null);
          setSuccess(message);
        }}
      />
    </>
  );
}
