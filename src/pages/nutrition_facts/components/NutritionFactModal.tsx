/**
 * Modal para crear/editar valores nutricionales
 */
import { useEffect, useState } from 'react';
import type { Nutrition_Fact, NutritionFactFormData } from '../types';
import { BASE_UNITS } from '../types';
import { Modal, Button } from '../../../components/ui';

interface NutritionFactModalProps {
  show: boolean;
  editingNutritionFact: Nutrition_Fact | null;
  formData: NutritionFactFormData;
  error: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<NutritionFactFormData>) => void;
}

export function NutritionFactModal({
  show,
  editingNutritionFact,
  formData,
  error,
  loading = false,
  onClose,
  onSubmit,
  onChange,
}: NutritionFactModalProps) {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'LIMITS'>('GENERAL');

  useEffect(() => {
    if (show) {
      setActiveTab('GENERAL');
    }
  }, [show, editingNutritionFact]);

  return (
    <Modal
      show={show}
      title={`${editingNutritionFact ? 'Editar' : 'Agregar'} Valor Nutricional`}
      onClose={onClose}
      error={error}
      maxWidth="600px"
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="nutrition-fact-form">
          <div className="nutrition-fact-modal-tabs">
            <button
              type="button"
              className={`nutrition-fact-modal-tab ${activeTab === 'GENERAL' ? 'active' : ''}`}
              onClick={() => setActiveTab('GENERAL')}
            >
              General
            </button>
            <button
              type="button"
              className={`nutrition-fact-modal-tab ${activeTab === 'LIMITS' ? 'active' : ''}`}
              onClick={() => setActiveTab('LIMITS')}
            >
              Límites
            </button>
          </div>

          {activeTab === 'GENERAL' && (
            <>
              <div className="form-group">
                <label htmlFor="name">
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="Ej: Calorías, Proteínas, Carbohidratos..."
                  maxLength={255}
                  title="El nombre no puede exceder 255 caracteres"
                  required
                />
                <small className="form-hint">
                  {formData.name.length}/255 caracteres
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="baseUnit">
                  Unidad Base <span className="required">*</span>
                </label>
                <select
                  id="baseUnit"
                  value={formData.baseUnit}
                  onChange={(e) => onChange({ baseUnit: e.target.value })}
                  required
                >
                  {BASE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                <small className="form-hint">
                  Unidad de medida por defecto para este valor nutricional
                </small>
              </div>

             <div className="form-group">
              <label>Tipo de beneficio</label>
              <select
                value={formData.benefit}
                onChange={(e) => onChange({ benefit: e.target.value as any })}
              >
                <option value="BENEFICIAL">Beneficioso</option>
                <option value="NOT_BENEFICIAL">No beneficioso</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="TOTAL_FATS">Grasas totales</option>
              </select>
              <small className="form-hint">
                Beneficioso: suma al score. No beneficioso: resta. Neutral: solo informativo en highlights. Grasas totales: ignorado.
              </small>
            </div>
            </>
          )}

          {activeTab === 'LIMITS' && (
            <div className="nutrition-fact-limits-grid">
              <section className="nutrition-fact-limits-section">
                <h4>Sólidos</h4>
                <div className="form-group">
                  <label htmlFor="solidMin">Límite mínimo sólido</label>
                  <input
                    type="number"
                    id="solidMin"
                    step="any"
                    value={formData.solidMin}
                    onChange={(e) => onChange({ solidMin: e.target.value })}
                    placeholder="Ej: 0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="solidMaxScore">Puntaje máximo sólido</label>
                  <input
                    type="number"
                    id="solidMaxScore"
                    step="any"
                    value={formData.solidMaxScore}
                    onChange={(e) => onChange({ solidMaxScore: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="solidNutritionLimit">Límite nutricional sólido</label>
                  <input
                    type="number"
                    id="solidNutritionLimit"
                    step="any"
                    value={formData.solidNutritionLimit}
                    onChange={(e) => onChange({ solidNutritionLimit: e.target.value })}
                    placeholder="Ej: 15"
                  />
                </div>
              </section>

              <section className="nutrition-fact-limits-section">
                <h4>Líquidos</h4>
                <div className="form-group">
                  <label htmlFor="liquidMin">Límite mínimo líquido</label>
                  <input
                    type="number"
                    id="liquidMin"
                    step="any"
                    value={formData.liquidMin}
                    onChange={(e) => onChange({ liquidMin: e.target.value })}
                    placeholder="Ej: 0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="liquidMaxScore">Puntaje máximo líquido</label>
                  <input
                    type="number"
                    id="liquidMaxScore"
                    step="any"
                    value={formData.liquidMaxScore}
                    onChange={(e) => onChange({ liquidMaxScore: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="liquidNutritionLimit">Límite nutricional líquido</label>
                  <input
                    type="number"
                    id="liquidNutritionLimit"
                    step="any"
                    value={formData.liquidNutritionLimit}
                    onChange={(e) => onChange({ liquidNutritionLimit: e.target.value })}
                    placeholder="Ej: 7"
                  />
                </div>
              </section>
            </div>
          )}
        </form>
      </div>

      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" form="nutrition-fact-form" loading={loading}>
          {editingNutritionFact ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </Modal>
  );
}
