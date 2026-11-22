import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, NotificationBanner, SearchInput } from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { ScorePhotosService, type ApproximateProduct } from '../../services/score-photos.service';
import { getApiMessage } from '../../services/apiError';
import { matchesSearch } from '../../utils/search';

/**
 * Pestaña "Aproximados" de Puntaje: productos cuyo puntaje se calculó con el promedio de su familia porque les falta
 * información (tabla, porción, un dato clave o el tipo). Primero los que ya tienen una foto de la tabla que mandó un
 * usuario. "Abrir" lleva al asistente de validación: ahí está la foto, se cargan los datos y al validar queda exacto.
 */
export function ApproximatePanel({ onCount }: { onCount?: (n: number) => void }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApproximateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await ScorePhotosService.approximate();
      setItems(list);
      onCount?.(list.length);
    } catch (e) {
      setError(getApiMessage(e, 'No se pudieron cargar los productos'));
    } finally {
      setLoading(false);
    }
  }, [onCount]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => items.filter((p) => !search.trim() || matchesSearch(`${p.name} ${p.barcode ?? ''} ${p.reasons.join(' ')}`, search)),
    [items, search],
  );
  const withPhoto = items.filter((p) => p.pendingPhotos > 0).length;

  const columns: DataTableColumn<ApproximateProduct>[] = [
    {
      key: 'image', header: '', width: '56px', hideOnMobile: true, render: (p) => p.image
        ? <img src={p.image} alt="" className="ap-img" />
        : <div className="ap-img" />,
    },
    {
      key: 'name', header: 'Producto', render: (p) => (
        <div className="ap-name">
          <strong>{p.name}</strong>
          <span>{p.barcode ?? 'sin código'} · {p.validated ? 'validado' : 'sin validar'}</span>
        </div>
      ),
    },
    { key: 'score', header: 'Puntaje', width: '90px', align: 'center', render: (p) => <span className="ap-score">{p.score ?? '—'} ≈</span> },
    {
      key: 'reasons', header: 'Qué le falta', render: (p) => (
        <span className="ap-reasons">{p.reasons.length ? p.reasons.join(' · ') : 'Falta información de la etiqueta'}</span>
      ),
    },
    {
      key: 'photo', header: 'Foto de tabla', width: '150px', render: (p) => p.pendingPhotos > 0
        ? <span className="vq-needs-photos vq-score-photo">📷 {p.pendingPhotos === 1 ? 'Foto nueva' : `${p.pendingPhotos} fotos nuevas`}</span>
        : <span className="ap-muted">Todavía no</span>,
    },
  ];

  return (
    <div className="page-score-approx">
      <div className="ap-toolbar">
        <p className="ap-intro">
          Su puntaje se calculó con el promedio de su familia porque les falta información. La app le pide la foto de la tabla al próximo
          usuario que lo escanea. Abrilo en el asistente, cargá los datos y validá: el puntaje queda exacto.
          {' '}<strong>{items.length}</strong> {items.length === 1 ? 'producto' : 'productos'}{withPhoto ? `, ${withPhoto} con foto nueva` : ''}.
        </p>
        <div className="ap-search"><SearchInput value={search} onChange={setSearch} placeholder="Buscar producto o motivo…" /></div>
      </div>
      <NotificationBanner type="error" message={error} />
      <DataTable<ApproximateProduct>
        columns={columns}
        data={filtered}
        loading={loading}
        loadingMessage="Cargando productos..."
        emptyMessage={search ? 'No hay productos que coincidan' : 'No hay productos con puntaje aproximado 🎉'}
        keyExtractor={(p) => p.id}
        actionsHeader=""
        renderActions={(p) => (
          <Button variant={p.pendingPhotos > 0 ? 'primary' : 'outline'} size="small" onClick={() => navigate(`/validation/${p.id}`)}>
            Abrir
          </Button>
        )}
      />
    </div>
  );
}
