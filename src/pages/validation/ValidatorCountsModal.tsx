/**
 * "Cuántos": cuántos productos validó y cuántos marcó como "Falta información" cada persona, con filtro por fecha y por
 * qué mirar (todo / validados / falta información). Sin contar dos veces: total = validados + falta información (un
 * marcado que después se validó cuenta solo como validado). Los validados antes de la migración 289 van como "Sin registro".
 */
import { useEffect, useState } from 'react';
import { IoCameraOutline, IoCheckmarkDoneCircleOutline, IoLayersOutline, IoPeopleOutline } from 'react-icons/io5';
import { Modal, LoadingSpinner, DateRangePicker, FilterButtonGroup, StatTile, type DateRange } from '../../components/ui';
import { ValidationService, type ValidatorCounts } from '../../services/validation.service';

type View = 'all' | 'validated' | 'needsPhotos';
type Row = ValidatorCounts['items'][number];

const MEDALS = ['🥇', '🥈', '🥉'];
const VIEWS = [
  { value: 'all', label: 'Todo' },
  { value: 'validated', label: '✅ Validados' },
  { value: 'needsPhotos', label: '📷 Falta información' },
];
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('es-UY') : '—');
const pctOf = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

export function ValidatorCountsModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [range, setRange] = useState<DateRange | null>(null);
  const [view, setView] = useState<View>('all');
  // El resultado lleva la clave del pedido (rango): "cargando" = la clave guardada no es la actual.
  const key = range ? `${range.from.toISOString()}|${range.to.toISOString()}` : 'all';
  const [result, setResult] = useState<{ key: string; data: ValidatorCounts | null; error: string | null } | null>(null);
  const loading = show && result?.key !== key;
  const data = result?.data ?? null;
  const error = result?.key === key ? result.error : null;

  useEffect(() => {
    if (!show) return;
    let alive = true;
    ValidationService.validatorCounts(range?.from, range?.to)
      .then((r) => { if (alive) setResult({ key, data: r, error: null }); })
      .catch(() => { if (alive) setResult((prev) => ({ key, data: prev?.data ?? null, error: 'No se pudo traer el conteo.' })); });
    return () => { alive = false; };
  }, [show, range, key]);

  const t = data?.totals;
  // Qué número manda en cada vista (orden del ranking y largo de la barra).
  const metric = (r: Row) => (view === 'validated' ? r.validated : view === 'needsPhotos' ? r.needsPhotos : r.reviewed);
  const rows = (data?.items ?? []).filter((r) => metric(r) > 0).sort((a, b) => metric(b) - metric(a) || a.email.localeCompare(b.email));
  const showUnknown = !range && view !== 'needsPhotos' && !!t?.unknown;
  const max = Math.max(1, ...rows.map(metric), showUnknown ? t?.unknown ?? 0 : 0);

  return (
    <Modal show={show} title="¿Cuántos revisó cada uno?" onClose={onClose} error={error ?? undefined} maxWidth="820px">
      <div className="modal-body vc-body">
        <div className="vc-daterow">
          <DateRangePicker label="Fecha:" value={range} onChange={setRange} />
          <FilterButtonGroup label="Ver:" options={VIEWS} value={view} onChange={(v) => setView(v as View)} />
          {loading && data && <span className="vc-updating">Actualizando…</span>}
        </div>

        {loading && !data ? (
          <LoadingSpinner message="Contando..." />
        ) : t && (
          <>
            <div className="stat-tile-row vc-tiles">
              <StatTile icon={<IoCheckmarkDoneCircleOutline />} value={t.validated} rate={`${pctOf(t.validated, t.reviewed)}%`} label="Validados" />
              <StatTile icon={<IoCameraOutline />} value={t.needsPhotos} rate={`${pctOf(t.needsPhotos, t.reviewed)}%`} label="Falta información" />
              <StatTile icon={<IoLayersOutline />} value={t.reviewed} label="Total revisados" />
              <StatTile icon={<IoPeopleOutline />} value={rows.length}
                label={`${rows.length === 1 ? 'Persona' : 'Personas'}${view === 'validated' ? ' que validaron' : view === 'needsPhotos' ? ' que marcaron falta de información' : ''}`} />
            </div>

            {rows.length === 0 && !showUnknown ? (
              <p className="vc-empty">
                {view === 'needsPhotos' ? 'Nadie marcó productos con falta de información' : view === 'validated' ? 'Nadie validó productos' : 'No hay validados ni marcados'}
                {range ? ' en estas fechas.' : '.'}
              </p>
            ) : (
              <ol className="vc-list">
                {rows.map((r, idx) => {
                  const np = pctOf(r.needsPhotos, r.reviewed);
                  return (
                    <li key={r.userId} className="vc-row">
                      <span className="vc-pos" aria-label={`Puesto ${idx + 1}`}>{MEDALS[idx] ?? idx + 1}</span>
                      <span className="vc-avatar" aria-hidden>{(r.name || r.email).trim().charAt(0).toUpperCase()}</span>
                      <div className="vc-who">
                        <strong title={r.email}>{r.email.split('@')[0]}</strong>
                        <span className="vc-sub">{r.name ? `${r.name} · ` : ''}último: {fmtDate(r.lastAt)}</span>
                      </div>
                      <div className="vc-bar" aria-hidden>
                        {view !== 'needsPhotos' && <span className="vc-seg-ok" style={{ width: `${(r.validated / max) * 100}%` }} />}
                        {view !== 'validated' && <span className="vc-seg-np" style={{ width: `${(r.needsPhotos / max) * 100}%` }} />}
                      </div>
                      <div className="vc-nums">
                        {view === 'all' ? (
                          <>
                            <span className="vc-num vc-num-ok" title="Validados">✅ {r.validated}</span>
                            <span className="vc-num vc-num-np" title="Falta información (no validados)">📷 {r.needsPhotos} <small>({np}%)</small></span>
                            <span className="vc-num vc-num-total" title="Total revisados = validados + falta información">= {r.reviewed}</span>
                          </>
                        ) : view === 'validated' ? (
                          <span className="vc-count">{r.validated}</span>
                        ) : (
                          <>
                            <span className="vc-count vc-count-np">{r.needsPhotos}</span>
                            <small className="vc-pct">{np}% de lo que revisó</small>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
                {showUnknown && t && (
                  <li className="vc-row vc-unknown" title="Se validaron antes del 9/11/2026, cuando todavía no se guardaba quién validaba.">
                    <span className="vc-pos">—</span>
                    <span className="vc-avatar" aria-hidden>?</span>
                    <div className="vc-who">
                      <strong>Sin registro</strong>
                      <span className="vc-sub">validados antes del 9/11, sin dato de quién</span>
                    </div>
                    <div className="vc-bar" aria-hidden><span className="vc-seg-unknown" style={{ width: `${(t.unknown / max) * 100}%` }} /></div>
                    <div className="vc-nums">
                      {view === 'all' ? <span className="vc-num">✅ {t.unknown}</span> : <span className="vc-count">{t.unknown}</span>}
                    </div>
                  </li>
                )}
              </ol>
            )}
            <p className="vc-note">
              Total = validados + falta información. Si un producto marcado con falta de información después se validó, cuenta solo como validado.
              {range ? ' Con fechas, los validados cuentan desde el 9/11/2026 (antes no se guardaba la fecha).' : ''}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
