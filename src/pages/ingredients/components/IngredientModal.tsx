/**
 * Modal para Crear/Editar Ingredientes
 */
import { useState, useEffect } from 'react';
import { Modal, Button, Input, Pagination } from '../../../components/ui';
import type { 
  Ingredient, 
  IngredientFormData, 
  RiskLevel,
  Restriction,
  RestrictionType 
} from '../types';
import { 
  RISK_LABELS, 
  RESTRICTION_TYPE_LABELS,
} from '../types';
import { apiService } from '../../../services/api.service';
import { matchesSearch } from '../../../utils/search';

interface IngredientModalProps {
  show: boolean;
  editingIngredient: Ingredient | null;
  formData: IngredientFormData;
  error?: string;
  isValidating?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<IngredientFormData>) => void;
  onValidate?: (id: string, currentState: boolean) => void;
}

type RestrictionFilterType = 'ALL' | RestrictionType;
type StatusFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';
type AbsoluteFilterType = 'ALL' | 'ABSOLUTE' | 'NOT_ABSOLUTE';

export function IngredientModal({
  show,
  editingIngredient,
  formData,
  error,
  isValidating = false,
  onClose,
  onSubmit,
  onChange,
  onValidate,
}: IngredientModalProps) {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RestrictionFilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ACTIVE');
  const [absoluteFilter, setAbsoluteFilter] = useState<AbsoluteFilterType>('ABSOLUTE');
  const [selectedRestrictions, setSelectedRestrictions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Cargar restricciones cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadRestrictions();
      // Inicializar restricciones seleccionadas si estamos editando
      if (editingIngredient && formData.restrictionIds) {
        setSelectedRestrictions(new Set(formData.restrictionIds));
      } else {
        setSelectedRestrictions(new Set());
      }
      // Resetear página al abrir modal
      setCurrentPage(1);
      setSearchTerm('');
      setSelectedFilter('ALL');
      setStatusFilter('ACTIVE');
      setAbsoluteFilter('ABSOLUTE');
    }
  }, [show, editingIngredient]);

  const loadRestrictions = async () => {
    setLoadingRestrictions(true);
    try {
      const response = await apiService.get<any>('/restrictions');
      setRestrictions(response.data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading restrictions:', err);
    } finally {
      setLoadingRestrictions(false);
    }
  };

  // Filtrar restricciones según búsqueda, tipo, estado y absoluta
  const filteredRestrictions = restrictions.filter(restriction => {
    const matchesAbsolute = absoluteFilter === 'ALL' ||
      (absoluteFilter === 'ABSOLUTE' ? restriction.isAbsolute : !restriction.isAbsolute);
    const matchesName = matchesSearch(restriction.name, searchTerm);
    const matchesFilter = selectedFilter === 'ALL' || restriction.type === selectedFilter;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' ? restriction.active : !restriction.active);
    return matchesAbsolute && matchesName && matchesFilter && matchesStatus;
  });

  // Resetear a página 1 cuando cambien los filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, statusFilter, absoluteFilter]);

  // Ordenar: seleccionados primero
  const sortedRestrictions = [...filteredRestrictions].sort((a, b) => {
    const aSelected = selectedRestrictions.has(a.id) ? 0 : 1;
    const bSelected = selectedRestrictions.has(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  // Calcular paginación
  const totalPages = Math.ceil(sortedRestrictions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRestrictions = sortedRestrictions.slice(startIndex, endIndex);

  const handleRestrictionToggle = (restrictionId: string) => {
    const newSelected = new Set(selectedRestrictions);
    if (newSelected.has(restrictionId)) {
      newSelected.delete(restrictionId);
    } else {
      newSelected.add(restrictionId);
    }
    setSelectedRestrictions(newSelected);
    onChange({ restrictionIds: Array.from(newSelected) });
  };

  const getRestrictionBadgeClass = (type: RestrictionType): string => {
    const typeMap: Record<RestrictionType, string> = {
      'ALLERGY': 'allergy',
      'ILLNESS': 'illness',
      'VOLUNTARY': 'voluntary',
      'INVOLUNTARY': 'involuntary'
    };
    return typeMap[type] || 'voluntary';
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      title={editingIngredient ? 'Editar ingrediente' : 'Agregar ingrediente'}
      onClose={onClose}
      error={error}
      maxWidth="1100px"
    >
        <div className="modal-body">
          <form className="modal-form" onSubmit={onSubmit} id="ingredient-form">
            <div className="modal-form-columns">
              {/* Columna Izquierda - Información Básica */}
              <div className="modal-form-left">
              <Input
                type="text"
                label="Nombre *"
                placeholder="Ej: Glucosa"
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={255}
                title="El nombre no puede exceder 255 caracteres"
                required
                fullWidth
              />

              <div className="form-group">
                <label>Nivel de Riesgo *</label>
                <select 
                  className="select"
                  value={formData.toxicityLevel}
                  onChange={(e) => onChange({ toxicityLevel: e.target.value as RiskLevel })}
                  required
                >
                  {Object.entries(RISK_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Puntuación (1-10) *</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Ej: 7"
                  value={formData.score}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 10) {
                      onChange({ score: e.target.value });
                    } else if (e.target.value === '') {
                      onChange({ score: '' });
                    }
                  }}
                  required
                  fullWidth
                />
                <small className="form-hint">
                  Ingrese un valor entre 1 (peor) y 10 (mejor)
                </small>
              </div>

              <div className="form-group">
                <label>Justificación del riesgo y puntuación</label>
                <textarea
                  className="textarea"
                  placeholder="Ej: Clasificado como riesgo medio debido a estudios que indican posibles efectos adversos en consumo excesivo..."
                  value={formData.reason || ''}
                  onChange={(e) => onChange({ reason: e.target.value })}
                  rows={3}
                  maxLength={1000}
                />
                <small className="form-hint">
                  Explica brevemente por qué se asignó este nivel de riesgo y puntuación
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isNutritive}
                    onChange={(e) => onChange({ isNutritive: e.target.checked })}
                  />
                  <span>Es nutritivo</span>
                </label>
                <small className="form-hint">
                  Indica si este ingrediente aporta valor nutricional
                </small>
              </div>
            </div>

            {/* Columna Derecha - Restricciones */}
            <div className="modal-form-right">
              <div className="restrictions-section">
                {/* Buscador */}
                <div className="restrictions-search">
                  <Input
                    type="text"
                    label=""
                    placeholder="Buscar restricciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                  />
                </div>

                {/* Filtros por tipo */}
                <div className="restrictions-filters">
                  <button
                    type="button"
                    className={`restriction-filter-chip ${selectedFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('ALL')}
                  >
                    Todas
                  </button>
                  {Object.entries(RESTRICTION_TYPE_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`restriction-filter-chip ${selectedFilter === value ? 'active' : ''}`}
                      onClick={() => setSelectedFilter(value as RestrictionType)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Filtros por estado */}
                <div className="restrictions-status-filters">
                  <span className="status-filter-label">Estado:</span>
                  <button
                    type="button"
                    className={`status-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    className={`status-filter-btn status-active ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ACTIVE')}
                  >
                    ✓ Activas
                  </button>
                  <button
                    type="button"
                    className={`status-filter-btn status-inactive ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('INACTIVE')}
                  >
                    ✗ Inactivas
                  </button>
                </div>

                {/* Filtros por absoluta */}
                <div className="restrictions-status-filters">
                  <span className="status-filter-label">Tipo:</span>
                  <button
                    type="button"
                    className={`status-filter-btn ${absoluteFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setAbsoluteFilter('ALL')}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    className={`status-filter-btn ${absoluteFilter === 'ABSOLUTE' ? 'active' : ''}`}
                    onClick={() => setAbsoluteFilter('ABSOLUTE')}
                  >
                    Absoluta
                  </button>
                  <button
                    type="button"
                    className={`status-filter-btn ${absoluteFilter === 'NOT_ABSOLUTE' ? 'active' : ''}`}
                    onClick={() => setAbsoluteFilter('NOT_ABSOLUTE')}
                  >
                    No absoluta
                  </button>
                </div>

                {/* Lista de restricciones con scroll */}
                <div className="restrictions-list-container">
                  {loadingRestrictions ? (
                    <div className="restrictions-loading">
                      Cargando restricciones...
                    </div>
                  ) : filteredRestrictions.length === 0 ? (
                    <div className="restrictions-empty">
                      {searchTerm || selectedFilter !== 'ALL' 
                        ? 'No se encontraron restricciones con los filtros aplicados'
                        : 'No hay restricciones disponibles'}
                    </div>
                  ) : (
                    <div className="restrictions-list">
                      {paginatedRestrictions.map((restriction) => (
                        <div
                          key={restriction.id}
                          className={`restriction-item ${selectedRestrictions.has(restriction.id) ? 'selected' : ''} ${!restriction.active ? 'inactive' : ''}`}
                          onClick={() => handleRestrictionToggle(restriction.id)}
                        >
                          <input
                            type="checkbox"
                            className="restriction-checkbox"
                            checked={selectedRestrictions.has(restriction.id)}
                            onChange={() => handleRestrictionToggle(restriction.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="restriction-info">
                            <div className="restriction-name">{restriction.name}</div>
                            <div className="restriction-meta">
                              <span className={`restriction-badge ${getRestrictionBadgeClass(restriction.type)}`}>
                                {RESTRICTION_TYPE_LABELS[restriction.type]}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paginación fuera del scroll */}
                {!loadingRestrictions && filteredRestrictions.length > 0 && (
                  <div className="restrictions-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}

                {/* Contador de seleccionadas */}
                <div className="restrictions-selected-count">
                  {selectedRestrictions.size} restricción{selectedRestrictions.size !== 1 ? 'es' : ''} seleccionada{selectedRestrictions.size !== 1 ? 's' : ''}
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
            {editingIngredient && onValidate && (
              <Button
                type="button"
                variant={editingIngredient.isInspected ? 'outline' : 'primary'}
                loading={isValidating}
                onClick={() => onValidate(editingIngredient.id, editingIngredient.isInspected)}
              >
                {editingIngredient.isInspected ? '✖ Desvalidar' : '✔ Validar'}
              </Button>
            )}
            <Button type="submit" variant="primary" form="ingredient-form" disabled={isValidating}>
              {editingIngredient ? 'Guardar Cambios' : 'Crear Ingrediente'}
            </Button>
          </div>
        </div>
    </Modal>
  );
}
