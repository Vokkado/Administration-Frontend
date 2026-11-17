import { useEffect, useState } from 'react';
import { Button, LoadingSpinner, Modal, StatusBadge } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';
import { endOfDayMontevideo } from '../hooks/useNutritionists';
import type { BillingPlan, Coupon, CouponDetail } from '../types';
import { formatDate, montevideoDay } from './accessFormat';
import { couponState, couponTerms, downloadCodesCsv, planNames, redemptionStatusLabel } from './couponFormat';

interface CouponDetailModalProps {
  coupon: Coupon | null;
  plans: BillingPlan[];
  fetchDetail: (id: string) => Promise<CouponDetail>;
  onUpdate: (id: string, changes: Record<string, unknown>) => Promise<unknown>;
  onAddCodes: (id: string, codes: string[], generate: { count: number; prefix: string } | null) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Un cupón: condiciones, códigos (con sus usos, descargables) y canjes. Se puede cambiar el nombre, el
 * vencimiento, el límite de usos, "un uso por cuenta" y activarlo/desactivarlo; el descuento y la duración
 * no (si ya se canjeó: crear otro cupón). A uno de códigos únicos se le agregan códigos.
 */
export function CouponDetailModal({ coupon, plans, fetchDetail, onUpdate, onAddCodes, onClose }: CouponDetailModalProps) {
  const [detail, setDetail] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ name: '', validUntil: '', maxRedemptions: '', oncePerAccount: true });
  const [more, setMore] = useState({ count: '', prefix: '' });

  const load = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const d = await fetchDetail(id);
      setDetail(d);
      setEdit({
        name: d.coupon.name,
        validUntil: d.coupon.validUntil ? montevideoDay(d.coupon.validUntil) : '',
        maxRedemptions: d.coupon.maxRedemptions === null ? '' : String(d.coupon.maxRedemptions),
        oncePerAccount: d.coupon.oncePerAccount,
      });
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo cargar el cupón'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!coupon) {
      setDetail(null);
      return;
    }
    void load(coupon.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon?.id]);

  if (!coupon) return null;
  const c = detail?.coupon ?? coupon;

  async function run(action: () => Promise<unknown>) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await action();
      await load(c.id);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el cambio'));
    } finally {
      setSaving(false);
    }
  }

  const saveEdits = () =>
    run(() =>
      onUpdate(c.id, {
        name: edit.name.trim(),
        validUntil: edit.validUntil ? endOfDayMontevideo(edit.validUntil) : null,
        maxRedemptions: edit.maxRedemptions ? Number(edit.maxRedemptions) : null,
        oncePerAccount: edit.oncePerAccount,
      })
    );
  const state = couponState({ ...c, redemptions: detail?.redemptions.filter((r) => r.status !== 'void').length ?? c.redemptions });

  return (
    <Modal show={coupon !== null} title={`Cupón: ${c.name}`} onClose={onClose} error={error}>
      <div className="plan-modal-body coupon-detail">
        {loading && !detail && <LoadingSpinner />}
        <dl className="access-summary">
          <div>
            <dt>Descuento</dt>
            <dd>{couponTerms(c)}</dd>
          </div>
          <div>
            <dt>Planes</dt>
            <dd>{planNames(c.planCodes, plans)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <StatusBadge variant={state.variant}>{state.label}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Usos</dt>
            <dd>
              {detail?.redemptions.filter((r) => r.status !== 'void').length ?? c.redemptions ?? 0}
              {c.maxRedemptions !== null ? ` de ${c.maxRedemptions}` : ''}
              {c.maxRedemptions === 1 ? ' · código de un solo uso' : ''}
            </dd>
          </div>
        </dl>

        <div className="form-group">
          <label htmlFor="coupon-name">Nombre</label>
          <input id="coupon-name" className="input" value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        </div>
        <div className="plan-row">
          <div className="form-group">
            <label htmlFor="coupon-until">Vence</label>
            <input id="coupon-until" type="date" className="input" value={edit.validUntil} onChange={(e) => setEdit({ ...edit, validUntil: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="coupon-max">Usos en total</label>
            <input
              id="coupon-max"
              type="number"
              min={1}
              className="input"
              placeholder="Sin límite"
              value={edit.maxRedemptions}
              onChange={(e) => setEdit({ ...edit, maxRedemptions: e.target.value })}
            />
          </div>
        </div>
        <label className="plan-check-inline">
          <input type="checkbox" checked={edit.oncePerAccount} onChange={(e) => setEdit({ ...edit, oncePerAccount: e.target.checked })} />
          Un uso por cuenta
        </label>
        <div className="modal-actions">
          <Button type="button" variant={c.isActive ? 'secondary' : 'primary'} disabled={saving} onClick={() => run(() => onUpdate(c.id, { isActive: !c.isActive }))}>
            {c.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          <Button type="button" variant="primary" disabled={saving || !edit.name.trim()} onClick={saveEdits}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        <section aria-labelledby="coupon-codes-title">
          <div className="coupon-section-head">
            <h4 id="coupon-codes-title">Códigos ({detail?.codes.length ?? c.codes ?? 0})</h4>
            {detail && detail.codes.length > 0 && (
              <button type="button" className="history-btn" onClick={() => downloadCodesCsv(c.name, detail.codes)}>
                Descargar CSV
              </button>
            )}
          </div>
          {detail && (
            <ul className="coupon-codes">
              {detail.codes.slice(0, 200).map((k) => (
                <li key={k.id}>
                  <code>{k.code}</code>
                  <span className="plan-code">{k.redemptions === 0 ? 'sin usar' : `${k.redemptions} uso(s)`}</span>
                </li>
              ))}
              {detail.codes.length > 200 && <li className="plan-code">… y {detail.codes.length - 200} más (están en el CSV)</li>}
            </ul>
          )}
          {c.codeMode === 'unique' && (
            <div className="coupon-add-codes">
              <input
                type="number"
                min={1}
                max={1000}
                className="input"
                placeholder="Cantidad"
                aria-label="Cuántos códigos generar"
                value={more.count}
                onChange={(e) => setMore({ ...more, count: e.target.value })}
              />
              <input
                className="input"
                placeholder="Prefijo"
                aria-label="Prefijo de los códigos"
                maxLength={12}
                value={more.prefix}
                onChange={(e) => setMore({ ...more, prefix: e.target.value.toUpperCase() })}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !(Number(more.count) >= 1)}
                onClick={() =>
                  run(async () => {
                    await onAddCodes(c.id, [], { count: Number(more.count), prefix: more.prefix.trim() });
                    setMore({ count: '', prefix: '' });
                  })
                }
              >
                Generar más
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="coupon-redemptions-title">
          <h4 id="coupon-redemptions-title">Canjes</h4>
          {detail && detail.redemptions.length === 0 && <p className="plan-history-empty">Todavía nadie lo usó.</p>}
          {detail && detail.redemptions.length > 0 && (
            <table className="dt-table coupon-redemptions">
              <thead>
                <tr>
                  <th>Quién</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {detail.redemptions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.redeemedByEmail ?? '—'}</td>
                    <td>
                      <code>{r.code}</code>
                    </td>
                    <td>
                      {redemptionStatusLabel(r)}
                      {r.kind === 'percent' && r.status !== 'void' && r.discountedCharges > 0 ? ` · ${r.discountedCharges} cobro(s)` : ''}
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Modal>
  );
}
