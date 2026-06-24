/**
 * Modal para Unificar Alérgenos
 * Flujo de 2 pasos:
 * 1. Seleccionar alérgeno padre (que se mantiene)
 * 2. Seleccionar alérgenos hijos (que se unifican)
 */
import { useState, useEffect } from 'react';
import { Button, Input } from '../../../components/ui';
import type { Allergen } from '../types';
import { matchesSearch } from '../../../utils/search';
import './MergeAllergensModal.css';

interface MergeAllergensModalProps {
  show: boolean;
  allergens: Allergen[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (parentId: string, childrenIds: string[]) => Promise<void>;
}

type Step = 'parent' | 'children' | 'confirm';

export function MergeAllergensModal({
  show,
  allergens,
  loading,
  onClose,
  onConfirm
}: MergeAllergensModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('parent');
  const [searchTerm, setSearchTerm] = useState('');
  const [childrenSearchTerm, setChildrenSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<Allergen | null>(null);
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

  const filteredAllergens = allergens.filter(a =>
    matchesSearch(a.name, searchTerm)
  );

  const availableChildren = allergens.filter(a => a.id !== selectedParent?.id);

  const filteredChildrenAllergens = availableChildren.filter(a =>
    matchesSearch(a.name, childrenSearchTerm)
  );

  const handleSelectParent = (allergen: Allergen) => {
    setSelectedParent(allergen);
    setSearchTerm('');
    setCurrentStep('children');
    setError('');
  };

  const handleToggleChild = (allergenId: string) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(allergenId)) {
      newSelected.delete(allergenId);
    } else {
      newSelected.add(allergenId);
    }
    setSelectedChildren(newSelected);
  };

  const handleNext = () => {
    if (selectedChildren.size === 0) {
      setError('Debe seleccionar al menos un alérgeno para unificar');
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
      setError(err.message || 'Error al unificar alérgenos');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="merge-modal-overlay">
      <div className="merge-modal-content">
        <div className="merge-modal-header">
          <h3>Unificar Alérgenos</h3>
          <button className="merge-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="merge-modal-body">
          {/* PASO 1: Seleccionar Padre */}
          {currentStep === 'parent' && (
            <div className="merge-step">
              <div className="step-indicator">
                <span className="step-number">Paso 1 de 3</span>
                <h4>Seleccionar alérgeno a mantener</h4>
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
                  placeholder="Buscar alérgeno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>

              <div className="merge-list">
                {loading ? (
                  <div className="merge-loading">Cargando alérgenos...</div>
                ) : filteredAllergens.length === 0 ? (
                  <div className="merge-empty">No se encontraron alérgenos</div>
                ) : (
                  filteredAllergens.map((allergen) => (
                    <div
                      key={allergen.id}
                      className="merge-item"
                      onClick={() => handleSelectParent(allergen)}
                    >
                      <div className="merge-item-content">
                        <div className="merge-item-name">{allergen.name}</div>
                        <div className="merge-item-type">
                          {allergen.inspected ? '✅ Validado' : '⏳ Sin validar'}
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
                <h4>Seleccionar alérgenos a unificar</h4>
              </div>

              <div className="merge-parent-summary">
                <div className="summary-label">Alérgeno padre:</div>
                <div className="summary-value">{selectedParent.name}</div>
                <p className="summary-hint">
                  Este alérgeno mantiene su identidad. Los alérgenos seleccionados abajo
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
                    placeholder="Buscar alérgeno..."
                    value={childrenSearchTerm}
                    onChange={(e) => setChildrenSearchTerm(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <div className="merge-children-list">
                {filteredChildrenAllergens.length === 0 ? (
                  <div className="merge-empty">
                    {availableChildren.length === 0
                      ? 'No hay otros alérgenos disponibles'
                      : 'No se encontraron alérgenos con los filtros aplicados'}
                  </div>
                ) : (
                  filteredChildrenAllergens.map((allergen) => (
                    <div
                      key={allergen.id}
                      className={`merge-child-item ${selectedChildren.has(allergen.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleChild(allergen.id)}
                    >
                      <input
                        type="checkbox"
                        className="merge-checkbox"
                        checked={selectedChildren.has(allergen.id)}
                        onChange={() => handleToggleChild(allergen.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="merge-child-content">
                        <div className="merge-child-name">{allergen.name}</div>
                        <div className="merge-child-meta">
                          {allergen.inspected ? '✅ Validado' : '⏳ Sin validar'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="merge-children-count">
                {selectedChildren.size} alérgeno{selectedChildren.size !== 1 ? 's' : ''} seleccionado{selectedChildren.size !== 1 ? 's' : ''}
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
                  <h5>Alérgeno padre (se mantiene):</h5>
                  <div className="confirmation-item parent">
                    <span className="confirmation-name">{selectedParent.name}</span>
                  </div>
                </div>

                <div className="confirmation-arrow">⬇️</div>

                <div className="confirmation-section">
                  <h5>Alérgenos a unificar ({selectedChildren.size}):</h5>
                  <div className="confirmation-children">
                    {Array.from(selectedChildren).map((childId) => {
                      const child = availableChildren.find(a => a.id === childId);
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
                    serán transferidas al alérgeno padre. Los alérgenos seleccionados serán
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
