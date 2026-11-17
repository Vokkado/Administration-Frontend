import { useState } from 'react';
import { Button, Input, Modal } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';
import { FREE_PLAN_CODE, type BillingPlan, type CouponFormData } from '../types';
import { formatPrice } from './PlanTable';
import { couponTerms } from './couponFormat';
import { ModalTabs } from './ModalTabs';
import { modalTabPanelProps, nextTab } from './modalTabHelpers';

interface CouponModalProps {
  show: boolean;
  plans: BillingPlan[];
  onClose: () => void;
  onCreate: (form: CouponFormData) => Promise<unknown>;
}

const EMPTY: CouponFormData = {
  name: '',
  kind: 'percent',
  percentOff: '20',
  forever: false,
  durationMonths: '3',
  planCodes: [],
  codeMode: 'shared',
  sharedCode: '',
  uniqueCodes: '',
  generateCount: '',
  generatePrefix: '',
  validUntil: '',
  maxRedemptions: '',
  oncePerAccount: true,
  isActive: true,
};

/** Mínimo que cobra Mercado Pago en UYU: el precio con descuento no puede quedar por debajo. */
const MIN_CHARGE = 15;

/** El mismo formato que el campo "Código": 3 a 40 letras, números o guiones, sin empezar con guion. */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{2,39}$/;

type Section = 'discount' | 'plans' | 'codes' | 'usage';

/**
 * Crear un cupón: porcentaje durante N meses (o para siempre) o meses gratis, para los planes elegidos,
 * con un código compartido o un lote de códigos únicos (escritos o generados). El formulario va en
 * pestañas; la que tiene algo obligatorio sin completar se marca.
 */
export function CouponModal({ show, plans, onClose, onCreate }: CouponModalProps) {
  const [form, setForm] = useState<CouponFormData>(EMPTY);
  const [section, setSection] = useState<Section>('discount');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (changes: Partial<CouponFormData>) => setForm((f) => ({ ...f, ...changes }));
  const contractable = plans.filter((p) => p.isActive && p.isPublic && p.priceAmount > 0 && p.code !== FREE_PLAN_CODE);

  const percent = Number(form.percentOff);
  const preview = couponTerms({
    kind: form.kind,
    percentOff: form.kind === 'percent' ? percent || 0 : null,
    durationMonths: form.kind === 'percent' && form.forever ? null : Number(form.durationMonths) || 0,
  });
  const belowMinimum =
    form.kind === 'percent' && percent > 0
      ? contractable.filter((p) => form.planCodes.includes(p.code) && Math.round(p.priceAmount * (100 - percent)) / 100 < MIN_CHARGE)
      : [];
  const uniqueCount =
    form.uniqueCodes
      .split(/[\n,;]+/)
      .map((c) => c.trim())
      .filter(Boolean).length + (Number(form.generateCount) || 0);

  // Solo se ve la pestaña abierta: lo que falta en cada una se marca en su título.
  const incomplete: Record<Section, boolean> = {
    discount:
      !form.name.trim() ||
      (form.kind === 'percent' && !(percent > 0 && percent < 100)) ||
      (!(form.kind === 'percent' && form.forever) && !(Number(form.durationMonths) >= 1)),
    plans: form.planCodes.length === 0 || belowMinimum.length > 0,
    codes: form.codeMode === 'shared' ? !CODE_PATTERN.test(form.sharedCode.trim()) : uniqueCount === 0,
    usage: false,
  };
  const invalid = Object.values(incomplete).some(Boolean);
  const tabs = [
    {
      key: 'discount' as const,
      label: 'Descuento',
      missing: incomplete.discount,
    },
    { key: 'plans' as const, label: 'Planes', missing: incomplete.plans },
    { key: 'codes' as const, label: 'Códigos', missing: incomplete.codes },
    { key: 'usage' as const, label: 'Uso' },
  ];
  const next = nextTab<Section>(tabs, section);

  function reset() {
    setForm(EMPTY);
    setSection('discount');
    setError('');
  }

  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(form);
      reset();
      onClose();
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo crear el cupón'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} title="Nuevo cupón" onClose={close} error={error} maxWidth="760px">
      <form className="modal-form plan-modal-form" onSubmit={submit}>
        <ModalTabs tabs={tabs} active={section} onChange={setSection} label="Secciones del cupón" idPrefix="coupon-form" />

        <div className="plan-modal-body modal-tab-panel" {...modalTabPanelProps('coupon-form', section)}>
          {section === 'discount' && (
            <>
              <Input
                type="text"
                label="Nombre (interno) *"
                placeholder="Ej: Lanzamiento Pro"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                maxLength={80}
                required
                fullWidth
              />

              <fieldset className="access-duration">
                <legend>Tipo</legend>
                <label className="plan-check-inline">
                  <input type="radio" name="kind" checked={form.kind === 'percent'} onChange={() => set({ kind: 'percent' })} />
                  Porcentaje de descuento
                </label>
                <label className="plan-check-inline">
                  <input
                    type="radio"
                    name="kind"
                    checked={form.kind === 'free_months'}
                    onChange={() => set({ kind: 'free_months', forever: false })}
                  />
                  Meses gratis
                </label>
              </fieldset>

              <div className="plan-row coupon-amount-row">
                {form.kind === 'percent' && (
                  <Input
                    type="number"
                    label="Descuento (%) *"
                    min={0.01}
                    max={99.99}
                    step="0.01"
                    value={form.percentOff}
                    onChange={(e) => set({ percentOff: e.target.value })}
                    required
                    fullWidth
                  />
                )}
                <div>
                  <Input
                    type="number"
                    label={form.kind === 'percent' ? 'Durante (meses)' : 'Meses gratis *'}
                    min={1}
                    max={36}
                    step="1"
                    value={form.forever ? '' : form.durationMonths}
                    onChange={(e) => set({ durationMonths: e.target.value })}
                    disabled={form.kind === 'percent' && form.forever}
                    required={!(form.kind === 'percent' && form.forever)}
                    fullWidth
                  />
                  {form.kind === 'percent' && (
                    <label className="plan-check-inline">
                      <input type="checkbox" checked={form.forever} onChange={(e) => set({ forever: e.target.checked })} />
                      Para siempre
                    </label>
                  )}
                </div>
              </div>
              <p className="plan-note">Queda: {preview}. Un mes es un cobro mensual.</p>
            </>
          )}

          {section === 'plans' && (
            <>
              <fieldset className="access-duration">
                <legend>Planes en los que vale *</legend>
                {contractable.map((p) => (
                  <label key={p.code} className="plan-check-inline">
                    <input
                      type="checkbox"
                      checked={form.planCodes.includes(p.code)}
                      onChange={(e) =>
                        set({
                          planCodes: e.target.checked ? [...form.planCodes, p.code] : form.planCodes.filter((c) => c !== p.code),
                        })
                      }
                    />
                    {p.name} ({formatPrice(p.priceAmount, p.currency)}
                    {form.kind === 'percent' && percent > 0 && percent < 100
                      ? ` → ${formatPrice(Math.round(p.priceAmount * (100 - percent)) / 100, p.currency)}`
                      : ''}
                    )
                  </label>
                ))}
              </fieldset>
              {belowMinimum.length > 0 && (
                <p className="plan-note plan-note-warning" role="alert">
                  Con ese descuento, {belowMinimum.map((p) => p.name).join(', ')} quedaría por debajo de {formatPrice(MIN_CHARGE, 'UYU')},
                  que es lo mínimo que cobra Mercado Pago. Para un mes sin cobrar, usá meses gratis.
                </p>
              )}
            </>
          )}

          {section === 'codes' && (
            <>
              <fieldset className="access-duration">
                <legend>Códigos</legend>
                <label className="plan-check-inline">
                  <input type="radio" name="codeMode" checked={form.codeMode === 'shared'} onChange={() => set({ codeMode: 'shared' })} />
                  Un código para todos
                </label>
                <label className="plan-check-inline">
                  <input type="radio" name="codeMode" checked={form.codeMode === 'unique'} onChange={() => set({ codeMode: 'unique' })} />
                  Códigos únicos (cada uno se usa una vez)
                </label>
              </fieldset>
              {form.codeMode === 'shared' ? (
                <Input
                  type="text"
                  label="Código *"
                  placeholder="Ej: PRO20"
                  value={form.sharedCode}
                  onChange={(e) => set({ sharedCode: e.target.value.toUpperCase() })}
                  pattern="[A-Za-z0-9][A-Za-z0-9-]{2,39}"
                  title="De 3 a 40 letras, números o guiones"
                  maxLength={40}
                  required
                  fullWidth
                />
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="coupon-codes">Escritos (uno por línea, opcional)</label>
                    <textarea
                      id="coupon-codes"
                      className="textarea"
                      rows={4}
                      placeholder={'VIP-ANA\nVIP-BRUNO'}
                      value={form.uniqueCodes}
                      onChange={(e) => set({ uniqueCodes: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="plan-row coupon-generate-row">
                    <Input
                      type="number"
                      label="Generar al azar"
                      min={0}
                      max={1000}
                      step="1"
                      placeholder="Cantidad"
                      value={form.generateCount}
                      onChange={(e) => set({ generateCount: e.target.value })}
                      fullWidth
                    />
                    <Input
                      type="text"
                      label="Prefijo"
                      placeholder="Ej: VIP"
                      value={form.generatePrefix}
                      onChange={(e) => set({ generatePrefix: e.target.value.toUpperCase() })}
                      maxLength={12}
                      fullWidth
                    />
                  </div>
                  <p className="plan-note">{uniqueCount} código(s) en total. Después de crearlo los podés descargar.</p>
                </>
              )}
            </>
          )}

          {section === 'usage' && (
            <>
              <div className="plan-row coupon-usage-row">
                <Input
                  type="date"
                  label="Vence (último día para usarlo)"
                  value={form.validUntil}
                  onChange={(e) => set({ validUntil: e.target.value })}
                  fullWidth
                />
                {form.codeMode === 'shared' && (
                  <Input
                    type="number"
                    label="Usos en total"
                    min={1}
                    step="1"
                    placeholder="Sin límite"
                    value={form.maxRedemptions}
                    onChange={(e) => set({ maxRedemptions: e.target.value })}
                    fullWidth
                  />
                )}
              </div>
              {form.codeMode === 'shared' && form.maxRedemptions === '1' && <p className="plan-note">Se muestra como código de un solo uso.</p>}
              {form.codeMode === 'unique' && (
                <p className="plan-note">
                  Cada código se usa una vez: el cupón va a tener {uniqueCount === 1 ? '1 uso' : `${uniqueCount} usos`}, uno por código. Para más
                  usos, generá más códigos desde el detalle del cupón.
                </p>
              )}

              <div className="plan-checks">
                <label className="plan-check">
                  <input type="checkbox" checked={form.oncePerAccount} onChange={(e) => set({ oncePerAccount: e.target.checked })} />
                  Un uso por cuenta
                  <span className="plan-check-hint">Cada nutricionista lo puede usar una sola vez.</span>
                </label>
                <label className="plan-check">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
                  Activo
                  <span className="plan-check-hint">Uno inactivo no se puede usar (se puede activar después).</span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions plan-modal-actions">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          {next && (
            <Button type="button" variant="secondary" onClick={() => setSection(next)} disabled={saving}>
              Siguiente
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={saving || invalid}
            title={invalid ? 'Completá las pestañas marcadas' : undefined}
          >
            {saving ? 'Creando...' : 'Crear cupón'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
