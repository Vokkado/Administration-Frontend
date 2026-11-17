import { useState } from 'react';
import { Button, DataTable, NotificationBanner, StatusBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { useCoupons } from '../hooks/useCoupons';
import type { BillingPlan, Coupon } from '../types';
import { formatDate } from './accessFormat';
import { CouponDetailModal } from './CouponDetailModal';
import { CouponModal } from './CouponModal';
import { couponState, couponTerms, planNames } from './couponFormat';

/** Pestaña "Cupones" de Planes: los cupones de descuento, crearlos y ver cada uno. */
export function CouponsTab({ plans }: { plans: BillingPlan[] }) {
  const { coupons, loading, error, createCoupon, updateCoupon, addCodes, fetchDetail } = useCoupons();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Coupon | null>(null);

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: 'name',
      header: 'Cupón',
      render: (c) => (
        <div className="plan-cell">
          <span className="plan-name">{c.name}</span>
          <span className="plan-code">
            {c.codeMode === 'shared' ? (c.firstCode ?? '') : `${c.codes ?? 0} códigos únicos`}
            {c.codeMode === 'shared' && c.maxRedemptions === 1 ? ' · un solo uso' : ''}
          </span>
        </div>
      ),
    },
    { key: 'terms', header: 'Descuento', render: (c) => couponTerms(c) },
    { key: 'plans', header: 'Planes', hideOnMobile: true, render: (c) => planNames(c.planCodes, plans) },
    {
      key: 'uses',
      header: 'Usos',
      render: (c) => `${c.redemptions ?? 0}${c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ''}`,
    },
    {
      key: 'state',
      header: 'Estado',
      render: (c) => {
        const s = couponState(c);
        return (
          <div className="plan-badges">
            <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
            {c.validUntil && s.variant === 'active' && <span className="plan-code">hasta el {formatDate(c.validUntil)}</span>}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="coupon-toolbar">
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Nuevo cupón
        </Button>
      </div>
      <NotificationBanner type="error" message={error} />
      <DataTable<Coupon>
        columns={columns}
        data={coupons}
        loading={loading}
        loadingMessage="Cargando cupones..."
        emptyMessage="Todavía no hay cupones"
        keyExtractor={(c) => c.id}
        className="plan-table-container"
        actionsHeader="Acciones"
        renderActions={(c) => (
          <button className="action-btn history-btn" onClick={() => setViewing(c)}>
            Ver
          </button>
        )}
      />
      <CouponModal show={creating} plans={plans} onClose={() => setCreating(false)} onCreate={createCoupon} />
      <CouponDetailModal
        coupon={viewing}
        plans={plans}
        fetchDetail={fetchDetail}
        onUpdate={updateCoupon}
        onAddCodes={addCodes}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
