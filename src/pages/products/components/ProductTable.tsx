/**
 * Componente de Tabla de Productos
 */
import { useMemo } from 'react';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { Product } from '../types';
import { IoSparkles } from 'react-icons/io5';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

function getScoreColor(score: number | null): string {
  if (score === null) return '#9E9E9E';
  if (score >= 85) return '#388E3C';
  if (score >= 65) return '#689F38';
  if (score >= 45) return '#F9A825';
  if (score >= 25) return '#EF6C00';
  return '#D32F2F';
}

interface Category {
  id: string;
  name: string;
  isAssignable: boolean;
}

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onCalculateScore: (product: Product) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
}

export function ProductTable({
  products,
  categories,
  loading,
  onEdit,
  onDelete,
  onCalculateScore,
  onValidationChange,
  validatingId,
}: ProductTableProps) {
  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (product) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {product.image ? (
              <img
                src={product.image}
                alt=""
                loading="lazy"
                style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'contain', background: '#f3f3f3', flexShrink: 0 }}
              />
            ) : (
              <span
                style={{ width: 56, height: 56, borderRadius: 8, background: '#f0f0f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}
              >
                📦
              </span>
            )}
            <span className="td-name">
              {product.name}
              {product.isReference && (
                <span
                  title="Ficha de referencia (sin nutrición). Editala para completar los datos y validarla."
                  style={{
                    marginLeft: 8,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: '#ECBF0A22',
                    color: '#7A5F00',
                    fontSize: 11,
                    fontWeight: 700,
                    verticalAlign: 'middle',
                  }}
                >
                  REF
                </span>
              )}
            </span>
          </span>
        ),
      },
      {
        key: 'brand',
        header: 'Marca',
        render: (product) => product.brand,
      },
      {
        key: 'barcode',
        header: 'Código de Barras',
        hideOnMobile: true,
        render: (product) => product.barcode,
      },
      {
        key: 'category',
        header: 'Categoría',
        hideOnMobile: true,
        render: (product) => (
          <span className="badge badge-category">
            {categories.find((cat) => cat.id === product.categoryId)?.name ||
              'Sin categoría'}
          </span>
        ),
      },
      {
        key: 'score',
        header: 'Puntaje',
        hideOnMobile: true,
        render: (product) => {
          if (product.aiGenerated && !product.inspected) {
            return <span className="badge-score badge-score-ai" title="Producto IA sin inspeccionar"><IoSparkles size={16} /></span>;
          }
          const score = product.score ?? null;
          const color = getScoreColor(score);
          return (
            <span className="badge-score" style={{ background: color }}>
              {score !== null ? score : '—'}
            </span>
          );
        },
      },
      {
        key: 'inspected',
        header: 'Validado',
        render: (product) =>
          product.isReference ? (
            // Un reference no se "valida" suelto: hay que completarlo (modal) y eso lo promueve.
            <button
              className="badge badge-clickable validated-no"
              onClick={() => onEdit(product)}
              title="Completar los datos y validar (deja de ser reference)"
            >
              Completar
            </button>
          ) : (
            <button
              className={`badge badge-clickable ${
                product.inspected ? 'validated-yes' : 'validated-no'
              } ${validatingId === product.id ? 'badge-loading' : ''}`}
              onClick={() => onValidationChange(product.id, product.inspected)}
              disabled={validatingId !== null}
            >
              {validatingId === product.id
                ? '⏳'
                : product.inspected
                  ? 'Validado'
                  : 'Sin validar'}
            </button>
          ),
      },
    ],
    [categories, onValidationChange, validatingId, onEdit],
  );

  const renderActions = useMemo(
    () => (product: Product) => (
      <>
        <button
          className="action-btn calc-btn"
          onClick={() => onCalculateScore(product)}
          title="Calcular puntaje"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="10" y2="18" />
            <line x1="14" y1="18" x2="16" y2="18" />
          </svg>
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(product)}
          title="Editar producto"
        >
          <img src={editIcon} alt="Editar" className="icon-img" />
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(product.id)}
          title="Eliminar producto"
        >
          <img src={deleteIcon} alt="Eliminar" className="icon-img" />
        </button>
      </>
    ),
    [onCalculateScore, onEdit, onDelete],
  );

  return (
    <DataTable<Product>
      columns={columns}
      data={products}
      loading={loading}
      loadingMessage="Cargando productos..."
      emptyIcon="📦"
      emptyMessage="Sin productos"
      keyExtractor={(product) => product.id}
      renderActions={renderActions}
      className="product-table-container"
    />
  );
}
