/**
 * Modal para mostrar productos que contienen un ingrediente específico
 */
import { useState, useEffect } from 'react';
import { apiService } from '../../../services/api.service';
import './ProductsByIngredientModal.css';

interface Product {
  id: string;
  name: string;
  barcode: string;
  brand?: string;
  image?: string;
  rawIngredients?: string;
  ingredientList?: string;
}

interface ProductsByIngredientModalProps {
  ingredientId: string;
  ingredientName: string;
  onClose: () => void;
  isVariant?: boolean;
}

export function ProductsByIngredientModal({ 
  ingredientId, 
  ingredientName, 
  onClose,
  isVariant = false,
}: ProductsByIngredientModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [ingredientId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      if (isVariant) {
        // Buscar productos directamente por variant ID
        const response: any = await apiService.get(`/products/ingredient-variant/${ingredientId}`);
        const prods = response?.data?.data || response?.data || response || [];
        const prodList = Array.isArray(prods) ? prods : [];
        setProducts(prodList);
      } else {
        // Buscar variantes del ingrediente y luego productos de cada variante
        const variantsResponse: any = await apiService.get(`/ingredient-variants/ingredient/${ingredientId}`);
        const variants = variantsResponse?.data?.data || variantsResponse?.data || variantsResponse || [];
        const variantList = Array.isArray(variants) ? variants : [];

        if (variantList.length === 0) {
          setProducts([]);
          return;
        }

        const allProducts: Product[] = [];
        const seenIds = new Set<string>();
        for (const variant of variantList) {
          try {
            const response: any = await apiService.get(`/products/ingredient-variant/${variant.id}`);
            const prods = response?.data?.data || response?.data || response || [];
            const prodList = Array.isArray(prods) ? prods : [];
            for (const p of prodList) {
              if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                allProducts.push(p);
              }
            }
          } catch {
            // Si falla una variante, seguir con las demás
          }
        }
        setProducts(allProducts);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content products-modal">
        <div className="modal-header">
          <h3>Productos con {isVariant ? 'variante' : 'ingrediente'}: {ingredientName}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="no-products">
              <p>No se encontraron productos con esta variante</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="no-image">
                        <span>📦</span>
                      </div>
                    )}
                  </div>
                  <div className="product-info">
                    <h4>{product.name}</h4>
                    {product.brand && (
                      <p className="product-brand">{product.brand}</p>
                    )}
                    <p className="product-barcode">Código: {product.barcode}</p>
                    <p className="product-ingredients">
                      Ingredientes: {product.rawIngredients || product.ingredientList || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
