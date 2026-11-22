import { useState } from 'react';
import { Modal, Button, Input } from '../../../components/ui';
import { FREE_PLAN_CODE, type BillingPlan, type PlanFormData } from '../types';
import { ModalTabs } from './ModalTabs';
import { modalTabPanelProps, nextTab } from './modalTabHelpers';

interface PlanModalProps {
  show: boolean;
  editingPlan: BillingPlan | null;
  formData: PlanFormData;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<PlanFormData>) => void;
}

/** El mismo formato que el campo "Código": 2 a 40 minúsculas, números, guion o guion bajo. */
const CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;

type Section = 'general' | 'pricing' | 'visibility';

const isWhole = (value: string) => value.trim() !== '' && Number.isInteger(Number(value));

/**
 * Crear o editar un plan, en pestañas: datos generales, precio y límite de pacientes, y visibilidad.
 * Solo se ve la pestaña abierta, así que lo obligatorio se valida acá (y se marca en la pestaña).
 */
export function PlanModal({ show, editingPlan, formData, error, loading = false, onClose, onSubmit, onChange }: PlanModalProps) {
  const [section, setSection] = useState<Section>('general');
  const isFree = (editingPlan?.code ?? formData.code) === FREE_PLAN_CODE;
  const hasSubscribers = (editingPlan?.liveSubscriptions ?? 0) > 0;

  // Cada vez que se abre arranca por la primera pestaña (se ajusta en el render, sin un efecto).
  const [wasShown, setWasShown] = useState(show);
  if (show !== wasShown) {
    setWasShown(show);
    if (show) setSection('general');
  }

  const price = Number(formData.priceAmount);
  const incomplete: Record<Section, boolean> = {
    general: (!editingPlan && !CODE_PATTERN.test(formData.code)) || !formData.name.trim(),
    pricing:
      formData.priceAmount.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0 ||
      (!formData.unlimited && !(isWhole(formData.maxPatients) && Number(formData.maxPatients) >= 0)),
    visibility: formData.sortOrder.trim() !== '' && !isWhole(formData.sortOrder),
  };
  const invalid = Object.values(incomplete).some(Boolean);
  const tabs = [
    { key: 'general' as const, label: 'General', missing: incomplete.general },
    {
      key: 'pricing' as const,
      label: 'Precio y límite',
      missing: incomplete.pricing,
    },
    {
      key: 'visibility' as const,
      label: 'Visibilidad',
      missing: incomplete.visibility,
    },
  ];
  const next = nextTab<Section>(tabs, section);

  const submit = (e: React.FormEvent) => {
    if (invalid) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  };

  return (
    <Modal
      show={show}
      title={editingPlan ? `Editar plan ${editingPlan.name}` : 'Nuevo plan'}
      onClose={onClose}
      error={error}
      maxWidth="760px"
    >
      <form className="modal-form plan-modal-form" onSubmit={submit}>
        <ModalTabs tabs={tabs} active={section} onChange={setSection} label="Secciones del plan" idPrefix="plan-form" />

        <div className="plan-modal-body modal-tab-panel" {...modalTabPanelProps('plan-form', section)}>
          {/* Avisos que importan en cualquier pestaña. */}
          {editingPlan && hasSubscribers && (
            <p className="plan-note">
              {editingPlan.liveSubscriptions} suscripción(es) vigente(s) usan este plan. Los cambios valen para contrataciones nuevas:
              quienes ya lo tienen conservan el precio y el límite que contrataron.
            </p>
          )}
          {editingPlan && editingPlan.currency !== formData.currency && (
            <p className="plan-note plan-note-warning">
              Este plan está en {editingPlan.currency} y la cuenta de pagos cobra en {formData.currency}: al guardar pasa a{' '}
              {formData.currency}. Revisá el precio.
            </p>
          )}
          {isFree && (
            <p className="plan-note">
              Free es el plan que rige cuando alguien no tiene suscripción: tiene que ser gratis, activo y visible. Su límite de pacientes
              sí se puede cambiar.
            </p>
          )}

          {section === 'general' && (
            <>
              {!editingPlan && (
                <Input
                  type="text"
                  label="Código *"
                  placeholder="Ej: clinica"
                  value={formData.code}
                  onChange={(e) => onChange({ code: e.target.value.toLowerCase() })}
                  pattern="[a-z0-9][a-z0-9_-]{1,39}"
                  title="De 2 a 40 caracteres: minúsculas, números, guión o guión bajo"
                  maxLength={40}
                  required
                  fullWidth
                />
              )}

              <Input
                type="text"
                label="Nombre *"
                placeholder="Ej: Clínica"
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={80}
                required
                fullWidth
              />

              <div className="form-group">
                <label htmlFor="plan-description">Descripción</label>
                <textarea
                  id="plan-description"
                  className="textarea"
                  placeholder="Una línea que explique para quién es"
                  value={formData.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {section === 'pricing' && (
            <>
              <div className="plan-row plan-pair-row">
                <Input
                  type="number"
                  label="Precio por mes *"
                  min={0}
                  step="0.01"
                  value={formData.priceAmount}
                  onChange={(e) => onChange({ priceAmount: e.target.value })}
                  disabled={isFree}
                  required
                  fullWidth
                />
                {/* La de la cuenta de pagos (la configura el backend): no se elige. */}
                <Input id="plan-currency" label="Moneda" value={formData.currency} readOnly disabled fullWidth />
              </div>

              <div className="plan-row plan-pair-row">
                <Input
                  type="number"
                  label="Pacientes activos"
                  min={0}
                  step="1"
                  value={formData.unlimited ? '' : formData.maxPatients}
                  onChange={(e) => onChange({ maxPatients: e.target.value })}
                  disabled={formData.unlimited}
                  required={!formData.unlimited}
                  fullWidth
                />
                {/* Etiqueta invisible del mismo alto que la del campo: el checkbox queda centrado con él. */}
                <div className="input-wrapper input-fullwidth">
                  <span className="input-label plan-label-spacer" aria-hidden="true">
                    &nbsp;
                  </span>
                  <label className="plan-check-inline">
                    <input type="checkbox" checked={formData.unlimited} onChange={(e) => onChange({ unlimited: e.target.checked })} />
                    Sin límite
                  </label>
                </div>
              </div>
            </>
          )}

          {section === 'visibility' && (
            <>
              <div className="plan-checks">
                <label className="plan-check">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    disabled={isFree}
                    onChange={(e) => onChange({ isPublic: e.target.checked })}
                  />
                  Contratable desde la web de nutricionistas
                  <span className="plan-check-hint">Si no, es interno: solo se asigna como concesión (beta, promociones).</span>
                </label>
                <label className="plan-check">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    disabled={isFree}
                    onChange={(e) => onChange({ isActive: e.target.checked })}
                  />
                  Activo
                  <span className="plan-check-hint">
                    Un plan inactivo no se ofrece ni se puede asignar. Las suscripciones existentes no cambian.
                  </span>
                </label>
              </div>

              <Input
                type="number"
                label="Orden en la lista"
                step="1"
                value={formData.sortOrder}
                onChange={(e) => onChange({ sortOrder: e.target.value })}
                fullWidth
              />
            </>
          )}
        </div>

        <div className="modal-actions plan-modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {next && (
            <Button type="button" variant="secondary" onClick={() => setSection(next)} disabled={loading}>
              Siguiente
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={invalid}
            title={invalid ? 'Completá las pestañas marcadas' : undefined}
          >
            {editingPlan ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
