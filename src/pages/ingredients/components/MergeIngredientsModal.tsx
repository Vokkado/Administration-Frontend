/**
 * Modal para Unificar Ingredientes
 * Flujo de 2 pasos:
 * 1. Seleccionar ingrediente padre (que se mantiene)
 * 2. Seleccionar ingredientes hijos (que se unifican)
 */
import { useState, useEffect } from 'react';
import { Button, Input } from '../../../components/ui';
import type { Ingredient } from '../types';
import { RISK_LABELS } from '../types';
import './MergeIngredientsModal.css';

interface MergeIngredientsModalProps {
  show: boolean;
  ingredients: Ingredient[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (parentId: string, childrenIds: string[]) => Promise<void>;
}

type Step = 'parent' | 'children' | 'confirm';

export function MergeIngredientsModal({
  show,
  ingredients,
  loading,
  onClose,
  onConfirm
}: MergeIngredientsModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('parent');
  const [searchTerm, setSearchTerm] = useState('');
  const [childrenSearchTerm, setChildrenSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<Ingredient | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Resetear estado cuando se abre/cierra el modal
  useEffect(() => {
    if (!show) {
      setCurrentStep('parent');
      setSearchTerm('');
      setChildrenSearchTerm('');
      setSelectedParent(null);
      setSelectedChildren(new Set());
      setError('');
    }
  }, [show]);

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableChildren = ingredients.filter(ing => ing.id !== selectedParent?.id);

  const filteredChildrenIngredients = availableChildren.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(childrenSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSelectParent = (ingredient: Ingredient) => {
    setSelectedParent(ingredient);
    setSearchTerm('');
    setCurrentStep('children');
    setError('');
  };

  const handleToggleChild = (ingredientId: string) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId);
    } else {
      newSelected.add(ingredientId);
    }
    setSelectedChildren(newSelected);
  };

  const handleNext = () => {
    if (selectedChildren.size === 0) {
      setError('Debe seleccionar al menos un ingrediente para unificar');
      return;
    }
    setError('');
    setCurrentStep('confirm');
  };

  const handleBack = () => {
    if (currentStep === 'children') {
      setCurrentStep('parent');
      setSelectedChildren(new Set());
      setError('');
    } else if (currentStep === 'confirm') {
      setCurrentStep('children');
      setError('');
    }
  };

  const handleConfirm = async () => {
    if (!selectedParent) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedParent.id, Array.from(selectedChildren));
      // El modal se cierra desde el componente padre
    } catch (err: any) {
      setError(err.message || 'Error al unificar ingredientes');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="merge-modal-overlay">
      <div className="merge-modal-content">
        <div className="merge-modal-header">
          <h3>Unificar Ingredientes</h3>
          <button className="merge-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="merge-modal-body">
          {/* PASO 1: Seleccionar Padre */}
          {currentStep === 'parent' && (
            <div className="merge-step">
              <div className="step-indicator">
                <span className="step-number">Paso 1 de 3</span>
                <h4>Seleccionar ingrediente a mantener</h4>
              </div>

              {error && (
                <div className="merge-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div className="merge-search">
                <Input
                  type="text"
                  label=""
                  placeholder="Buscar ingrediente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>

              <div className="merge-list">
                {loading ? (
                  <div className="merge-loading">Cargando ingredientes...</div>
                ) : filteredIngredients.length === 0 ? (
                  <div className="merge-empty">No se encontraron ingredientes</div>
                ) : (
                  filteredIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="merge-item"
                      onClick={() => handleSelectParent(ingredient)}
                    >
                      <div className="merge-item-content">
                        <div className="merge-item-name">{ingredient.name}</div>
                        <div className="merge-item-type">
                          Riesgo: {RISK_LABELS[ingredient.toxicityLevel as keyof typeof RISK_LABELS] || ingredient.toxicityLevel || 'N/A'}
                        </div>
                      </div>
                      <div className="merge-item-action">→</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PASO 2: Seleccionar Hijos */}
          {currentStep === 'children' && selectedParent && (
            <div className="merge-step">
              <div className="step-indicator">
                <span className="step-number">Paso 2 de 3</span>
                <h4>Seleccionar ingredientes a unificar</h4>
              </div>

              <div className="merge-parent-summary">
                <div className="summary-label">Ingrediente padre:</div>
                <div className="summary-value">{selectedParent.name}</div>
                <p className="summary-hint">
                  Este ingrediente mantiene su identidad. Los ingredientes seleccionados abajo
                  serán unificados con este.
                </p>
              </div>

              {error && (
                <div className="merge-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div className="merge-filters">
                <div className="merge-search">
                  <Input
                    type="text"
                    label=""
                    placeholder="Buscar ingrediente..."
                    value={childrenSearchTerm}
                    onChange={(e) => setChildrenSearchTerm(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <div className="merge-children-list">
                {filteredChildrenIngredients.length === 0 ? (
                  <div className="merge-empty">
                    {availableChildren.length === 0
                      ? 'No hay otros ingredientes disponibles'
                      : 'No se encontraron ingredientes con los filtros aplicados'}
                  </div>
                ) : (
                  filteredChildrenIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className={`merge-child-item ${selectedChildren.has(ingredient.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleChild(ingredient.id)}
                    >
                      <input
                        type="checkbox"
                        className="merge-checkbox"
                        checked={selectedChildren.has(ingredient.id)}
                        onChange={() => handleToggleChild(ingredient.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="merge-child-content">
                        <div className="merge-child-name">{ingredient.name}</div>
                        <div className="merge-child-meta">
                          Riesgo: {RISK_LABELS[ingredient.toxicityLevel as keyof typeof RISK_LABELS] || ingredient.toxicityLevel || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="merge-children-count">
                {selectedChildren.size} ingrediente{selectedChildren.size !== 1 ? 's' : ''} seleccionado{selectedChildren.size !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* PASO 3: Confirmación */}
          {currentStep === 'confirm' && selectedParent && (
            <div className="merge-step">
              <div className="step-indicator">
                <span className="step-number">Paso 3 de 3</span>
                <h4>Confirmar unificación</h4>
              </div>

              <div className="merge-confirmation">
                <div className="confirmation-section">
                  <h5>Ingrediente padre (se mantiene):</h5>
                  <div className="confirmation-item parent">
                    <span className="confirmation-name">{selectedParent.name}</span>
                  </div>
                </div>

                <div className="confirmation-arrow">⬇️</div>

                <div className="confirmation-section">
                  <h5>Ingredientes a unificar ({selectedChildren.size}):</h5>
                  <div className="confirmation-children">
                    {Array.from(selectedChildren).map((childId) => {
                      const child = availableChildren.find(ing => ing.id === childId);
                      return (
                        <div key={childId} className="confirmation-item child">
                          <span className="confirmation-name">{child?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="confirmation-warning">
                  <span className="warning-icon">⚠️</span>
                  <p>
                    <strong>Advertencia:</strong> Todas las relaciones de productos y restricciones
                    serán transferidas al ingrediente padre. Los ingredientes seleccionados serán
                    eliminados. <strong>Esta acción es irreversible.</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="merge-modal-footer">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 'parent' ? onClose : handleBack}
          >
            {currentStep === 'parent' ? 'Cancelar' : 'Atrás'}
          </Button>

          {currentStep !== 'confirm' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={!selectedParent && currentStep === 'parent'}
            >
              {currentStep === 'parent' ? 'Siguiente' : 'Revisar'}
            </Button>
          )}

          {currentStep === 'confirm' && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Unificando...' : 'Confirmar Unificación'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
