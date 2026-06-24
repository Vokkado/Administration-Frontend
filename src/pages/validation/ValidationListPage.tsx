/**
 * Lista de productos a validar (cargados por IA, sin inspeccionar). Tabla con el conteo
 * de colores por producto. Clic en "Revisar" → wizard de validación paso a paso.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, DataTable, Pagination, SearchInput } from '../../components/ui';
import type { DataTableColumn } from '../../components/ui/DataTable';
import { usePaginatedList, type PaginatedFetchParams } from '../../hooks/usePaginatedList';
import { ValidationService, type ValidationQueueItem } from '../../services/validation.service';

function CountBadge({ n, color }: { n: number; color: string }) {
  if (!n) return null;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8, fontSize: 13 }}>
    <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} /> {n}
  </span>;
}

export function ValidationListPage() {
  const navigate = useNavigate();
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      ValidationService.getQueue(params.limit, params.offset, params.search).then((r) => ({ data: r.items, total: r.total })),
    [],
  );
  const { items, total, loading, currentPage, totalPages, setCurrentPage, searchTerm, setSearchTerm } =
    usePaginatedList<ValidationQueueItem>({ fetchFn });

  const columns: DataTableColumn<ValidationQueueItem>[] = [
    {
      key: 'image', header: '', width: '56px', render: (p) => p.image
        ? <img src={p.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'contain', background: '#f3f4f6' }} />
        : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6' }} />,
    },
    { key: 'name', header: 'Producto', render: (p) => <strong>{p.name}</strong> },
    { key: 'brand', header: 'Marca', hideOnMobile: true, render: (p) => p.brand || '—' },
    { key: 'barcode', header: 'Código', hideOnMobile: true, render: (p) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.barcode || '—'}</span> },
    {
      key: 'counts', header: 'Vínculos', render: (p) => (
        <span>
          <CountBadge n={p.counts.green} color="#10b981" />
          <CountBadge n={p.counts.yellow} color="#f59e0b" />
          <CountBadge n={p.counts.red} color="#ef4444" />
          {!p.counts.green && !p.counts.yellow && !p.counts.red && <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout title="Validar productos">
      <p style={{ color: '#6b7280', marginTop: -4, marginBottom: 12 }}>
        {total} producto{total === 1 ? '' : 's'} pendiente{total === 1 ? '' : 's'} de validación.
      </p>
      <div style={{ marginBottom: 12, maxWidth: 360 }}>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="🔍 Buscar por nombre o código…" />
      </div>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyIcon="✅"
        emptyMessage="No hay productos pendientes de validación."
        actionsHeader=""
        renderActions={(p) => <Button variant="primary" onClick={() => navigate(`/validation/${p.id}`)}>Revisar →</Button>}
      />
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </AdminLayout>
  );
}
