/**
 * Modal para Crear/Editar Restricciones
 */
import { Modal, Button, Input } from '../../../components/ui';
import type { Restriction, RestrictionFormData, RestrictionType, Mode, IngredientCategory } from '../types';
import { RESTRICTION_TYPE_LABELS, MODE_LABELS, INGREDIENT_CATEGORY_LABELS } from '../types';

interface RestrictionModalProps {
  show: boolean;
  editingRestriction: Restriction | null;
  formData: RestrictionFormData;
  error?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<RestrictionFormData>) => void;
}

export function RestrictionModal({
  show,
  editingRestriction,
  formData,
  error,
  submitting = false,
  onClose,
  onSubmit,
  onChange
}: RestrictionModalProps) {
  return (
    <Modal
      show={show}
      title={editingRestriction ? 'Editar restricción' : 'Agregar restricción'}
      onClose={onClose}
      error={error}
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="restriction-form">
          <Input
            type="text"
            label="Nombre *"
            placeholder="Ej: Intolerancia a la lactosa"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={100}
            title="El nombre no puede exceder 100 caracteres"
            required
            fullWidth
          />

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              className="textarea"
              placeholder="Descripción detallada..."
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              maxLength={500}
              title="La descripción no puede exceder 500 caracteres"
              rows={3}
            />
            <small className="form-hint">
              {formData.description.length}/500 caracteres
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo *</label>
              <select
                className="select"
                value={formData.type}
                onChange={(e) => onChange({ type: e.target.value as RestrictionType })}
                required
              >
                {Object.entries(RESTRICTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Modo *</label>
              <select
                className="select"
                value={formData.mode}
                onChange={(e) => onChange({ mode: e.target.value as Mode })}
                required
              >
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select
              className="select"
              value={formData.category || ''}
              onChange={(e) => onChange({ category: (e.target.value || undefined) as IngredientCategory | '' })}
            >
              <option value="">Sin categoría</option>
              {Object.entries(INGREDIENT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isAbsolute}
                onChange={(e) => onChange({ isAbsolute: e.target.checked })}
              />
              <span>Restricción Absoluta</span>
            </label>
            <small className="form-hint">
              Si está activado, esta restricción no admite excepciones.
            </small>
          </div>
        </form>
      </div>

      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" form="restriction-form" loading={submitting}>
          {editingRestriction ? 'Guardar Cambios' : 'Crear Restricción'}
        </Button>
      </div>
    </Modal>
  );
}
