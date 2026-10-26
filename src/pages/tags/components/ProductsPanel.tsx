/**
 * Pestaña Productos: los productos analizables con sus tags, filtrables por tags (dentro de un grupo
 * alcanza con uno; entre grupos tienen que estar todos), categoría, "sin tags" o "les falta un grupo".
 * Tocar un producto abre el editor de sus tags (con la sugerencia de la IA).
 */
import { useCallback, useEffect, useState } from 'react';
import { DataTable, Pagination } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import { TagsService } from '../../../services/tags.service';
import type { TagGroupSummary, TaggedProduct } from '../../../services/tags.service';
import editIcon from '../../../../assets/icons/brownPencil.png';
import { TagSearch } from './TagSearch';
import { ProductTagsModal } from './ProductTagsModal';
import type { CategoryOption } from './categoryOptions';
import type { ProductsFilter } from './productsFilter';

interface ProductsPanelProps {
  search: string;
  groups: TagGroupSummary[];
  categories: CategoryOption[];
  filter: ProductsFilter;
  onFilterChange: (filter: ProductsFilter) => void;
  onTotal: (total: number) => void;
  onChanged: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ProductsPanel({
  search, groups, categories, filter, onFilterChange, onTotal, onChanged, onSuccess, onError,
}: ProductsPanelProps) {
  const tagIdsKey = filter.tags.map((t) => t.id).join(',');
  const fetchFn = useCallback(
    (p: PaginatedFetchParams) =>
      TagsService.listTaggedProducts({
        ...p,
        tagIds: tagIdsKey ? tagIdsKey.split(',') : undefined,
        categoryId: filter.categoryId || undefined,
        untagged: filter.untagged,
        missingGroupId: filter.missingGroupId || undefined,
      }),
    [tagIdsKey, filter.categoryId, filter.untagged, filter.missingGroupId],
  );
  const { items, total, loading, error, currentPage, totalPages, setSearchTerm, setCurrentPage, refetch } =
    usePaginatedList<TaggedProduct>({ fetchFn });

  useEffect(() => { setSearchTerm(search); }, [search, setSearchTerm]);
  // Mientras carga, el contador del encabezado mantiene el número anterior (no salta a 0).
  useEffect(() => { if (!loading) onTotal(total); }, [loading, total, onTotal]);
  useEffect(() => { if (error) onError(error); }, [error, onError]);

  const [editing, setEditing] = useState<TaggedProduct | null>(null);

  const columns: DataTableColumn<TaggedProduct>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (p) => (
        <div className="tags-product-cell">
          {p.image ? <img src={p.image} alt="" className="tags-product-thumb" loading="lazy" /> : <span className="tags-product-thumb" />}
          <div className="tags-product-text">
            <span className="td-name">{p.name}</span>
            <span className="tags-inline-meta">
              {[p.brand, p.categoryName].filter(Boolean).join(' · ') || 'Sin categoría'}
            </span>
            {/* En celular la columna Tags no entra: van debajo del nombre. */}
            <div className="mobile-only tags-product-mobile-chips"><ProductTagChips product={p} /></div>
          </div>
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      hideOnMobile: true,
      render: (p) => <ProductTagChips product={p} />,
    },
  ];

  const update = (patch: Partial<ProductsFilter>) => onFilterChange({ ...filter, ...patch });

  return (
    <>
      <div className="tags-toolbar">
        <TagSearch
          placeholder="Filtrar por tag…"
          excludeIds={filter.tags.map((t) => t.id)}
          onPick={(t) => update({ tags: [...filter.tags, { id: t.id, name: t.name, groupName: t.tagGroupName ?? '' }], untagged: false })}
        />
        <select
          className="select"
          value={filter.categoryId}
          onChange={(e) => update({ categoryId: e.target.value })}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>
          ))}
        </select>
        <select
          className="select"
          value={filter.missingGroupId}
          onChange={(e) => update({ missingGroupId: e.target.value, untagged: false })}
          aria-label="Les falta el grupo"
        >
          <option value="">Les falta el grupo…</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>Les falta: {g.name}</option>
          ))}
        </select>
        <label className="tags-toolbar-check">
          <input
            type="checkbox"
            checked={filter.untagged}
            onChange={(e) => update({ untagged: e.target.checked, ...(e.target.checked ? { tags: [], missingGroupId: '' } : {}) })}
          />
          Sin ningún tag
        </label>
      </div>

      {filter.tags.length > 0 && (
        <div className="tags-toolbar">
          <div className="tag-chips">
            {filter.tags.map((t) => (
              <span key={t.id} className="tag-chip">
                <span className="tag-chip-group">{t.groupName} ›</span> {t.name}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={() => update({ tags: filter.tags.filter((x) => x.id !== t.id) })}
                  title="Quitar filtro"
                  aria-label={`Quitar filtro ${t.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button type="button" className="tags-link-btn" onClick={() => update({ tags: [] })}>Limpiar</button>
        </div>
      )}

      <DataTable<TaggedProduct>
        columns={columns}
        data={items}
        loading={loading}
        loadingMessage="Cargando productos..."
        emptyMessage="No hay productos con esos filtros"
        keyExtractor={(p) => p.id}
        className="tags-table-container"
        actionsWidth="90px"
        renderActions={(p) => (
          <button className="action-btn edit-btn" onClick={() => setEditing(p)} title="Editar tags">
            <img src={editIcon} alt="Editar tags" className="icon-img" />
          </button>
        )}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <ProductTagsModal
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={async (message) => {
          setEditing(null);
          await refetch();
          onChanged();
          onSuccess(message);
        }}
      />
    </>
  );
}

function ProductTagChips({ product }: { product: TaggedProduct }) {
  if (product.tags.length === 0) return <span className="text-muted">Sin tags</span>;
  return (
    <div className="tag-chips">
      {product.tags.map((t) => (
        <span key={t.id} className={`tag-chip static ${t.isInspected ? '' : 'pending'}`} title={t.isInspected ? undefined : 'Tag creado por la IA, sin validar'}>
          <span className="tag-chip-group">{t.groupName} ›</span> {t.name}
        </span>
      ))}
    </div>
  );
}
