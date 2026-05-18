/**
 * Modal para Crear/Editar Alérgenos
 */
import { useState, useEffect } from 'react';
import { Modal, Button, Input, Pagination } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import type { Allergen, AllergenFormData, Restriction, RestrictionType } from '../types';
import { RESTRICTION_TYPE_LABELS } from '../types';

interface AllergenModalProps {
  show: boolean;
  editingAllergen: Allergen | null;
  formData: AllergenFormData;
  error?: string;
  isValidating?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<AllergenFormData>) => void;
  onValidate?: (id: string, currentState: boolean) => void;
}

type RestrictionFilterType = 'ALL' | RestrictionType;
type StatusFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';
type AbsoluteFilterType = 'ALL' | 'ABSOLUTE' | 'NOT_ABSOLUTE';

export function AllergenModal({
  show,
  editingAllergen,
  formData,
  error,
  isValidating = false,
  onClose,
  onSubmit,
  onChange,
  onValidate,
}: AllergenModalProps) {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RestrictionFilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ACTIVE');
  const [absoluteFilter, setAbsoluteFilter] = useState<AbsoluteFilterType>('ALL');
  const [selectedRestrictions, setSelectedRestrictions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (show) {
      loadRestrictions();
      if (editingAllergen && formData.restrictionIds) {
        setSelectedRestrictions(new Set(formData.restrictionIds));
      } else {
        setSelectedRestrictions(new Set());
      }
      setCurrentPage(1);
      setSearchTerm('');
      setSelectedFilter('ALL');
      setStatusFilter('ACTIVE');
      setAbsoluteFilter('ALL');
    }
  }, [show, editingAllergen]);

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

  return (
    <Modal
      show={show}
      title={editingAllergen ? 'Editar alérgeno' : 'Agregar alérgeno'}
      onClose={onClose}
      error={error}
      maxWidth="1100px"
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="allergen-form">
          <div className="modal-form-columns">
            {/* Left Column - Basic Info */}
            <div className="modal-form-left">
              <Input
                type="text"
                label="Nombre *"
                placeholder="Ej: Lactosa, Gluten, Maní"
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={100}
                title="El nombre no puede exceder 100 caracteres"
                required
                fullWidth
              />
            </div>

            {/* Right Column - Restrictions */}
            <div className="modal-form-right">
              <div className="restrictions-section">
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

                {!loadingRestrictions && filteredRestrictions.length > 0 && (
                  <div className="restrictions-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}

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
          {editingAllergen && onValidate && (
            <Button
              type="button"
              variant={editingAllergen.inspected ? 'outline' : 'primary'}
              loading={isValidating}
              onClick={() => onValidate(editingAllergen.id, editingAllergen.inspected)}
            >
              {editingAllergen.inspected ? '✖ Desvalidar' : '✔ Validar'}
            </Button>
          )}
          <Button type="submit" variant="primary" form="allergen-form" disabled={isValidating}>
            {editingAllergen ? 'Guardar Cambios' : 'Crear Alérgeno'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
