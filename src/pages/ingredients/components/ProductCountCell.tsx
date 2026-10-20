/**
 * Cantidad de productos que usan un ingrediente / variante. Si hay alguno, el número abre la lista
 * (el mismo modal que el botón de productos de las variantes).
 */
interface ProductCountCellProps {
  count?: number;
  onClick: () => void;
}

export function ProductCountCell({ count, onClick }: ProductCountCellProps) {
  if (count === undefined) return <span className="product-count is-empty">—</span>;
  if (count === 0) return <span className="product-count is-empty" title="Ningún producto lo usa">0</span>;
  return (
    <button type="button" className="product-count" onClick={onClick} title="Ver los productos">
      {count.toLocaleString('es-UY')}
    </button>
  );
}
