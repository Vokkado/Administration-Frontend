/**
 * Modal para Unificar Variantes de Ingredientes
 * Flujo de 2 pasos:
 * 1. Seleccionar variante padre (que se mantiene)
 * 2. Seleccionar variantes hijas (que se unifican)
 */
import { useState, useEffect } from 'react';
import { Button, Input } from '../../../components/ui';
import type { IngredientVariant } from '../types';
import './MergeIngredientsModal.css';

interface MergeIngredientVariantsModalProps {
  show: boolean;
  variants: IngredientVariant[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (parentId: string, childrenIds: string[]) => Promise<void>;
  getIngredientName: (ingredientId: string) => string;
}

type Step = 'parent' | 'children' | 'confirm';

export function MergeIngredientVariantsModal({
  show,
  variants,
  loading,
  onClose,
  onConfirm,
  getIngredientName
}: MergeIngredientVariantsModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('parent');
  const [searchTerm, setSearchTerm] = useState('');
  const [childrenSearchTerm, setChildrenSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<IngredientVariant | null>(null);
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

  const filteredVariants = variants.filter(variant =>
    variant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getIngredientName(variant.ingredientId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Solo permitir unificar variantes del mismo ingrediente
  const availableChildren = selectedParent
    ? variants.filter(v => 
        v.id !== selectedParent.id && 
        v.ingredientId === selectedParent.ingredientId
      )
    : [];

  const filteredChildrenVariants = availableChildren.filter(variant => {
    const matchesSearch = variant.name.toLowerCase().includes(childrenSearchTerm.toLowerCase()) ||
      getIngredientName(variant.ingredientId).toLowerCase().includes(childrenSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSelectParent = (variant: IngredientVariant) => {
    setSelectedParent(variant);
    setSearchTerm('');
    setCurrentStep('children');
    setError('');
  };

  const handleToggleChild = (variantId: string) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedChildren(newSelected);
  };

  const handleNext = () => {
    if (selectedChildren.size === 0) {
      setError('Debe seleccionar al menos una variante para unificar');
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
      setError(err.message || 'Error al unificar variantes');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="merge-modal-overlay">
      <div className="merge-modal-content">
        <div className="merge-modal-header">
          <h3>Unificar Variantes de Ingredientes</h3>
          <button className="merge-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="merge-modal-body">
          {/* PASO 1: Seleccionar Padre */}
          {currentStep === 'parent' && (
            <div className="merge-step">
              <div className="step-indicator">
                <span className="step-number">Paso 1 de 3</span>
                <h4>Seleccionar variante a mantener</h4>
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
                  placeholder="Buscar variante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>

              <div className="merge-list">
                {loading ? (
                  <div className="merge-loading">Cargando variantes...</div>
                ) : filteredVariants.length === 0 ? (
                  <div className="merge-empty">No se encontraron variantes</div>
                ) : (
                  filteredVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="merge-item"
                      onClick={() => handleSelectParent(variant)}
                    >
                      <div className="merge-item-content">
                        <div className="merge-item-name">{variant.name}</div>
                        <div className="merge-item-type">
                          Ingrediente: {getIngredientName(variant.ingredientId)}
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
                <h4>Seleccionar variantes a unificar</h4>
              </div>

              <div className="merge-parent-summary">
                <div className="summary-label">Variante padre:</div>
                <div className="summary-value">{selectedParent.name}</div>
                <p className="summary-hint">
                  Esta variante mantiene su identidad. Las variantes seleccionadas abajo
                  serán unificadas con esta (solo del mismo ingrediente: <strong>{getIngredientName(selectedParent.ingredientId)}</strong>).
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
                    placeholder="Buscar variante..."
                    value={childrenSearchTerm}
                    onChange={(e) => setChildrenSearchTerm(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <div className="merge-children-list">
                {filteredChildrenVariants.length === 0 ? (
                  <div className="merge-empty">
                    {availableChildren.length === 0
                      ? 'No hay otras variantes del mismo ingrediente disponibles'
                      : 'No se encontraron variantes con los filtros aplicados'}
                  </div>
                ) : (
                  filteredChildrenVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`merge-child-item ${selectedChildren.has(variant.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleChild(variant.id)}
                    >
                      <input
                        type="checkbox"
                        className="merge-checkbox"
                        checked={selectedChildren.has(variant.id)}
                        onChange={() => handleToggleChild(variant.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="merge-child-content">
                        <div className="merge-child-name">{variant.name}</div>
                        <div className="merge-child-meta">
                          Ingrediente: {getIngredientName(variant.ingredientId)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="merge-children-count">
                {selectedChildren.size} variante{selectedChildren.size !== 1 ? 's' : ''} seleccionada{selectedChildren.size !== 1 ? 's' : ''}
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
                  <h5>Variante padre (se mantiene):</h5>
                  <div className="confirmation-item parent">
                    <span className="confirmation-name">
                      {selectedParent.name}
                      <small style={{ marginLeft: '8px', color: '#666' }}>
                        ({getIngredientName(selectedParent.ingredientId)})
                      </small>
                    </span>
                  </div>
                </div>

                <div className="confirmation-arrow">⬇️</div>

                <div className="confirmation-section">
                  <h5>Variantes a unificar ({selectedChildren.size}):</h5>
                  <div className="confirmation-children">
                    {Array.from(selectedChildren).map((childId) => {
                      const child = availableChildren.find(v => v.id === childId);
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
                    <strong>Advertencia:</strong> Todas las relaciones de productos y atributos
                    serán transferidas a la variante padre. Las variantes seleccionadas serán
                    eliminadas. <strong>Esta acción es irreversible.</strong>
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
