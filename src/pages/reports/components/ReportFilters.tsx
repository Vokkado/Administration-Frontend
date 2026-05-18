/**
 * Filtros de Reportes (Admin)
 */

import type { AdminReportsFilters, ReportStatus } from '../types';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '../types';
import './ReportFilters.css';

interface ReportFiltersProps {
  filters: AdminReportsFilters;
  onFiltersChange: (filters: AdminReportsFilters) => void;
}

export function ReportFilters({ filters, onFiltersChange }: ReportFiltersProps) {
  const handleTypeChange = (type: AdminReportsFilters['type']) => {
    onFiltersChange({ ...filters, type });
  };

  const handleStatusChange = (status: AdminReportsFilters['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const handleClearFilters = () => {
    onFiltersChange({ type: 'ALL', status: 'ALL' });
  };

  const typeOptions: Array<{ value: AdminReportsFilters['type']; label: string }> = [
    { value: 'ALL', label: 'Todos' },
    { value: 'BUG', label: REPORT_TYPE_LABELS.BUG },
    { value: 'MISSING_PRODUCT', label: REPORT_TYPE_LABELS.MISSING_PRODUCT },
    { value: 'OUTDATED_PRODUCT', label: REPORT_TYPE_LABELS.OUTDATED_PRODUCT },
    { value: 'WRONG_ANALYSIS', label: REPORT_TYPE_LABELS.WRONG_ANALYSIS },
    { value: 'DELETE_ACCOUNT', label: REPORT_TYPE_LABELS.DELETE_ACCOUNT },
    { value: 'SUGGESTION', label: REPORT_TYPE_LABELS.SUGGESTION },
  ];

  const statusOptions: Array<{ value: AdminReportsFilters['status']; label: string }> = [
    { value: 'ALL', label: 'Todos' },
    ...(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as const).map((s) => ({
      value: s,
      label: REPORT_STATUS_LABELS[s as ReportStatus],
    })),
  ];

  return (
    <div className="filters-section">
      <div className="filter-section">
        <label>Tipo</label>
        <div className="filter-buttons">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-btn ${filters.type === opt.value ? 'active' : ''}`}
              onClick={() => handleTypeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label>Estado</label>
        <div className="filter-buttons">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-btn ${filters.status === opt.value ? 'active' : ''}`}
              onClick={() => handleStatusChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(filters.type !== 'ALL' || filters.status !== 'ALL') && (
        <div className="filter-actions">
          <button type="button" onClick={handleClearFilters} className="clear-filters-btn">
            ✕ Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
