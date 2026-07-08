/**
 * Modal de detalle de un producto: escaneos, usuarios únicos, conversión a carrito,
 * y breakdown demográfico (edad/género). Se abre al hacer click en "Ver detalle" de la tabla.
 */
import { useEffect, useState } from 'react';
import { Modal, LoadingSpinner } from '../../../components/ui';
import { StatisticsService, type ProductScanStat, type ProductStatsDetail } from '../../../services/statistics.service';

interface ProductStatsModalProps {
  product: ProductScanStat | null;
  onClose: () => void;
}

export function ProductStatsModal({ product, onClose }: ProductStatsModalProps) {
  const [detail, setDetail] = useState<ProductStatsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) { setDetail(null); return; }
    // Guarda de carrera: si se cierra este producto y se abre otro antes de que responda
    // el fetch, una respuesta vieja no debe pisar el detalle del producto que se ve ahora.
    let active = true;
    setLoading(true);
    setError(null);
    StatisticsService.getProductStatsDetail(product.id)
      .then((d) => { if (active) setDetail(d); })
      .catch(() => { if (active) setError('No se pudo cargar el detalle de este producto.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product]);

  if (!product) return null;

  const cartRate = detail && detail.totalScans > 0
    ? `${Math.round((detail.addToCartCount / detail.totalScans) * 100)}%`
    : '—';

  return (
    <Modal show={!!product} title={product.name} onClose={onClose} error={error ?? undefined} maxWidth="640px">
      {loading && <LoadingSpinner message="Cargando estadísticas..." />}

      {detail && !loading && (
        <div className="statistics-detail">
          <div className="statistics-detail-stats">
            <div className="statistics-detail-stat">
              <span className="statistics-detail-stat-value">{detail.totalScans}</span>
              <span className="statistics-detail-stat-label">Escaneos</span>
            </div>
            <div className="statistics-detail-stat">
              <span className="statistics-detail-stat-value">{detail.distinctUsers}</span>
              <span className="statistics-detail-stat-label">Usuarios únicos</span>
            </div>
            <div className="statistics-detail-stat">
              <span className="statistics-detail-stat-value">{detail.addToCartCount}</span>
              <span className="statistics-detail-stat-label">Al carrito ({cartRate})</span>
            </div>
          </div>

          <div className="statistics-detail-breakdowns">
            <Breakdown title="Por edad" rows={detail.byAgeBucket.map((b) => ({ label: b.ageBucket || '(sin dato)', count: b.count }))} />
            <Breakdown title="Por género" rows={detail.byGender.map((b) => ({ label: b.gender || '(sin dato)', count: b.count }))} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="statistics-breakdown">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="statistics-breakdown-empty">Sin datos.</p>
      ) : (
        <table className="dt-table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="statistics-breakdown-count">{r.count}</td>
                <td className="statistics-breakdown-pct">{total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
