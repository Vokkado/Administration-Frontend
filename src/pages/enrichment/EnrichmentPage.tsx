/**
 * Enriquecer productos "reference": fichas que tienen código, nombre y foto pero no
 * nutrición ni ingredientes. Se elige un conjunto (a mano o los próximos pendientes) y
 * se buscan sus datos en los súper + OpenFoodFacts, completándolos con IA.
 *
 * El backend enriquece UN producto por request, así que el lote lo itera esta página,
 * de a uno y en serie. Lo que sale completo pasa solo a la cola de "Validar productos".
 */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Button,
  DataTable,
  FilterButtonGroup,
  NotificationBanner,
  Pagination,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui/DataTable';
import { usePaginatedList, type PaginatedFetchParams } from '../../hooks/usePaginatedList';
import {
  EnrichmentService,
  type EnrichCandidate,
  type EnrichOneResult,
  type EnrichStatus,
} from '../../services/enrichment.service';
import './EnrichmentPage.css';

/**
 * Tope por corrida. Cada producto dispara entre 10 y 19 pedidos a los supermercados, y
 * esos pedidos salen de la misma IP que trae los precios de la app: una corrida larga
 * arriesga que un súper la bloquee. 25 son ~6 minutos. Subirlo cuando se vea que aguanta.
 */
const MAX_PER_RUN = 25;
const BATCH_SIZES = [5, 10, 25];

/** 'error' no viene del backend: es cuando el request se corta (timeout de la Lambda, red). */
type RowStatus = EnrichStatus | 'error';

/** Subconjunto de las variantes de StatusBadge que usa esta pantalla (el tipo no se exporta). */
type BadgeVariant = 'validated' | 'pending' | 'inactive' | 'info' | 'danger';

const STATUS_UI: Record<RowStatus, { variant: BadgeVariant; label: string; hint: string }> = {
  enriched: { variant: 'validated', label: '✅ Enriquecido', hint: 'Pasó a la cola de validación' },
  incomplete: { variant: 'pending', label: '⚠️ Incompleto', hint: 'La IA no consiguió todo lo necesario' },
  no_sources: { variant: 'info', label: '🔍 Sin datos', hint: 'No apareció en ningún súper: no se llamó a la IA' },
  sources_timeout: { variant: 'pending', label: '⏱ Súper lentos', hint: 'Las fuentes tardaron demasiado' },
  ai_error: { variant: 'danger', label: '✖ Falló la IA', hint: 'La IA no respondió a tiempo o dio error' },
  throttled: { variant: 'inactive', label: '⏳ Muy reciente', hint: 'Ya se intentó hace menos de 24 h' },
  not_reference: { variant: 'inactive', label: '— Ya no aplica', hint: 'Dejó de ser un producto de referencia' },
  error: { variant: 'danger', label: '✖ Error', hint: 'Se cortó la conexión o se agotó el tiempo. Puede haber quedado a medias: reintentá forzando.' },
};

const MISSING_LABEL: Record<string, string> = {
  cover: 'portada',
  nutrition: 'nutrición',
  ingredients: 'ingredientes',
};

const formatDate = (value: string | null): string => {
  if (!value) return 'Nunca';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nunca' : date.toLocaleDateString('es-UY');
};

/** Detalle para el tooltip: qué encontró en los súper y qué le faltó. */
function resultHint(r: EnrichOneResult | { status: RowStatus }): string {
  const base = STATUS_UI[r.status as RowStatus]?.hint ?? '';
  const full = r as EnrichOneResult;
  if (!full.found) return base;
  const parts: string[] = [base];
  if (full.missing?.length) {
    parts.push(`Faltó: ${full.missing.map((m) => MISSING_LABEL[m] ?? m).join(', ')}.`);
  }
  if (full.found.stores?.length) {
    parts.push(`Encontrado en: ${full.found.stores.join(', ')}.`);
  }
  if (full.durationMs) parts.push(`${(full.durationMs / 1000).toFixed(1)}s`);
  return parts.join(' ');
}

export function EnrichmentPage() {
  const navigate = useNavigate();
  const [onlyPending, setOnlyPending] = useState('PENDING');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, EnrichOneResult | { status: RowStatus }>>(new Map());
  const [running, setRunning] = useState(false);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [force, setForce] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const cancelRef = useRef(false);

  const pending = onlyPending === 'PENDING';
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      EnrichmentService.listCandidates({ ...params, onlyPending: pending }),
    [pending],
  );
  const { items, total, loading, currentPage, totalPages, setCurrentPage, searchTerm, setSearchTerm, refetch } =
    usePaginatedList<EnrichCandidate>({ fetchFn });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pageIds = items.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  /**
   * Corre la lista de a uno. A diferencia del recálculo masivo de puntajes, acá NO hay
   * reintento automático: el backend marca el intento antes de trabajar, así que
   * reintentar un producto que se cortó solo devuelve "muy reciente" y quema tiempo.
   */
  const run = async (ids: string[]) => {
    if (!ids.length || running) return;
    setRunning(true);
    setError('');
    setSummary('');
    setResults(new Map());
    setProgress({ done: 0, total: ids.length });
    cancelRef.current = false;

    const byId = new Map(items.map((p) => [p.id, p.name]));
    const tally: Record<string, number> = {};
    const startedAt = Date.now();
    let done = 0;

    for (const id of ids) {
      if (cancelRef.current) break;
      setCurrentName(byId.get(id) ?? null);
      try {
        const r = await EnrichmentService.enrichOne(id, force);
        setResults((prev) => new Map(prev).set(id, r));
        tally[r.status] = (tally[r.status] ?? 0) + 1;
      } catch (e: any) {
        setResults((prev) => new Map(prev).set(id, { status: 'error' as RowStatus }));
        tally.error = (tally.error ?? 0) + 1;
        // Seguir después de un 429 solo empeora la ventana del limitador.
        if (e?.response?.status === 429) {
          setError('Se alcanzó el límite de solicitudes. Esperá unos minutos antes de seguir.');
          break;
        }
      }
      setProgress({ done: ++done, total: ids.length });
    }

    setCurrentName(null);
    setRunning(false);

    const minutes = ((Date.now() - startedAt) / 60000).toFixed(1);
    const parts = Object.entries(tally).map(
      ([status, n]) => `${n} ${STATUS_UI[status as RowStatus]?.label.replace(/^\S+\s/, '') ?? status}`,
    );
    setSummary(`${done} producto${done === 1 ? '' : 's'} procesado${done === 1 ? '' : 's'} en ${minutes} min · ${parts.join(' · ')}`);
    setSelected(new Set());
    // Solo al final: refrescar en el medio desacomoda el mapeo fila ↔ resultado.
    await refetch();
  };

  /** Toma los próximos N pendientes del servidor (no solo los de esta página). */
  const runNextPending = async () => {
    try {
      const res = await EnrichmentService.listCandidates({ limit: batchSize, offset: 0, search: searchTerm, onlyPending: true });
      if (!res.data.length) {
        setError('No quedan productos pendientes con estos filtros.');
        return;
      }
      await run(res.data.map((p) => p.id));
    } catch {
      setError('No pudimos obtener los productos pendientes.');
    }
  };

  const tooMany = selected.size > MAX_PER_RUN;

  const columns: DataTableColumn<EnrichCandidate>[] = [
    {
      key: 'select',
      header: '',
      width: '44px',
      align: 'center',
      headerAction: (
        <input
          type="checkbox"
          checked={allOnPageSelected}
          onChange={toggleAllOnPage}
          disabled={running || items.length === 0}
          title="Seleccionar toda la página"
        />
      ),
      render: (p) => (
        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={running} />
      ),
    },
    {
      key: 'image', header: '', width: '56px', render: (p) => p.image
        ? <img src={p.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'contain', background: '#f3f4f6' }} />
        : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6' }} />,
    },
    {
      // La marca va acá y no en su propia columna: las fichas de referencia casi nunca
      // la traen separada, así que una columna entera quedaba en "—".
      key: 'name',
      header: 'Producto',
      render: (p) => (
        <div className="enrich-name">
          <strong>{p.name}</strong>
          {p.brand && <span className="enrich-brand">{p.brand}</span>}
        </div>
      ),
    },
    {
      key: 'barcode', header: 'Código', hideOnMobile: true, width: '145px',
      render: (p) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.barcode || '—'}</span>,
    },
    { key: 'source', header: 'Origen', hideOnMobile: true, width: '100px', render: (p) => p.source || '—' },
    {
      key: 'lastEnrichAttemptAt', header: 'Intento', align: 'center', hideOnMobile: true, width: '110px',
      render: (p) => (
        <span
          style={{ fontSize: 13, color: p.lastEnrichAttemptAt ? '#6b7280' : '#9ca3af' }}
          title={p.lastEnrichAttemptAt ? new Date(p.lastEnrichAttemptAt).toLocaleString('es-UY') : 'Nunca se intentó'}
        >
          {formatDate(p.lastEnrichAttemptAt)}
        </span>
      ),
    },
    {
      key: 'result', header: 'Resultado', width: '150px', align: 'center',
      render: (p) => {
        const r = results.get(p.id);
        if (!r) return <span style={{ color: '#d1d5db' }}>—</span>;
        const ui = STATUS_UI[r.status as RowStatus];
        return <StatusBadge variant={ui.variant} title={resultHint(r)}>{ui.label}</StatusBadge>;
      },
    },
  ];

  return (
    <AdminLayout title="Enriquecer productos" wide>
      <PageHeader
        title="Enriquecer productos"
        description="Fichas de referencia sin nutrición ni ingredientes. Se buscan sus datos en los supermercados y se completan con IA; lo que sale completo pasa a la cola de validación."
        actions={
          <div className="header-actions">
            <div className="header-count">
              <span className="count-number">{total}</span>
              <span className="count-label">{total === 1 ? 'producto' : 'productos'}</span>
            </div>
            <div className="header-search">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="🔍 Buscar por nombre o código…" />
            </div>
          </div>
        }
      />

      <NotificationBanner type="success" message={summary} />
      <NotificationBanner type="error" message={error} />

      <div className="enrich-toolbar">
        <FilterButtonGroup
          label="Mostrar"
          value={onlyPending}
          onChange={(v) => { setOnlyPending(v); setCurrentPage(1); }}
          options={[
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'ALL', label: 'Todos' },
          ]}
        />

        <div className="enrich-actions">
          <Button
            variant="primary"
            disabled={running || selected.size === 0 || tooMany}
            onClick={() => run(Array.from(selected))}
            title={tooMany ? `Máximo ${MAX_PER_RUN} por corrida` : undefined}
          >
            Enriquecer seleccionados ({selected.size})
          </Button>

          <span className="enrich-batch">
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={running}
              aria-label="Cantidad por lote"
            >
              {BATCH_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <Button variant="outline" disabled={running} onClick={runNextPending}>
              Enriquecer los próximos pendientes
            </Button>
          </span>

          <label className="enrich-force" title="Por defecto no se reintenta un producto ya intentado en las últimas 24 horas.">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={running} />
            Ignorar el límite de 24 h
          </label>

          {selected.size > 0 && !running && (
            <button type="button" className="enrich-clear" onClick={() => setSelected(new Set())}>
              Limpiar selección
            </button>
          )}

          {running && (
            <Button variant="danger" onClick={() => { cancelRef.current = true; }}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {tooMany && (
        <p className="enrich-warn">
          Seleccionaste {selected.size}. El máximo por corrida es {MAX_PER_RUN}: cada producto consulta varios
          supermercados y una corrida larga arriesga que nos bloqueen.
        </p>
      )}

      {/* Se queda visible al terminar (con el estado final) para poder leer el resultado. */}
      {progress && (
        <div className="enrich-progress">
          <div className="enrich-progress-head">
            <span>{running ? (currentName ? `Enriqueciendo: ${currentName}` : 'Enriqueciendo…') : 'Última corrida'}</span>
            <span>
              {progress.done} / {progress.total}
              {' '}({Math.round((progress.done / Math.max(1, progress.total)) * 100)}%)
            </span>
          </div>
          <div className="enrich-progress-track">
            <div
              className="enrich-progress-fill"
              style={{ width: `${Math.min(100, (progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </div>
          {running && <p className="enrich-progress-note">Cada producto tarda unos segundos. Cancelar detiene al terminar el actual.</p>}
        </div>
      )}

      <DataTable
        className="enrich-table"
        columns={columns}
        data={items}
        loading={loading}
        emptyIcon="✨"
        emptyMessage="No hay fichas de referencia pendientes de enriquecer."
        actionsHeader=""
        actionsWidth="150px"
        actionsAlign="right"
        fixedLayout
        renderActions={(p) => (
          <Button variant="outline" disabled={running} onClick={() => run([p.id])}>
            Enriquecer
          </Button>
        )}
      />
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {summary && (
        <p className="enrich-footer-link">
          <button type="button" onClick={() => navigate('/validation')}>Ir a validar productos →</button>
        </p>
      )}
    </AdminLayout>
  );
}
