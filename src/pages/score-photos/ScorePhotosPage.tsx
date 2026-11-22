import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FilterButtonGroup, ImageLightbox, LoadingSpinner, NotificationBanner, PageHeader, Pagination } from '../../components/ui';
import type { FilterOption } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ScorePhotosService } from '../../services/score-photos.service';
import type { ScorePhoto, ScorePhotoStatus } from '../../services/score-photos.service';
import { getApiMessage } from '../../services/apiError';
import './ScorePhotosPage.css';

const PAGE_SIZE = 24;

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'all', label: 'Todas' },
];

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Fotos para el puntaje: tablas nutricionales que mandaron los usuarios cuando el puntaje v4 de un producto quedó
 * aproximado (le faltaba información). Catálogo abre el producto, carga la tabla y marca la foto como revisada.
 */
export function ScorePhotosPage() {
  const [items, setItems] = useState<ScorePhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ScorePhotoStatus>('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [marking, setMarking] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ScorePhoto | null>(null);
  /** Fotos cuya URL firmada no cargó (vence en 1 hora): se ofrece recargar la lista. */
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const myId = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const r = await ScorePhotosService.list(status, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      if (myId !== requestId.current) return; // llegó una respuesta vieja (cambió el filtro o la página)
      setItems(r.items);
      setTotal(r.total);
      setBroken(new Set());
    } catch (e) {
      if (myId === requestId.current) setError(getApiMessage(e, 'No se pudieron cargar las fotos'));
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
  }, [status, page]);
  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Si al marcar revisadas la página quedó vacía, volver a la anterior.
  useEffect(() => { if (!loading && page > totalPages) setPage(totalPages); }, [loading, page, totalPages]);

  const changeStatus = (v: string) => { setStatus(v === 'all' ? 'all' : 'pending'); setPage(1); setSuccess(''); };

  const markReviewed = async (p: ScorePhoto) => {
    if (marking) return;
    setMarking(p.id);
    setError('');
    setSuccess('');
    try {
      await ScorePhotosService.markReviewed(p.id);
      if (status === 'pending') {
        setItems((prev) => prev.filter((x) => x.id !== p.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        const now = new Date().toISOString();
        setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, reviewedAt: now } : x)));
      }
      setSuccess(`Foto de "${p.productName || 'producto sin nombre'}" marcada como revisada.`);
    } catch (e) {
      setError(getApiMessage(e, 'No se pudo marcar la foto como revisada'));
    } finally {
      setMarking(null);
    }
  };

  const markBroken = (id: string) => setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  return (
    <AdminLayout className="page-score-photos">
      <PageHeader
        title="Fotos para el puntaje"
        description="Cuando a un producto le falta información, su puntaje queda aproximado y la app le pide al usuario una foto de la tabla nutricional. Abrí el producto, cargá los datos de la foto y marcala como revisada."
        count={total}
        countLabel={status === 'pending' ? 'pendientes' : 'fotos'}
        countLabelSingular={status === 'pending' ? 'pendiente' : 'foto'}
        actions={<Button variant="secondary" onClick={() => void load()} disabled={loading}>Recargar</Button>}
      />

      <div className="sp-filters">
        <FilterButtonGroup label="Mostrar" options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
      </div>

      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />

      {loading ? (
        <div className="sp-loading"><LoadingSpinner /></div>
      ) : items.length === 0 ? (
        <div className="sp-empty">
          {status === 'pending' ? 'No hay fotos pendientes. 🎉' : 'Todavía no llegó ninguna foto.'}
        </div>
      ) : (
        <div className="sp-grid">
          {items.map((p) => {
            const name = p.productName || 'Producto sin nombre';
            const imgOk = !!p.imageUrl && !broken.has(p.id);
            return (
              <article key={p.id} className={`sp-card ${p.reviewedAt ? 'sp-card--reviewed' : ''}`}>
                {imgOk ? (
                  <button type="button" className="sp-thumb" onClick={() => setViewing(p)} title="Ver la foto grande">
                    <img src={p.imageUrl ?? undefined} alt={`Tabla nutricional de ${name}`} loading="lazy" onError={() => markBroken(p.id)} />
                  </button>
                ) : (
                  <div className="sp-thumb sp-thumb--broken">
                    <span>No se pudo cargar la foto.</span>
                    <span className="sp-thumb-hint">El enlace vence en 1 hora: tocá "Recargar".</span>
                  </div>
                )}
                <div className="sp-body">
                  <div className="sp-name" title={name}>{name}</div>
                  <div className="sp-meta">
                    <span>Código: <strong>{p.barcode || '—'}</strong></span>
                    <span>Llegó: {fmtDate(p.createdAt)}</span>
                    {p.reviewedAt && <span className="sp-reviewed">✅ Revisada: {fmtDate(p.reviewedAt)}</span>}
                  </div>
                  <div className="sp-actions">
                    <Link
                      className="btn btn-primary btn-small"
                      to={`/validation/${encodeURIComponent(p.productId)}?tab=tabla`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Se abre en otra pestaña, en la tabla nutricional, para tener la foto al lado"
                    >
                      Abrir producto
                    </Link>
                    {imgOk && (
                      <a className="btn btn-outline btn-small" href={p.imageUrl ?? undefined} target="_blank" rel="noopener noreferrer" title="Abrir la foto en otra pestaña">
                        Foto ↗
                      </a>
                    )}
                    {!p.reviewedAt && (
                      <Button variant="secondary" size="small" onClick={() => void markReviewed(p)} disabled={!!marking}>
                        {marking === p.id ? 'Marcando…' : 'Marcar revisada'}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      {viewing?.imageUrl && (
        <ImageLightbox
          src={viewing.imageUrl}
          alt={`Tabla nutricional de ${viewing.productName || 'producto sin nombre'}`}
          onClose={() => setViewing(null)}
        />
      )}
    </AdminLayout>
  );
}
