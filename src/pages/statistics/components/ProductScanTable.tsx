/**
 * Tabla de productos con su cantidad de escaneos. Click en una fila abre el detalle
 * (demografía + conversión a carrito) en un modal.
 */
import { DataTable, Button } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { ProductScanStat } from '../../../services/statistics.service';

interface ProductScanTableProps {
  products: ProductScanStat[];
  loading: boolean;
  onSelect: (product: ProductScanStat) => void;
}

const columns: DataTableColumn<ProductScanStat>[] = [
  { key: 'name', header: 'Nombre', render: (p) => p.name },
  { key: 'brand', header: 'Marca', hideOnMobile: true, render: (p) => p.brand || '—' },
  { key: 'barcode', header: 'Código de barras', hideOnMobile: true, render: (p) => p.barcode || '—' },
  { key: 'totalScans', header: 'Escaneos', render: (p) => p.totalScans, width: '110px' },
];

export function ProductScanTable({ products, loading, onSelect }: ProductScanTableProps) {
  return (
    <DataTable<ProductScanStat>
      columns={columns}
      data={products}
      loading={loading}
      loadingMessage="Cargando productos..."
      emptyMessage="No se encontraron productos"
      keyExtractor={(p) => p.id}
      renderActions={(p) => (
        <Button variant="outline" onClick={() => onSelect(p)}>
          Ver detalle
        </Button>
      )}
    />
  );
}
