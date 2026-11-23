import { useState } from 'react';
import { DataTable, NotificationBanner } from '../../../components/ui';
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

const who = (email: string | null) => email ?? 'titular sin email';

/**
 * Pestaña "Revisiones" de Planes: cobros que el backend marcó para que una persona los mire (nunca se
 * resuelven solos con plata). Cada fila trae la referencia con la que se busca el cobro en Mercado Pago.
 */
export function ReviewsTab({ plans, upgrades, charges, loading, error, resolveUpgrade, resolveCharge }: ReviewsTabProps) {
  const [resolving, setResolving] = useState<ReviewToResolve | null>(null);
  const [success, setSuccess] = useState('');

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
      header: 'Para buscarlo en Mercado Pago',
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
      header: 'Para buscarlo en Mercado Pago',
      hideOnMobile: true,
      render: (r) => <span className="plan-code">Referencia {r.externalReference}</span>,
    },
    { key: 'since', header: 'Desde', render: (r) => (r.flaggedAt ? formatDate(r.flaggedAt) : '—') },
  ];

  return (
    <>
      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />

      <section className="review-section">
        <h3 className="review-title">Subas de plan</h3>
        <p className="plan-note">
          El cobro de una suba salió distinto de lo esperado: se devolvió, se cobró otro monto, quedó sin resultado o la suscripción cambió
          mientras se cobraba. La suscripción sigue en el plan mayor; si corresponde volver al anterior o devolver la diferencia, se hace a
          mano.
        </p>
        <DataTable<UpgradeReview>
          columns={upgradeColumns}
          data={upgrades}
          loading={loading}
          loadingMessage="Cargando revisiones..."
          emptyMessage="No hay subas para revisar"
          keyExtractor={(r) => r.upgradeId}
          className="plan-table-container"
          actionsHeader="Acciones"
          renderActions={(r) => (
            <button
              className="action-btn history-btn"
              onClick={() =>
                setResolving({
                  summary: `suba de ${planNames([r.fromPlanCode], plans)} a ${r.toPlanName} de ${who(r.ownerEmail)}`,
                  resolve: (note) => resolveUpgrade(r.upgradeId, note),
                })
              }
            >
              Cerrar
            </button>
          )}
        />
      </section>

      <section className="review-section">
        <h3 className="review-title">Cobrado sin plan</h3>
        <p className="plan-note">
          Mercado Pago cobró una suscripción que nunca se activó: pagó y no tiene el plan. No hay devolución automática: devolvé el dinero
          desde Mercado Pago. Si Mercado Pago lo devuelve solo, la revisión se cierra sola.
        </p>
        <DataTable<ChargeReview>
          columns={chargeColumns}
          data={charges}
          loading={loading}
          loadingMessage="Cargando revisiones..."
          emptyMessage="No hay cobros sin plan"
          keyExtractor={(r) => r.subscriptionId}
          className="plan-table-container"
          actionsHeader="Acciones"
          renderActions={(r) => (
            <button
              className="action-btn history-btn"
              onClick={() =>
                setResolving({
                  summary: `cobro sin plan (${r.planName}) de ${who(r.ownerEmail)}`,
                  resolve: (note) => resolveCharge(r.subscriptionId, note),
                })
              }
            >
              Cerrar
            </button>
          )}
        />
      </section>

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
