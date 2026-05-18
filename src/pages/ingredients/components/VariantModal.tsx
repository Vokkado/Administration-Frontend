/**
 * Modal para Crear/Editar Variantes de Ingrediente
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Input, Pagination } from '../../../components/ui';
import type {
  Ingredient,
  IngredientVariant,
  IngredientVariantFormData,
  AttributeForVariant,
  AttributeTypeForVariant,
  Restriction,
  RestrictionType,
} from '../types';
import { RESTRICTION_TYPE_LABELS } from '../types';
import { apiService } from '../../../services/api.service';

interface VariantModalProps {
  show: boolean;
  editingVariant: IngredientVariant | null;
  formData: IngredientVariantFormData;
  ingredients: Ingredient[];
  attributes: AttributeForVariant[];
  attributeTypes: AttributeTypeForVariant[];
  error?: string;
  isValidating?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<IngredientVariantFormData>) => void;
  onValidate?: (id: string, currentState: boolean) => void;
}

export function VariantModal({
  show,
  editingVariant,
  formData,
  ingredients,
  attributes,
  attributeTypes,
  error,
  isValidating = false,
  onClose,
  onSubmit,
  onChange,
  onValidate,
}: VariantModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 15;

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowIngredientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load restrictions once when modal opens
  useEffect(() => {
    if (show && restrictions.length === 0) {
      apiService.get<any>('/restrictions')
        .then(res => setRestrictions(res.data || []))
        .catch(() => {});
    }
  }, [show]);

  // Initialize selected attributes when modal opens
  useEffect(() => {
    if (show) {
      if (editingVariant && formData.attributeIds) {
        setSelectedAttributes(new Set(formData.attributeIds));
      } else {
        setSelectedAttributes(new Set());
      }
      setCurrentPage(1);
      setSearchTerm('');
      setFilterType('ALL');
      // Initialize ingredient search with current ingredient name
      if (editingVariant && formData.ingredientId) {
        const ing = ingredients.find(i => i.id === formData.ingredientId);
        setIngredientSearch(ing ? ing.name : '');
      } else {
        setIngredientSearch('');
      }
      setShowIngredientDropdown(false);
    }
  }, [show, editingVariant]);

  // Compute inherited restrictions from selected attributes
  const inheritedRestrictions = useMemo(() => {
    const restrictionIds = new Set<string>();
    for (const attrId of selectedAttributes) {
      const attr = attributes.find(a => a.id === attrId);
      if (attr?.restrictionIds) {
        for (const rId of attr.restrictionIds) {
          restrictionIds.add(rId);
        }
      }
    }
    return restrictions.filter(r => restrictionIds.has(r.id));
  }, [selectedAttributes, attributes, restrictions]);

  const getRestrictionBadgeClass = (type: RestrictionType): string => {
    const typeMap: Record<string, string> = {
      'ALLERGY': 'allergy',
      'ILLNESS': 'illness',
      'VOLUNTARY': 'voluntary',
      'INVOLUNTARY': 'involuntary',
    };
    return typeMap[type] || 'voluntary';
  };

  const getTypeName = (typeId: string): string => {
    const t = attributeTypes.find(at => at.id === typeId);
    if (!t) return 'Desconocido';
    
    // Transform type names to be more readable
    const typeNameMap: Record<string, string> = {
      'CATEGORY': 'Categoría',
      'ORIGIN': 'Origen',
      'SUBTYPE': 'Subtipo',
      'TECHNOLOGICAL_FUNCTION': 'Función Tecnológica',
      'COOKING_METHOD': 'Método de Cocción',
    };
    
    return typeNameMap[t.type] || t.type;
  };

  // Filter attributes
  const filteredAttributes = attributes.filter(attr => {
    const matchesSearch = attr.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || attr.typeId === filterType;
    return matchesSearch && matchesType;
  });

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Ordenar: seleccionados primero
  const sortedAttributes = [...filteredAttributes].sort((a, b) => {
    const aSelected = selectedAttributes.has(a.id) ? 0 : 1;
    const bSelected = selectedAttributes.has(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  // Pagination
  const totalPages = Math.ceil(sortedAttributes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAttributes = sortedAttributes.slice(startIndex, startIndex + itemsPerPage);

  const handleAttributeToggle = (attributeId: string) => {
    const newSelected = new Set(selectedAttributes);
    if (newSelected.has(attributeId)) {
      newSelected.delete(attributeId);
    } else {
      newSelected.add(attributeId);
    }
    setSelectedAttributes(newSelected);
    onChange({ attributeIds: Array.from(newSelected) });
  };

  // Filter ingredients for autocomplete
  const filteredIngredients = ingredients
    .filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);

  const handleIngredientSelect = (ing: Ingredient) => {
    onChange({ ingredientId: ing.id });
    setIngredientSearch(ing.name);
    setShowIngredientDropdown(false);
  };

  const handleIngredientSearchChange = (value: string) => {
    setIngredientSearch(value);
    setShowIngredientDropdown(true);
    // Clear selection if text doesn't match any ingredient
    if (!ingredients.some(ing => ing.name.toLowerCase() === value.toLowerCase())) {
      onChange({ ingredientId: '' });
    }
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      title={editingVariant ? 'Editar Variante de Ingrediente' : 'Agregar Variante de Ingrediente'}
      onClose={onClose}
      error={error}
      maxWidth="1100px"
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="variant-form">
          <div className="modal-form-columns">
            {/* Left Column - Basic Info */}
            <div className="modal-form-left">
              <div className="form-group">
                <label className="form-label">Ingrediente Base *</label>
                <div className="autocomplete-container" ref={autocompleteRef}>
                  <Input
                    type="text"
                    placeholder="Buscar ingrediente..."
                    value={ingredientSearch}
                    onChange={(e) => handleIngredientSearchChange(e.target.value)}
                    onFocus={() => setShowIngredientDropdown(true)}
                    fullWidth
                    required={!formData.ingredientId}
                  />
                  {showIngredientDropdown && ingredientSearch && filteredIngredients.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredIngredients.map(ing => (
                        <div
                          key={ing.id}
                          className={`autocomplete-item ${formData.ingredientId === ing.id ? 'selected' : ''}`}
                          onClick={() => handleIngredientSelect(ing)}
                        >
                          {ing.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {showIngredientDropdown && ingredientSearch && filteredIngredients.length === 0 && (
                    <div className="autocomplete-dropdown">
                      <div className="autocomplete-empty">No se encontraron ingredientes</div>
                    </div>
                  )}
                </div>
                {formData.ingredientId && (
                  <small className="form-hint" style={{ color: '#5B8806' }}>
                    ✓ Ingrediente seleccionado
                  </small>
                )}
                {!formData.ingredientId && ingredientSearch && (
                  <small className="form-hint" style={{ color: '#F57C00' }}>
                    Selecciona un ingrediente de la lista
                  </small>
                )}
              </div>

              <Input
                type="text"
                label="Nombre de la Variante *"
                placeholder="Ej: Azúcar blanca"
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={255}
                title="El nombre no puede exceder 255 caracteres"
                required
                fullWidth
              />
              <small className="form-hint">
                {formData.name.length}/255 caracteres
              </small>
            </div>

            {/* Right Column - Attributes + Inherited Restrictions */}
            <div className="modal-form-right variant-modal-right">
              {/* Restricciones heredadas de los atributos seleccionados */}
              <div className="inherited-restrictions-section">
                {selectedAttributes.size === 0 ? (
                  <p className="inherited-restrictions-empty">
                    Selecciona atributos para ver las restricciones asociadas
                  </p>
                ) : inheritedRestrictions.length === 0 ? (
                  <p className="inherited-restrictions-empty">
                    Los atributos seleccionados no tienen restricciones asociadas
                  </p>
                ) : (
                  <div className="inherited-restrictions-list">
                    {inheritedRestrictions.map(r => (
                      <div key={r.id} className="inherited-restriction-item">
                        <span className="inherited-restriction-name">{r.name}</span>
                        <span className={`restriction-badge ${getRestrictionBadgeClass(r.type)}`}>
                          {RESTRICTION_TYPE_LABELS[r.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="restrictions-section">
                <h3 className="section-title">Atributos de la Variante</h3>
                
                {/* Search */}
                <div className="restrictions-search">
                  <Input
                    type="text"
                    label=""
                    placeholder="Buscar atributos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                  />
                </div>

                {/* Type filter chips */}
                <div className="restrictions-filters">
                  <button
                    type="button"
                    className={`restriction-filter-chip ${filterType === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilterType('ALL')}
                  >
                    Todos
                  </button>
                  {attributeTypes.map(at => (
                    <button
                      key={at.id}
                      type="button"
                      className={`restriction-filter-chip ${filterType === at.id ? 'active' : ''}`}
                      onClick={() => setFilterType(at.id)}
                    >
                      {getTypeName(at.id)}
                    </button>
                  ))}
                </div>

                {/* Scrollable list */}
                <div className="restrictions-list-container">
                  {attributes.length === 0 ? (
                    <div className="restrictions-empty">
                      No hay atributos disponibles
                    </div>
                  ) : filteredAttributes.length === 0 ? (
                    <div className="restrictions-empty">
                      No se encontraron atributos con los filtros aplicados
                    </div>
                  ) : (
                    <div className="restrictions-list">
                      {paginatedAttributes.map((attr) => (
                        <div
                          key={attr.id}
                          className={`restriction-item ${selectedAttributes.has(attr.id) ? 'selected' : ''}`}
                          onClick={() => handleAttributeToggle(attr.id)}
                        >
                          <input
                            type="checkbox"
                            className="restriction-checkbox"
                            checked={selectedAttributes.has(attr.id)}
                            onChange={() => handleAttributeToggle(attr.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="restriction-info">
                            <div className="restriction-name">{attr.name}</div>
                            <div className="restriction-meta">
                              <span className="restriction-badge voluntary">
                                {getTypeName(attr.typeId)}
                              </span>
                              {attr.score !== undefined && attr.score !== null && (
                                <span className="attribute-score-badge" style={{
                                  backgroundColor: `${getScoreColor(attr.score)}20`,
                                  color: getScoreColor(attr.score),
                                  border: `1px solid ${getScoreColor(attr.score)}`,
                                  borderRadius: '8px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}>
                                  {attr.score}/10
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {filteredAttributes.length > itemsPerPage && (
                  <div className="restrictions-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}

                {/* Selected count */}
                <div className="restrictions-selected-count">
                  <strong>{selectedAttributes.size}</strong> atributo{selectedAttributes.size !== 1 ? 's' : ''} seleccionado{selectedAttributes.size !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={isValidating}>
          Cancelar
        </Button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editingVariant && onValidate && (
            <Button
              type="button"
              variant={editingVariant.isInspected ? 'outline' : 'primary'}
              loading={isValidating}
              onClick={() => onValidate(editingVariant.id, editingVariant.isInspected)}
            >
              {editingVariant.isInspected ? '✖ Desvalidar' : '✔ Validar'}
            </Button>
          )}
          <Button type="submit" variant="primary" form="variant-form" disabled={isValidating}>
            {editingVariant ? 'Guardar Cambios' : 'Crear Variante'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#388E3C';
  if (score >= 5) return '#FBC02D';
  if (score >= 3) return '#F57C00';
  return '#D32F2F';
}
