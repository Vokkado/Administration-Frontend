import { useEffect, useRef, useState } from 'react';
import { Button, LoadingSpinner, Modal, StatusBadge } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';
import { endOfDayMontevideo } from '../hooks/useNutritionists';
import type { BillingPlan, Coupon, CouponDetail } from '../types';
import { formatDate, montevideoDay } from './accessFormat';
import { couponState, couponTerms, downloadCodesCsv, planNames, redemptionStatusLabel } from './couponFormat';
import { ModalTabs } from './ModalTabs';
import { modalTabPanelProps } from './modalTabHelpers';

type Section = 'summary' | 'codes' | 'redemptions';

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
 * no (si ya se canjeó: crear otro cupón). A uno de códigos únicos se le agregan códigos. Va en pestañas:
 * resumen (con lo editable), códigos y canjes.
 */
export function CouponDetailModal({ coupon, plans, fetchDetail, onUpdate, onAddCodes, onClose }: CouponDetailModalProps) {
  const [detail, setDetail] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ name: '', validUntil: '', maxRedemptions: '', oncePerAccount: true });
  const [more, setMore] = useState({ count: '', prefix: '' });
  const [section, setSection] = useState<Section>('summary');
  // El cupón que se está mostrando: una respuesta de otro (abierto antes) se descarta.
  const currentId = useRef<string | null>(null);

  const editsFrom = (c: Coupon) => ({
    name: c.name,
    validUntil: c.validUntil ? montevideoDay(c.validUntil) : '',
    maxRedemptions: c.maxRedemptions === null ? '' : String(c.maxRedemptions),
    oncePerAccount: c.oncePerAccount,
  });

  /** Recarga el detalle. Los campos editables se pisan solo al abrirlo o después de guardarlos. */
  const load = async (id: string, resetEdits: boolean) => {
    setLoading(true);
    setError('');
    try {
      const d = await fetchDetail(id);
      if (currentId.current !== id) return;
      setDetail(d);
      if (resetEdits) setEdit(editsFrom(d.coupon));
    } catch (err) {
      if (currentId.current === id) setError(getApiMessage(err, 'No se pudo cargar el cupón'));
    } finally {
      if (currentId.current === id) setLoading(false);
    }
  };

  useEffect(() => {
    currentId.current = coupon?.id ?? null;
    if (!coupon) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setSection('summary');
    void load(coupon.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon?.id]);

  if (!coupon) return null;
  const c = detail?.coupon ?? coupon;

  async function run(action: () => Promise<unknown>, resetEdits = false) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await action();
      await load(c.id, resetEdits);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el cambio'));
    } finally {
      setSaving(false);
    }
  }

  const saveEdits = () => {
    const before = editsFrom(c);
    const changes: Record<string, unknown> = {};
    if (edit.name.trim() !== before.name) changes.name = edit.name.trim();
    if (edit.validUntil !== before.validUntil) changes.validUntil = edit.validUntil ? endOfDayMontevideo(edit.validUntil) : null;
    if (edit.maxRedemptions !== before.maxRedemptions) changes.maxRedemptions = edit.maxRedemptions ? Number(edit.maxRedemptions) : null;
    if (edit.oncePerAccount !== before.oncePerAccount) changes.oncePerAccount = edit.oncePerAccount;
    if (Object.keys(changes).length === 0) return;
    void run(() => onUpdate(c.id, changes), true);
  };
  const usedCount = detail?.redemptions.filter((r) => r.status !== 'void').length ?? c.redemptions ?? 0;
  const state = couponState({ ...c, redemptions: usedCount });
  const tabs = [
    { key: 'summary' as const, label: 'Resumen' },
    { key: 'codes' as const, label: `Códigos (${detail?.codes.length ?? c.codes ?? 0})` },
    { key: 'redemptions' as const, label: `Canjes (${detail?.redemptions.length ?? c.redemptions ?? 0})` },
  ];

  return (
    <Modal show={coupon !== null} title={`Cupón: ${c.name}`} onClose={onClose} error={error} maxWidth="760px">
      <ModalTabs tabs={tabs} active={section} onChange={setSection} label="Secciones del cupón" idPrefix="coupon-detail" />
      <div className="plan-modal-body coupon-detail modal-tab-panel" {...modalTabPanelProps('coupon-detail', section)}>
        {loading && !detail && <LoadingSpinner />}
        {section === 'summary' && (
          <>
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
                  {usedCount}
                  {c.maxRedemptions !== null ? ` de ${c.maxRedemptions}` : ''}
                  {c.maxRedemptions === 1 ? ' · código de un solo uso' : ''}
                </dd>
              </div>
            </dl>

            <div className="form-group">
              <label htmlFor="coupon-name">Nombre</label>
              <input
                id="coupon-name"
                className="input"
                value={edit.name}
                maxLength={80}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </div>
            <div className="plan-row coupon-usage-row">
              <div className="form-group">
                <label htmlFor="coupon-until">Vence</label>
                <input
                  id="coupon-until"
                  type="date"
                  className="input"
                  value={edit.validUntil}
                  onChange={(e) => setEdit({ ...edit, validUntil: e.target.value })}
                />
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
              <input
                type="checkbox"
                checked={edit.oncePerAccount}
                onChange={(e) => setEdit({ ...edit, oncePerAccount: e.target.checked })}
              />
              Un uso por cuenta
            </label>
            <div className="modal-actions">
              <Button
                type="button"
                variant={c.isActive ? 'secondary' : 'primary'}
                disabled={saving}
                onClick={() => run(() => onUpdate(c.id, { isActive: !c.isActive }))}
              >
                {c.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button type="button" variant="primary" disabled={saving || !edit.name.trim()} onClick={saveEdits}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </>
        )}

        {section === 'codes' && (
          <section aria-label="Códigos">
            <div className="coupon-section-head">
              <h4>{c.codeMode === 'unique' ? 'Códigos únicos (cada uno se usa una vez)' : 'Código para todos'}</h4>
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
                      await onAddCodes(c.id, [], {
                        count: Number(more.count),
                        prefix: more.prefix.trim(),
                      });
                      setMore({ count: '', prefix: '' });
                    })
                  }
                >
                  Generar más
                </Button>
              </div>
            )}
          </section>
        )}

        {section === 'redemptions' && (
          <section aria-label="Canjes">
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
        )}
      </div>
    </Modal>
  );
}
