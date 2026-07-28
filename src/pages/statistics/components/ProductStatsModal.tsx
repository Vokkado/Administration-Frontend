/**
 * Modal de detalle de un producto: escaneos, usuarios únicos, conversión a carrito,
 * carritos completados, y breakdown demográfico (edad/género) con gráficas.
 * Se abre al hacer click en "Ver detalle" de la tabla.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IoBarChartOutline, IoCartOutline, IoCheckmarkDoneCircleOutline, IoPeopleOutline, IoScanOutline } from 'react-icons/io5';
import { Modal, LoadingSpinner, DateRangePicker, type DateRange } from '../../../components/ui';
import { StatisticsService, type ProductScanStat, type ProductStatsDetail } from '../../../services/statistics.service';
import { StatTile } from './StatTile';

interface ProductStatsModalProps {
  product: ProductScanStat | null;
  onClose: () => void;
  /** Filtro de fecha de la pantalla principal — se usa como default al abrir un producto. */
  dateRange?: DateRange | null;
}

type BreakdownRow = { label: string; scans: number; distinctUsers: number };
type AgeViewMode = 'age' | 'range';

const PIE_COLORS = ['var(--color-primary-dark)', 'var(--color-primary)', 'var(--color-secondary)', 'var(--color-alternative)', 'var(--color-grey-400)'];

export function ProductStatsModal({ product, onClose, dateRange }: ProductStatsModalProps) {
  const [detail, setDetail] = useState<ProductStatsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageMode, setAgeMode] = useState<AgeViewMode>('age');
  // Filtro propio del modal — arranca con el de la pantalla principal, pero cambiarlo acá
  // adentro no toca ese filtro externo (independiente una vez abierto).
  const [localDateRange, setLocalDateRange] = useState<DateRange | null>(dateRange ?? null);
  const lastProductIdRef = useRef<string | null>(null);
  const dateRangeRef = useRef(dateRange);
  useEffect(() => { dateRangeRef.current = dateRange; }, [dateRange]);
  // Última combinación (producto + rango) ya pedida al backend — evita el doble fetch que
  // se daba al abrir un producto nuevo: el reset de `localDateRange` (abajo) dispara otra
  // vuelta de este mismo efecto, y sin este chequeo se repetía la misma llamada dos veces
  // seguidas (loading→contenido→loading de nuevo, sensación de modal "trancado").
  const lastFetchKeyRef = useRef<string | null>(null);
  // Los gráficos (hasta ~70 barras en "edad puntual" + las tortas) son el montaje más pesado
  // del modal. Si el backend responde rápido (como en dev/local), ese montaje cae justo
  // encima de la animación de apertura del modal (slideUp, 0.3s) y se siente como bajón de
  // FPS. Se retrasan un par de frames (después de que `detail` llega) para no competir con
  // la animación — el modal ya terminó de entrar para cuando se montan.
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    if (!product) {
      setDetail(null);
      // Al cerrar, olvidar el producto/rango visto — reabrir (aunque sea el mismo producto)
      // vuelve a arrancar del filtro externo vigente, no de lo que se haya tocado la vez anterior.
      lastProductIdRef.current = null;
      lastFetchKeyRef.current = null;
      return;
    }
    // Al abrir un producto NUEVO (no en cada refetch del mismo), resetear al filtro externo
    // vigente en ese momento y volver a la vista "por edad" por defecto.
    const isNewProduct = lastProductIdRef.current !== product.id;
    lastProductIdRef.current = product.id;
    const effectiveRange = isNewProduct ? (dateRangeRef.current ?? null) : localDateRange;
    if (isNewProduct) {
      setLocalDateRange(effectiveRange);
      setAgeMode('age');
    }

    const key = `${product.id}|${effectiveRange?.from.getTime() ?? ''}|${effectiveRange?.to.getTime() ?? ''}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    // Guarda de carrera: si se cierra este producto y se abre otro antes de que responda
    // el fetch, una respuesta vieja no debe pisar el detalle del producto que se ve ahora.
    let active = true;
    setLoading(true);
    setError(null);
    StatisticsService.getProductStatsDetail(product.id, effectiveRange)
      .then((d) => { if (active) setDetail(d); })
      .catch(() => { if (active) setError('No se pudo cargar el detalle de este producto.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product, localDateRange]);

  useEffect(() => {
    if (!detail) { setChartsReady(false); return; }
    setChartsReady(false);
    // Doble rAF: el primero corre al final del frame actual, el segundo ya en el frame
    // siguiente — para entonces el navegador terminó de pintar lo que estaba animando.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setChartsReady(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [detail]);

  const ageRows = useMemo<BreakdownRow[]>(() => {
    if (!detail) return [];
    return ageMode === 'age'
      ? detail.byAge.map((a) => ({ label: a.age != null ? String(a.age) : 'Sin dato', scans: a.scans, distinctUsers: a.distinctUsers }))
      : detail.byAgeBucket.map((b) => ({ label: b.ageBucket ?? 'Sin dato', scans: b.scans, distinctUsers: b.distinctUsers }));
  }, [detail, ageMode]);

  const genderRows = useMemo<BreakdownRow[]>(() => {
    if (!detail) return [];
    return detail.byGender.map((g) => ({ label: formatGender(g.gender), scans: g.scans, distinctUsers: g.distinctUsers }));
  }, [detail]);

  if (!product) return null;

  const cartRate = detail && detail.totalScans > 0
    ? `${Math.round((detail.addToCartCount / detail.totalScans) * 100)}%`
    : '—';

  return (
    <Modal show={!!product} title={product.name} onClose={onClose} error={error ?? undefined} maxWidth="960px">
      <div className="statistics-modal-daterow">
        <DateRangePicker label="Filtrar fecha:" value={localDateRange} onChange={setLocalDateRange} />
      </div>

      {loading && <LoadingSpinner message="Cargando estadísticas..." />}

      {detail && !loading && (
        <div className="statistics-detail">
          <div className="statistics-detail-stats">
            <StatTile icon={<IoScanOutline />} value={detail.totalScans} label="Escaneos totales" />
            <StatTile icon={<IoPeopleOutline />} value={detail.distinctUsers} label="Cantidad de usuarios que lo escanearon" />
            <StatTile icon={<IoCartOutline />} value={detail.addToCartCount} label="Movido al carrito" rate={cartRate} />
            <StatTile icon={<IoCheckmarkDoneCircleOutline />} value={detail.completedCartCount} label="Carritos completados con este producto" />
          </div>

          {chartsReady ? (
            <div className="statistics-detail-breakdowns">
              <div className="statistics-breakdown">
                <div className="statistics-breakdown-header">
                  <h4><IoBarChartOutline />Usuarios y escaneos por edad</h4>
                  <div className="statistics-breakdown-toggle">
                    {[{ value: 'age', label: 'Edad' }, { value: 'range', label: 'Rango' }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={opt.value === ageMode ? 'active' : ''}
                        onClick={() => setAgeMode(opt.value as AgeViewMode)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {ageRows.length === 0 ? (
                  <p className="statistics-breakdown-empty">Sin datos.</p>
                ) : (
                  <>
                    <BarLegend dimension="edad" />
                    <BarChart rows={ageRows} />
                  </>
                )}
              </div>

              <div className="statistics-breakdown">
                <div className="statistics-breakdown-header">
                  <h4><IoPeopleOutline />Usuarios y escaneos por género</h4>
                </div>
                {genderRows.length === 0 ? (
                  <p className="statistics-breakdown-empty">Sin datos.</p>
                ) : (
                  <div className="statistics-pie-pair">
                    <PieChart title="Usuarios únicos por género" rows={genderRows} metric="distinctUsers" />
                    <PieChart title="Escaneos totales por género" rows={genderRows} metric="scans" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="statistics-detail-breakdowns-placeholder" />
          )}
        </div>
      )}
    </Modal>
  );
}

function formatGender(gender: string | null): string {
  if (gender === 'male') return 'Masculino';
  if (gender === 'female') return 'Femenino';
  if (gender === 'prefer-not-to-say') return 'Prefiere no decirlo';
  return 'Sin dato';
}

function BarLegend({ dimension }: { dimension: string }) {
  return (
    <div className="statistics-breakdown-legend">
      <span><i className="legend-dot users" /> Usuarios únicos por {dimension}</span>
      <span><i className="legend-dot scans" /> Escaneos totales por {dimension}</span>
    </div>
  );
}

/**
 * Gráfico de barras (X = categoría, Y = cantidad), dos barras por categoría (usuarios
 * únicos / escaneos). Con pocas categorías (rango de edad) los valores se muestran siempre,
 * en gris, arriba de cada barra. Con muchas (edad puntual, hasta ~70 valores distintos) esos
 * números se amontonarían, así que se muestran al pasar el mouse en un panel arriba del
 * gráfico — la barra activa además se resalta. Con scroll horizontal si no entran todas.
 */
function BarChart({ rows }: { rows: BreakdownRow[] }) {
  const dense = rows.length > 10;
  const [hovered, setHovered] = useState<number | null>(null);

  const chartHeight = 140;
  const slotWidth = dense ? 34 : 68;
  const barWidth = dense ? 12 : 22;
  const gap = dense ? 2 : 6;
  const maxVal = Math.max(1, ...rows.flatMap((r) => [r.scans, r.distinctUsers]));
  const width = Math.max(rows.length * slotWidth, 220);
  const totalUsers = rows.reduce((s, r) => s + r.distinctUsers, 0);
  const totalScans = rows.reduce((s, r) => s + r.scans, 0);
  const active = hovered != null ? rows[hovered] : null;

  return (
    <div className="statistics-barchart">
      {dense && (
        <div className="statistics-barchart-info">
          {active ? (
            <span>
              <strong>{active.label}</strong>
              {' — '}{active.distinctUsers} usuarios únicos
              {totalUsers > 0 && ` (${Math.round((active.distinctUsers / totalUsers) * 100)}%)`}
              {' · '}{active.scans} escaneos
              {totalScans > 0 && ` (${Math.round((active.scans / totalScans) * 100)}%)`}
            </span>
          ) : (
            <span className="statistics-barchart-info-hint">Pasá el mouse sobre una barra para ver el detalle</span>
          )}
        </div>
      )}
      <div className="statistics-agechart-scroll">
        <svg width={width} height={chartHeight + 24} className="statistics-agechart-svg">
          <line x1={0} y1={chartHeight} x2={width} y2={chartHeight} className="agechart-baseline" />
          {rows.map((r, i) => {
            const x = i * slotWidth;
            const usersH = (r.distinctUsers / maxVal) * (chartHeight - 4);
            const scansH = (r.scans / maxVal) * (chartHeight - 4);
            const isActive = hovered === i;
            return (
              <g
                key={r.label}
                className={`agechart-group${isActive ? ' active' : ''}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                <rect x={x} y={0} width={slotWidth} height={chartHeight} fill="transparent" />
                {!dense && (
                  <>
                    <text x={x + barWidth / 2} y={chartHeight - usersH - 6} textAnchor="middle" className="agechart-value users">{r.distinctUsers}</text>
                    <text x={x + barWidth + gap + barWidth / 2} y={chartHeight - scansH - 6} textAnchor="middle" className="agechart-value scans">{r.scans}</text>
                  </>
                )}
                <rect x={x} y={chartHeight - usersH} width={barWidth} height={usersH} rx={2} className="agechart-bar users" />
                <rect x={x + barWidth + gap} y={chartHeight - scansH} width={barWidth} height={scansH} rx={2} className="agechart-bar scans" />
                <text x={x + barWidth + gap / 2} y={chartHeight + 16} textAnchor="middle" className="agechart-label">{r.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Torta (SVG, técnica stroke-dasharray sobre un círculo) para una sola métrica. Se usan dos
 * instancias lado a lado (usuarios únicos / escaneos) porque una torta no puede mostrar dos
 * métricas a la vez. La leyenda siempre muestra el número exacto y el % en gris debajo;
 * pasar el mouse por una porción o su fila de leyenda resalta esa categoría en ambas.
 */
function PieChart({ title, rows, metric }: { title: string; rows: BreakdownRow[]; metric: 'scans' | 'distinctUsers' }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = rows.map((r) => ({ label: r.label, value: r[metric] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  // Offset acumulado de cada porción, precalculado (no mutar una variable dentro del render).
  const slices = data.reduce<Array<{ dash: number; offset: number }>>((acc, d) => {
    const dash = total > 0 ? (d.value / total) * circumference : 0;
    const prevEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ dash, offset: prevEnd });
    return acc;
  }, []);

  return (
    <div className="statistics-pie">
      <h5>{title}</h5>
      <div className="statistics-pie-body">
        <svg viewBox="0 0 120 120" className="statistics-pie-svg">
          {total === 0 ? (
            <circle cx={60} cy={60} r={radius} fill="none" stroke="var(--color-grey-200)" strokeWidth={20} />
          ) : (
            <g transform="rotate(-90 60 60)">
              {data.map((d, i) => {
                const frac = d.value / total;
                const { dash, offset: acc } = slices[i];
                const offset = -acc;
                return (
                  <circle
                    key={d.label}
                    cx={60}
                    cy={60}
                    r={radius}
                    fill="none"
                    stroke={PIE_COLORS[i % PIE_COLORS.length]}
                    strokeWidth={20}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    className={hovered != null && hovered !== i ? 'statistics-pie-slice dimmed' : 'statistics-pie-slice'}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                  >
                    <title>{`${d.label}: ${d.value} (${total > 0 ? Math.round(frac * 100) : 0}%)`}</title>
                  </circle>
                );
              })}
            </g>
          )}
          <text x={60} y={56} textAnchor="middle" className="statistics-pie-total-value">{total}</text>
          <text x={60} y={72} textAnchor="middle" className="statistics-pie-total-label">total</text>
        </svg>
        <ul className="statistics-pie-legend">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <li
                key={d.label}
                className={hovered === i ? 'active' : ''}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                <i className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="statistics-pie-legend-label">{d.label}</span>
                <span className="statistics-pie-legend-value">{d.value} <em>({pct}%)</em></span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
