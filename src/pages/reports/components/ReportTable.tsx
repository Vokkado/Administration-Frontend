/**
 * Tabla de Reportes (Admin)
 */

import { DataTable, Button } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { AdminReportListItem } from '../types';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '../types';

interface ReportTableProps {
  items: AdminReportListItem[];
  loading: boolean;
  onView: (id: string) => void;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'NEW':
      return 'pending';
    case 'PENDING':
      return 'pending';
    case 'IN_REVIEW':
      return 'in-review';
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    default:
      return '';
  }
};

const columns: DataTableColumn<AdminReportListItem>[] = [
  {
    key: 'createdAt',
    header: 'Fecha',
    render: (r) => formatDateTime(r.createdAt),
  },
  {
    key: 'type',
    header: 'Tipo',
    render: (r) => REPORT_TYPE_LABELS[r.type],
  },
  {
    key: 'status',
    header: 'Estado',
    render: (r) => (
      <span className={`report-status-badge ${getStatusBadgeClass(r.status)}`}>
        {REPORT_STATUS_LABELS[r.status]}
      </span>
    ),
  },
  {
    key: 'userEmail',
    header: 'Usuario',
    hideOnMobile: true,
    render: (r) => (
      <span className={r.userEmail ? '' : 'text-muted'}>
        {r.userEmail || '—'}
      </span>
    ),
  },
  {
    key: 'description',
    header: 'Resumen',
    hideOnMobile: true,
    render: (r) =>
      r.type === 'OUTDATED_PRODUCT' || r.type === 'WRONG_ANALYSIS'
        ? `Producto: ${r.productName || r.productId || '—'} — ${r.description}`
        : r.description,
  },
];

export function ReportTable({ items, loading, onView }: ReportTableProps) {
  return (
    <DataTable<AdminReportListItem>
      columns={columns}
      data={items}
      loading={loading}
      loadingMessage="Cargando reportes..."
      emptyMessage="No se encontraron reportes"
      keyExtractor={(r) => r.id}
      actionsHeader=""
      renderActions={(r) => (
        <Button variant="outline" size="small" onClick={() => onView(r.id)}>
          Ver
        </Button>
      )}
    />
  );
}
