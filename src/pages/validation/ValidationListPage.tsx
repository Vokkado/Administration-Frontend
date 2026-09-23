/**
 * Lista de productos a validar (cargados por IA, sin inspeccionar). Tabla con el conteo
 * de colores por producto. Clic en "Revisar" → wizard de validación paso a paso.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, DataTable, Pagination, SearchInput, PageHeader } from '../../components/ui';
import type { DataTableColumn, DataTableSort } from '../../components/ui/DataTable';
import { usePaginatedList, type PaginatedFetchParams } from '../../hooks/usePaginatedList';
import { ValidationService, type ValidationQueueItem } from '../../services/validation.service';

function CountBadge({ n, color }: { n: number; color: string }) {
  if (!n) return null;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8, fontSize: 13 }}>
    <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} /> {n}
  </span>;
}

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

export function ValidationListPage() {
  const navigate = useNavigate();
  // Orden: lo resuelve el backend, porque la cola está paginada del lado del servidor
  // (ordenar solo la página visible daría un resultado engañoso).
  //
  // Por defecto se ordena por ÚLTIMA MODIFICACIÓN, no por creación: un producto que
  // venía del catálogo de referencia conserva la fecha de creación del día que se
  // importó, así que al enriquecerlo quedaría enterrado al fondo de la cola en vez de
  // arriba, que es donde lo busca quien acaba de enriquecerlo.
  const [sort, setSort] = useState<DataTableSort>({ key: 'updatedAt', direction: 'desc' });
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      ValidationService.getQueue(
        params.limit,
        params.offset,
        params.search,
        sort.key as 'name' | 'createdAt' | 'updatedAt',
        sort.direction,
      ).then((r) => ({ data: r.items, total: r.total })),
    [sort],
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
    { key: 'brand', header: 'Marca', hideOnMobile: true, width: '160px', render: (p) => p.brand || '—' },
    { key: 'barcode', header: 'Código', hideOnMobile: true, width: '170px', render: (p) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.barcode || '—'}</span> },
    {
      key: 'createdAt',
      header: 'Creado',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      width: '130px',
      render: (p) => (
        <span title={p.createdAt ? new Date(p.createdAt).toLocaleString('es-UY') : ''}>
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Actualizado',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      width: '130px',
      render: (p) => (
        <span title={p.updatedAt ? new Date(p.updatedAt).toLocaleString('es-UY') : ''}>
          {formatDate(p.updatedAt)}
        </span>
      ),
    },
    {
      key: 'counts', header: 'Vínculos', width: '140px', render: (p) => (
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
      <PageHeader
        title="Validar productos"
        description="Productos cargados por IA pendientes de validación."
        actions={
          <div className="header-actions">
            {/* Mismas clases que usa PageHeader para su contador. */}
            <div className="header-count">
              <span className="count-number">{total}</span>
              <span className="count-label">{total === 1 ? 'producto' : 'productos'}</span>
            </div>

            <div className="header-search">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="🔍 Buscar por nombre o código…"
              />
            </div>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyIcon="✅"
        emptyMessage="No hay productos pendientes de validación."
        actionsHeader=""
        actionsWidth="150px"
        fixedLayout
        sort={sort}
        // Al cambiar el orden se vuelve a la página 1: seguir en la 5 con otro orden
        // muestra un tramo arbitrario de la cola.
        onSortChange={(next) => { setSort(next); setCurrentPage(1); }}
        renderActions={(p) => <Button variant="primary" onClick={() => navigate(`/validation/${p.id}`)}>Revisar →</Button>}
      />
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </AdminLayout>
  );
}
