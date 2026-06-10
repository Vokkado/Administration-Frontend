/**
 * Modal de precios (comparador entre súper). Se consulta EN VIVO al abrir.
 * Flecha verde ↓ si bajó, roja ↑ si subió. Marca oferta, más barato y stale.
 */
import { useEffect, useState } from 'react';
import { ProductsService } from '../../../services/products.service';
import type { StorePrice } from '../../../services/products.service';

interface Props {
  show: boolean;
  productId: string | null;
  productName: string;
  onClose: () => void;
}

const fmt = (n: number) => `$ ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;

// Color de marca de cada súper (punto identificador). Fallback gris.
const STORE_COLORS: Record<string, string> = {
  eldorado: '#E2231A',
  tata: '#E30613',
  tiendainglesa: '#00833E',
  disco: '#ED1C24',
  devoto: '#0046AD',
  geant: '#E8520E',
};

export function PricesModal({ show, productId, productName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<StorePrice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !productId) return;
    let active = true;
    setLoading(true);
    setError(null);
    ProductsService.getPrices(productId)
      .then((r) => { if (active) setPrices(r.prices || []); })
      .catch(() => { if (active) setError('No se pudieron obtener los precios'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [show, productId]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>Precios — {productName}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888' }}>Consultando precios en vivo…</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#EF6C00' }}>{error}</p>
          ) : prices.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888' }}>Sin precios disponibles en los súper.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(() => {
                  // Mínimo: si varios empatan, todos van en verde; el cartel "Más barato"
                  // solo si hay un único ganador (con empate da igual, no se muestra).
                  const minPrice = prices[0].price;
                  const minCount = prices.filter((p) => p.price === minPrice).length;
                  return prices.map((p, i) => {
                  const cheapest = p.price === minPrice;
                  const showCheapTag = cheapest && minCount === 1;
                  return (
                    <tr key={p.store} style={{ borderTop: i ? '1px solid #eee' : 'none' }}>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: STORE_COLORS[p.store] ?? '#9E9E9E', flexShrink: 0 }} />
                          <strong>{p.storeName}</strong>
                          {showCheapTag && (
                            <span style={{ color: '#388E3C', fontSize: 12 }}>Más barato</span>
                          )}
                        </span>
                        {p.stale && (
                          <div style={{ color: '#9E9E9E', fontSize: 11, marginLeft: 16 }}>Precio no actualizado</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {p.direction === 'down' && <span style={{ color: '#388E3C', marginRight: 6 }}>↓</span>}
                        {p.direction === 'up' && <span style={{ color: '#EF4444', marginRight: 6 }}>↑</span>}
                        {p.isOffer && p.listPrice != null && (
                          <span style={{ color: '#9E9E9E', textDecoration: 'line-through', marginRight: 6, fontSize: 13 }}>{fmt(p.listPrice)}</span>
                        )}
                        <strong style={{ color: cheapest ? '#388E3C' : '#161616' }}>{fmt(p.price)}</strong>
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
