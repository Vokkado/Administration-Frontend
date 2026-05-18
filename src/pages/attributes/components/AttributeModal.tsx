/**
 * Modal para Crear/Editar Atributos
 * Incluye panel de restricciones (como IngredientModal) y creación inline de tipos.
 */
import { useState, useEffect } from 'react';
import { Modal, Button, Input, Pagination } from '../../../components/ui';
import type {
  Attribute,
  AttributeType,
  AttributeFormData,
  Restriction,
  RestrictionType,
} from '../types';
import { RESTRICTION_TYPE_LABELS, getAttributeTypeLabel } from '../types';
import { apiService } from '../../../services/api.service';

interface AttributeModalProps {
  show: boolean;
  editingAttribute: Attribute | null;
  formData: AttributeFormData;
  attributeTypes: AttributeType[];
  error?: string;
  isValidating?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<AttributeFormData>) => void;
  onTypeCreated: () => void;
  onValidate?: (id: string, currentState: boolean) => void;
}

type RestrictionFilterType = 'ALL' | RestrictionType;
type StatusFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';
type AbsoluteFilterType = 'ALL' | 'ABSOLUTE' | 'NOT_ABSOLUTE';

export function AttributeModal({
  show,
  editingAttribute,
  formData,
  attributeTypes,
  error,
  isValidating = false,
  onClose,
  onSubmit,
  onChange,
  onTypeCreated,
  onValidate,
}: AttributeModalProps) {
  // Restrictions state
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RestrictionFilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ACTIVE');
  const [absoluteFilter, setAbsoluteFilter] = useState<AbsoluteFilterType>('NOT_ABSOLUTE');
  const [selectedRestrictions, setSelectedRestrictions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // New type inline creation
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [creatingType, setCreatingType] = useState(false);
  const [typeError, setTypeError] = useState('');

  useEffect(() => {
    if (show) {
      loadRestrictions();
      if (editingAttribute && formData.restrictionIds) {
        setSelectedRestrictions(new Set(formData.restrictionIds));
      } else {
        setSelectedRestrictions(new Set());
      }
      setCurrentPage(1);
      setSearchTerm('');
      setSelectedFilter('ALL');
      setStatusFilter('ACTIVE');
      setAbsoluteFilter('NOT_ABSOLUTE');
      setShowNewType(false);
      setNewTypeName('');
      setTypeError('');
    }
  }, [show, editingAttribute]);

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
    const matchesSearch = restriction.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || restriction.type === selectedFilter;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' ? restriction.active : !restriction.active);
    return matchesAbsolute && matchesSearch && matchesFilter && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, statusFilter, absoluteFilter]);

  // Ordenar: seleccionados primero
  const sortedRestrictions = [...filteredRestrictions].sort((a, b) => {
    const aSelected = selectedRestrictions.has(a.id) ? 0 : 1;
    const bSelected = selectedRestrictions.has(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  const totalPages = Math.ceil(sortedRestrictions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRestrictions = sortedRestrictions.slice(startIndex, startIndex + itemsPerPage);

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
    const typeMap: Record<string, string> = {
      'ALLERGY': 'allergy',
      'ILLNESS': 'illness',
      'VOLUNTARY': 'voluntary',
      'INVOLUNTARY': 'involuntary',
      'GOAL': 'voluntary',
    };
    return typeMap[type] || 'voluntary';
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      setTypeError('El nombre del tipo es requerido');
      return;
    }

    setCreatingType(true);
    setTypeError('');
    try {
      const response = await apiService.post<any>('/attribute-types', {
        type: newTypeName.trim(),
        isInspected: true,
      });
      const newType = response?.data || response;
      // Seleccionar el nuevo tipo automáticamente
      if (newType?.id) {
        onChange({ typeId: newType.id });
      }
      setNewTypeName('');
      setShowNewType(false);
      onTypeCreated();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error creating type:', err);
      setTypeError(err.response?.data?.message || 'Error al crear tipo de atributo');
    } finally {
      setCreatingType(false);
    }
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      title={editingAttribute ? 'Editar atributo' : 'Agregar atributo'}
      onClose={onClose}
      error={error}
      maxWidth="1100px"
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="attribute-form">
          <div className="modal-form-columns">
            {/* Columna Izquierda - Información Básica */}
            <div className="modal-form-left">
              <Input
                type="text"
                label={editingAttribute ? "Nombre" : "Nombre *"}
                placeholder="Ej: Sin azúcar añadida"
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={120}
                title="El nombre no puede exceder 120 caracteres"
                required={!editingAttribute}
                fullWidth
              />

              {/* Tipo de Atributo con creación inline */}
              <div className="form-group">
                <label>{editingAttribute ? 'Tipo de Atributo' : 'Tipo de Atributo *'}</label>
                <div className="type-selector">
                  <select
                    className="select"
                    value={formData.typeId}
                    onChange={(e) => onChange({ typeId: e.target.value })}
                    required={!editingAttribute}
                  >
                    <option value="">Seleccionar tipo...</option>
                    {attributeTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {getAttributeTypeLabel(type.type)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="new-type-toggle"
                    onClick={() => setShowNewType(!showNewType)}
                    title="Crear nuevo tipo"
                  >
                    {showNewType ? '✕' : '+ Nuevo'}
                  </button>
                </div>

                {showNewType && (
                  <div className="new-type-form">
                    <div className="new-type-input-row">
                      <Input
                        type="text"
                        placeholder="Nombre del nuevo tipo..."
                        value={newTypeName}
                        onChange={(e) => { setNewTypeName(e.target.value); setTypeError(''); }}
                        maxLength={100}
                        fullWidth
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={handleCreateType}
                        disabled={creatingType || !newTypeName.trim()}
                      >
                        {creatingType ? '...' : 'Crear'}
                      </Button>
                    </div>
                    {typeError && <small className="type-error">{typeError}</small>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Puntuación</label>
                <select
                  className="select"
                  value={formData.score}
                  onChange={(e) => onChange({ score: e.target.value })}
                >
                  <option value="">No corresponde</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
                <small className="form-hint">
                  1 (peor) a 10 (mejor). Selecciona "No corresponde" si no aplica.
                </small>
              </div>

              <div className="form-group">
                <label>Justificación</label>
                <textarea
                  className="textarea"
                  placeholder="Ej: Este atributo se clasifica así debido a..."
                  value={formData.reason || ''}
                  onChange={(e) => onChange({ reason: e.target.value })}
                  rows={3}
                  maxLength={1000}
                />
                <small className="form-hint">
                  Explica brevemente el motivo de la puntuación asignada
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
          {editingAttribute && onValidate && (
            <Button
              type="button"
              variant={editingAttribute.isInspected ? 'outline' : 'primary'}
              loading={isValidating}
              onClick={() => onValidate(editingAttribute.id, editingAttribute.isInspected)}
            >
              {editingAttribute.isInspected ? '✖ Desvalidar' : '✔ Validar'}
            </Button>
          )}
          <Button type="submit" variant="primary" form="attribute-form" disabled={isValidating}>
            {editingAttribute ? 'Guardar Cambios' : 'Crear Atributo'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
