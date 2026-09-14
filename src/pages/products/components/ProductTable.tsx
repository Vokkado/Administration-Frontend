/**
 * Componente de Tabla de Productos
 */
import { useMemo } from 'react';
import { DataTable, ColumnFilter } from '../../../components/ui';
import type { DataTableColumn, DataTableSort, ColumnFilterOption } from '../../../components/ui';
import type { Product } from '../types';
import { IoSparkles } from 'react-icons/io5';
import { GiWineBottle } from 'react-icons/gi';
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
  /** null = categoría raíz. Se usa para anidar las subcategorías en el menú de filtro. */
  parentCategoryId: string | null;
}

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onCalculateScore: (product: Product) => void;
  onShowPrices: (product: Product) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
  filterInspected: string;
  onFilterInspectedChange: (value: string) => void;
  /** NORMAL | REFERENCE. El backend muestra uno u otro, nunca ambos. */
  filterReference: string;
  onFilterReferenceChange: (value: string) => void;
  /** ALL | NONE | p:<parentId> | c:<categoryId> */
  filterCategoryValue: string;
  onFilterCategoryValueChange: (value: string) => void;
}

const INSPECTED_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados' },
  { value: 'NOT_VALIDATED', label: 'No Validados' },
];

/** Sin opción "Todos": una ficha de referencia y un producto normal no conviven en la lista. */
const TYPE_OPTIONS: ColumnFilterOption[] = [
  { value: 'NORMAL', label: 'Normales' },
  { value: 'REFERENCE', label: 'Referencia' },
];

/** dd/mm/aaaa; el detalle con hora queda en el tooltip. */
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-UY');
};

export function ProductTable({
  products,
  categories,
  loading,
  onEdit,
  onDelete,
  onCalculateScore,
  onShowPrices,
  onValidationChange,
  validatingId,
  sort,
  onSortChange,
  filterInspected,
  onFilterInspectedChange,
  filterReference,
  onFilterReferenceChange,
  filterCategoryValue,
  onFilterCategoryValueChange,
}: ProductTableProps) {
  /**
   * Un solo menú con las dos jerarquías: las categorías padre y, indentadas, sus
   * subcategorías asignables. Evita el paso extra de "mostrar subcategorías" que tenía
   * la barra de filtros.
   */
  const categoryOptions = useMemo<ColumnFilterOption[]>(() => {
    const parents = categories
      .filter((cat) => !cat.isAssignable)
      .sort((a, b) => a.name.localeCompare(b.name));

    const options: ColumnFilterOption[] = [
      { value: 'ALL', label: 'Todas' },
      { value: 'NONE', label: 'Sin categoría' },
    ];
    for (const parent of parents) {
      options.push({ value: `p:${parent.id}`, label: parent.name });
      const children = categories
        .filter((cat) => cat.isAssignable && cat.parentCategoryId === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) options.push({ value: `c:${child.id}`, label: `— ${child.name}` });
    }
    // Asignables sin padre: quedarían fuera del recorrido anterior.
    for (const orphan of categories.filter((c) => c.isAssignable && !c.parentCategoryId)) {
      options.push({ value: `c:${orphan.id}`, label: orphan.name });
    }
    return options;
  }, [categories]);

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
            {/* El badge REF salió de acá: ahora el dato vive en la columna Tipo. */}
            <span className="td-name">{product.name}</span>
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        align: 'center',
        width: '135px',
        headerAction: (
          <ColumnFilter
            value={filterReference}
            options={TYPE_OPTIONS}
            onChange={onFilterReferenceChange}
            neutralValue="NORMAL"
            title="Filtrar por tipo de producto"
          />
        ),
        render: (product) => (
          <span
            className={`badge ${product.isReference ? 'badge-reference' : 'badge-normal'}`}
            title={product.isReference
              ? 'Ficha de referencia (sin nutrición). Completala para validarla.'
              : 'Producto completo'}
          >
            {product.isReference ? 'Referencia' : 'Normal'}
          </span>
        ),
      },
      {
        key: 'brand',
        header: 'Marca',
        width: '140px',
        render: (product) => product.brand,
      },
      {
        key: 'barcode',
        // "Código de Barras" no entra en un ancho razonable y se recortaba.
        header: 'Código',
        hideOnMobile: true,
        width: '160px',
        render: (product) => product.barcode,
      },
      {
        key: 'category',
        header: 'Categoría',
        hideOnMobile: true,
        width: '165px',
        headerAction: (
          <ColumnFilter
            value={filterCategoryValue}
            options={categoryOptions}
            onChange={onFilterCategoryValueChange}
            title="Filtrar por categoría"
          />
        ),
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
        align: 'center',
        width: '115px',
        render: (product) => {
          if (product.aiGenerated && !product.inspected) {
            return <span className="badge-score badge-score-ai" title="Producto IA sin inspeccionar"><IoSparkles size={16} /></span>;
          }
          if (product.alcoholGraduation && product.alcoholGraduation > 0) {
            // Alcohol no se puntúa (no hay nivel de consumo libre de riesgo, OMS):
            // color fijo rojo, botella + graduación en vez del número.
            return (
              <span className="badge-score" style={{ background: '#D32F2F', gap: 2 }} title={`Contiene alcohol (${product.alcoholGraduation}%)`}>
                <GiWineBottle size={14} />
                {String(product.alcoholGraduation).replace('.', ',')}%
              </span>
            );
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
        key: 'createdAt',
        header: 'Creado',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        width: '135px',
        render: (product) => (
          <span title={product.createdAt ? new Date(product.createdAt).toLocaleString('es-UY') : ''}>
            {formatDate(product.createdAt)}
          </span>
        ),
      },
      {
        key: 'inspected',
        header: 'Validado',
        align: 'center',
        width: '155px',
        headerAction: (
          <ColumnFilter
            value={filterInspected}
            options={INSPECTED_OPTIONS}
            onChange={onFilterInspectedChange}
            title="Filtrar por estado de validación"
          />
        ),
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
    [
      categories, categoryOptions, onValidationChange, validatingId, onEdit,
      filterInspected, onFilterInspectedChange,
      filterReference, onFilterReferenceChange,
      filterCategoryValue, onFilterCategoryValueChange,
    ],
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
          className="action-btn price-btn"
          onClick={() => onShowPrices(product)}
          title="Consultar precios en los súper"
          style={{ fontWeight: 700, fontSize: 16, color: '#388E3C' }}
        >
          $
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
    [onCalculateScore, onShowPrices, onEdit, onDelete],
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
      // 4 botones de acción: necesita más ancho que el resto de las tablas.
      actionsWidth="190px"
      fixedLayout
      sort={sort}
      onSortChange={onSortChange}
      renderActions={renderActions}
      className="product-table-container"
    />
  );
}
