import { Modal, Button, Input } from '../../../components/ui';
import { FREE_PLAN_CODE, type BillingPlan, type PlanFormData } from '../types';

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

/** Monedas que acepta el backend (las verificadas con Mercado Pago). */
const CURRENCIES = ['UYU'];

export function PlanModal({ show, editingPlan, formData, error, loading = false, onClose, onSubmit, onChange }: PlanModalProps) {
  const isFree = (editingPlan?.code ?? formData.code) === FREE_PLAN_CODE;
  const hasSubscribers = (editingPlan?.liveSubscriptions ?? 0) > 0;

  return (
    <Modal show={show} title={editingPlan ? `Editar plan ${editingPlan.name}` : 'Nuevo plan'} onClose={onClose} error={error}>
      <form className="modal-form plan-modal-form" onSubmit={onSubmit}>
        <div className="plan-modal-body">
          {editingPlan && hasSubscribers && (
            <p className="plan-note">
              {editingPlan.liveSubscriptions} suscripción(es) vigente(s) usan este plan. Los cambios valen para
              contrataciones nuevas: quienes ya lo tienen conservan el precio y el límite que contrataron.
            </p>
          )}
          {isFree && (
            <p className="plan-note">
              Free es el plan que rige cuando alguien no tiene suscripción: tiene que ser gratis, activo y visible.
              Su límite de pacientes sí se puede cambiar.
            </p>
          )}

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
            <label>Descripción</label>
            <textarea
              className="textarea"
              placeholder="Una línea que explique para quién es"
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="plan-row">
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
            {/* Misma estructura y clases que <Input>: así la etiqueta, la separación y el alto coinciden. */}
            <div className="input-wrapper input-fullwidth">
              <label className="input-label" htmlFor="plan-currency">
                Moneda
              </label>
              <select
                id="plan-currency"
                className="input plan-select"
                value={formData.currency}
                onChange={(e) => onChange({ currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="plan-row">
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

          <div className="form-group">
            <label>Características (una por línea)</label>
            <textarea
              className="textarea"
              placeholder={'Agenda y recordatorios\nHistoria clínica completa'}
              value={formData.features}
              onChange={(e) => onChange({ features: e.target.value })}
              rows={4}
            />
          </div>

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
              <span className="plan-check-hint">Un plan inactivo no se ofrece ni se puede asignar. Las suscripciones existentes no cambian.</span>
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
        </div>

        <div className="modal-actions plan-modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {editingPlan ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
