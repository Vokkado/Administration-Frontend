/**
 * Página "Estadísticas" (admin): leaderboard de contribuidores (gamificación) +
 * estadísticas de uso de un producto (analytics: escaneos, demografía, conversión).
 */
import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, Input, StatCard, DataTable, type DataTableColumn } from '../../components/ui';
import {
  StatisticsService, type LeaderboardEntry, type ProductStats,
} from '../../services/statistics.service';

const leaderboardColumns: DataTableColumn<LeaderboardEntry>[] = [
  { key: 'name', header: 'Usuario', render: (e) => e.name || '(sin nombre)' },
  { key: 'level', header: 'Nivel', render: (e) => `Nv. ${e.level}`, hideOnMobile: true },
  { key: 'points', header: 'Puntos', render: (e) => e.pointsBalance },
  { key: 'scans', header: 'Escaneos', render: (e) => e.totalScans },
  { key: 'approved', header: 'Productos aprob.', render: (e) => e.productsApproved, hideOnMobile: true },
  { key: 'carts', header: 'Carritos', render: (e) => e.cartsCreated, hideOnMobile: true },
];

export function StatisticsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);

  const [productId, setProductId] = useState('');
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loadingPs, setLoadingPs] = useState(false);
  const [psError, setPsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingLb(true);
      try {
        setLeaderboard(await StatisticsService.getLeaderboard(50));
      } catch {
        setLeaderboard([]);
      } finally {
        setLoadingLb(false);
      }
    })();
  }, []);

  const loadProductStats = async () => {
    const id = productId.trim();
    if (!id) return;
    setLoadingPs(true);
    setPsError(null);
    setStats(null);
    try {
      setStats(await StatisticsService.getProductStats(id));
    } catch {
      setPsError('No se pudieron obtener las estadísticas de ese producto. Verificá el ID.');
    } finally {
      setLoadingPs(false);
    }
  };

  const cartRate = stats && stats.totalScans > 0
    ? `${Math.round((stats.addToCartCount / stats.totalScans) * 100)}%`
    : '—';

  return (
    <AdminLayout title="Estadísticas">
      {/* ── Leaderboard de contribuidores ── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: 'var(--color-primary-dark)' }}>🏆 Contribuidores (top 50)</h3>
        <p style={{ color: 'var(--color-grey-600)', marginTop: 0 }}>
          Ranking por puntos (productos aprobados + reportes/sugerencias válidos) y actividad.
        </p>
        <DataTable
          columns={leaderboardColumns}
          data={leaderboard}
          loading={loadingLb}
          loadingMessage="Cargando ranking..."
          emptyMessage="Todavía no hay actividad registrada"
          emptyIcon="📊"
          keyExtractor={(e) => e.userId}
        />
      </section>

      {/* ── Estadísticas de un producto ── */}
      <section>
        <h3 style={{ color: 'var(--color-primary-dark)' }}>📦 Estadísticas de un producto</h3>
        <p style={{ color: 'var(--color-grey-600)', marginTop: 0 }}>
          Pegá el ID de un producto para ver cuántas veces se escaneó, por qué demografía y la
          conversión a carrito. (Solo cuenta usuarios que dieron consentimiento de analytics.)
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 560 }}>
          <div style={{ flex: 1 }}>
            <Input
              label="ID de producto"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="uuid del producto"
              onKeyDown={(e) => { if (e.key === 'Enter') loadProductStats(); }}
            />
          </div>
          <Button variant="primary" onClick={loadProductStats} disabled={loadingPs || !productId.trim()}>
            {loadingPs ? 'Buscando...' : 'Ver stats'}
          </Button>
        </div>

        {psError && <p style={{ color: 'var(--color-danger, #c0392b)', marginTop: 12 }}>{psError}</p>}

        {stats && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <StatCard icon="🔍" label="Escaneos totales" value={stats.totalScans} description="Veces escaneado" />
              <StatCard icon="👥" label="Usuarios únicos" value={stats.distinctUsers} description="Personas distintas" />
              <StatCard icon="🛒" label="Agregado al carrito" value={stats.addToCartCount} description={`Conversión ${cartRate}`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginTop: 24 }}>
              <Breakdown title="Por edad" rows={stats.byAgeBucket.map((b) => ({ label: b.ageBucket || '(sin dato)', count: b.count }))} />
              <Breakdown title="Por género" rows={stats.byGender.map((b) => ({ label: b.gender || '(sin dato)', count: b.count }))} />
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div>
      <h4 style={{ marginBottom: 8, color: 'var(--color-grey-700)' }}>{title}</h4>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--color-grey-500)' }}>Sin datos.</p>
      ) : (
        <table className="dt-table" style={{ width: '100%' }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.count}</td>
                <td style={{ textAlign: 'right', color: 'var(--color-grey-500)', width: 56 }}>
                  {total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
