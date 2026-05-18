/**
 * Sub-component for the "Información Nutricional" tab in ProductModal
 */
import { Button, Input } from '../../../../components/ui';
import type { ProductFormData, NutritionFactOption } from './types';
import { SERVING_SIZE_UNITS, NUTRITION_UNITS } from './types';

interface ProductNutritionSectionProps {
  formData: ProductFormData;
  allNutritionFacts: NutritionFactOption[];
  loadingNutritionFacts: boolean;
  onChange: (data: Partial<ProductFormData>) => void;
  onAddNutritionFact: () => void;
  onRemoveNutritionFact: (index: number) => void;
  onNutritionFactChange: (index: number, field: 'nutritionFactId' | 'value' | 'unit', val: string) => void;
}

export function ProductNutritionSection({
  formData,
  allNutritionFacts,
  loadingNutritionFacts,
  onChange,
  onAddNutritionFact,
  onRemoveNutritionFact,
  onNutritionFactChange,
}: ProductNutritionSectionProps) {
  return (
    <div className="product-form-grid">
      <div className="form-group">
        <Input
          type="number"
          label="Tamaño de Porción"
          placeholder="100"
          value={formData.servingSizeQuantity}
          onChange={(e) => onChange({ servingSizeQuantity: e.target.value })}
          step="1"
          min="1"
          fullWidth
        />
      </div>

      <div className="form-group">
        <label>Unidad de Porción</label>
        <select
          className="select"
          value={formData.servingSizeUnit}
          onChange={(e) => onChange({ servingSizeUnit: e.target.value })}
        >
          <option value="">Seleccionar...</option>
          {SERVING_SIZE_UNITS.map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </div>

      <div className="form-group form-group-full nutrition-facts-section">
        <div className="section-label-row">
          <label className="section-label">Valores Nutricionales</label>
          <Button type="button" variant="primary" onClick={onAddNutritionFact}>
            + Agregar
          </Button>
        </div>
        <small className="form-hint" style={{ marginTop: '-8px', marginBottom: '12px', display: 'block' }}>
          {(formData.nutritionFactData || []).filter(nf => nf.nutritionFactId).length} valor(es) nutricional(es) asignado(s)
        </small>

        {loadingNutritionFacts ? (
          <div className="ingredients-loading">
            <div className="spinner"></div>
            <p>Cargando valores nutricionales...</p>
          </div>
        ) : (formData.nutritionFactData || []).length === 0 ? (
          <div className="nutrition-facts-empty">
            <span>📊</span>
            <p>No hay valores nutricionales asignados</p>
            <small>Haz clic en "+ Agregar" para añadir un valor nutricional</small>
          </div>
        ) : (
          <div className="nutrition-facts-table">
            <div className="nutrition-facts-header">
              <span className="nf-col-name">Nutriente</span>
              <span className="nf-col-value">Valor</span>
              <span className="nf-col-unit">Unidad</span>
              <span className="nf-col-action"></span>
            </div>
            {(formData.nutritionFactData || []).map((nfEntry, index) => {
              const usedIds = (formData.nutritionFactData || [])
                .filter((_, i) => i !== index)
                .map(nf => nf.nutritionFactId);
              const availableNutritionFacts = allNutritionFacts.filter(
                nf => !usedIds.includes(nf.id)
              );

              return (
                <div key={index} className="nutrition-fact-row">
                  <select
                    className="form-select nf-col-name"
                    value={nfEntry.nutritionFactId}
                    onChange={(e) => onNutritionFactChange(index, 'nutritionFactId', e.target.value)}
                  >
                    <option value="">Seleccionar nutriente...</option>
                    {availableNutritionFacts.map(nf => (
                      <option key={nf.id} value={nf.id}>
                        {nf.name}{nf.isBeneficial ? ' ✓' : ''}
                      </option>
                    ))}
                    {/* Keep current selection visible even if "used" */}
                    {nfEntry.nutritionFactId && !availableNutritionFacts.find(nf => nf.id === nfEntry.nutritionFactId) && (() => {
                      const current = allNutritionFacts.find(nf => nf.id === nfEntry.nutritionFactId);
                      return current ? <option key={current.id} value={current.id}>{current.name}</option> : null;
                    })()}
                  </select>
                  <input
                    type="number"
                    className="form-input nf-col-value"
                    placeholder="0"
                    value={nfEntry.value}
                    onChange={(e) => onNutritionFactChange(index, 'value', e.target.value)}
                    step="any"
                    min="0"
                  />
                  <select
                    className="form-select nf-col-unit"
                    value={nfEntry.unit}
                    onChange={(e) => onNutritionFactChange(index, 'unit', e.target.value)}
                  >
                    <option value="">Ud.</option>
                    {NUTRITION_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="nf-remove-btn"
                    onClick={() => onRemoveNutritionFact(index)}
                    title="Eliminar valor nutricional"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="form-group-full alert-section">
        <label className="section-label">Alertas Nutricionales</label>
        <div className="alert-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.fatAlert}
              onChange={(e) => onChange({ fatAlert: e.target.checked })}
            />
            <span>Alerta de Grasas</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.saturatedFatAlert}
              onChange={(e) => onChange({ saturatedFatAlert: e.target.checked })}
            />
            <span>Alerta de Grasas Saturadas</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.sugarAlert}
              onChange={(e) => onChange({ sugarAlert: e.target.checked })}
            />
            <span>Alerta de Azúcares</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.sodiumAlert}
              onChange={(e) => onChange({ sodiumAlert: e.target.checked })}
            />
            <span>Alerta de Sodio</span>
          </label>
        </div>
      </div>
    </div>
  );
}
