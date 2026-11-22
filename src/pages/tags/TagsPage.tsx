/**
 * Tags (Admin): la taxonomía con la que se buscan alternativas y se agrupan productos.
 *
 * - Tags: validar lo que creó la IA, renombrar, fusionar duplicados y borrar (admin).
 * - Grupos: a qué categorías aplica cada eje y cuánto se usa.
 * - Productos: ver y filtrar productos por sus tags, y corregirlos (a mano o con la sugerencia de la IA).
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, NotificationBanner, PageHeader, SearchInput } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { TagsService } from '../../services/tags.service';
import type { AdminTag, TagGroupSummary } from '../../services/tags.service';
import { getApiMessage } from '../../services/apiError';
import { TagsPanel } from './components/TagsPanel';
import type { TagsFilter } from './components/TagsPanel';
import { GroupsPanel } from './components/GroupsPanel';
import { ProductsPanel } from './components/ProductsPanel';
import { EMPTY_PRODUCTS_FILTER } from './components/productsFilter';
import type { ProductsFilter } from './components/productsFilter';
import { loadCategoryOptions } from './components/categoryOptions';
import type { CategoryOption } from './components/categoryOptions';
import './TagsPage.css';

type Tab = 'tags' | 'groups' | 'products';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tags', label: 'Tags' },
  { id: 'groups', label: 'Grupos' },
  { id: 'products', label: 'Productos' },
];

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  tags: 'Buscar tag...',
  groups: 'Buscar grupo o categoría...',
  products: 'Buscar por nombre, marca o código...',
};

const COUNT_LABEL: Record<Tab, [string, string]> = {
  tags: ['tag', 'tags'],
  groups: ['grupo', 'grupos'],
  products: ['producto', 'productos'],
};

const INITIAL_TAGS_FILTER: TagsFilter = { groupId: 'ALL', status: 'ALL', sort: 'name' };

export function TagsPage() {
  const crud = useCRUDActions();
  const [activeTab, setActiveTab] = useState<Tab>('tags');
  const [search, setSearch] = useState<Record<Tab, string>>({ tags: '', groups: '', products: '' });
  const [totals, setTotals] = useState({ tags: 0, products: 0 });
  const [error, setError] = useState('');

  const [groups, setGroups] = useState<TagGroupSummary[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [tagsFilter, setTagsFilter] = useState<TagsFilter>(INITIAL_TAGS_FILTER);
  const [productsFilter, setProductsFilter] = useState<ProductsFilter>(EMPTY_PRODUCTS_FILTER);
  const [creating, setCreating] = useState(false);

  const reloadGroups = useCallback(async () => {
    try {
      const summary = await TagsService.getGroupsSummary();
      setGroups(summary);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron cargar los grupos'));
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadGroups();
    loadCategoryOptions().then(setCategories).catch(() => setCategories([]));
  }, [reloadGroups]);

  const setTagsTotal = useCallback((n: number) => setTotals((prev) => ({ ...prev, tags: n })), []);
  const setProductsTotal = useCallback((n: number) => setTotals((prev) => ({ ...prev, products: n })), []);
  const { showSuccess: crudSuccess } = crud;
  const showSuccess = useCallback((message: string) => { setError(''); crudSuccess(message); }, [crudSuccess]);

  const goTo = (tab: Tab) => {
    setCreating(false);
    setActiveTab(tab);
  };

  const openProductsWithTag = useCallback((tag: AdminTag) => {
    setProductsFilter({ ...EMPTY_PRODUCTS_FILTER, tags: [{ id: tag.id, name: tag.name, groupName: tag.tagGroupName ?? '' }] });
    setSearch((prev) => ({ ...prev, products: '' }));
    setActiveTab('products');
  }, []);

  const shownTotal = activeTab === 'groups' ? groups.length : totals[activeTab];
  const [one, many] = COUNT_LABEL[activeTab];

  const tabs = (
    <div className="tags-page-tabs" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activeTab === t.id}
          className={`tags-page-tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => goTo(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const headerActions = (
    <div className="header-actions">
      <div className="header-count">
        <span className="count-number">{shownTotal}</span>
        <span className="count-label">{shownTotal === 1 ? one : many}</span>
      </div>
      <div className="header-search">
        <SearchInput
          value={search[activeTab]}
          onChange={(value) => setSearch((prev) => ({ ...prev, [activeTab]: value }))}
          placeholder={SEARCH_PLACEHOLDER[activeTab]}
        />
      </div>
      {activeTab === 'tags' && (
        <Button variant="primary" onClick={() => setCreating(true)} disabled={groups.length === 0}>+ Tag</Button>
      )}
      {activeTab === 'groups' && (
        <Button variant="primary" onClick={() => setCreating(true)}>+ Grupo</Button>
      )}
    </div>
  );

  return (
    <AdminLayout className="page-tags">
      <PageHeader
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Tags', onClick: () => goTo('tags') },
          { label: TABS.find((t) => t.id === activeTab)!.label },
        ]}
        title={activeTab === 'tags' ? 'Tags' : `Tags · ${TABS.find((t) => t.id === activeTab)!.label}`}
        aboveTitle={tabs}
        actions={headerActions}
      />

      <NotificationBanner type="success" message={crud.successMessage} />
      <NotificationBanner type="error" message={error} />

      {activeTab === 'tags' && (
        <TagsPanel
          search={search.tags}
          groups={groups}
          filter={tagsFilter}
          onFilterChange={setTagsFilter}
          onTotal={setTagsTotal}
          onOpenProducts={openProductsWithTag}
          onChanged={reloadGroups}
          onSuccess={showSuccess}
          onError={setError}
          creating={creating}
          onCreatingDone={() => setCreating(false)}
        />
      )}

      {activeTab === 'groups' && (
        <GroupsPanel
          search={search.groups}
          groups={groups}
          loading={groupsLoading}
          categories={categories}
          onChanged={reloadGroups}
          onOpenPending={(g) => {
            setTagsFilter({ groupId: g.id, status: 'PENDING', sort: 'products' });
            setSearch((prev) => ({ ...prev, tags: '' }));
            goTo('tags');
          }}
          onOpenMissing={(g) => {
            setProductsFilter({ ...EMPTY_PRODUCTS_FILTER, missingGroupId: g.id });
            setSearch((prev) => ({ ...prev, products: '' }));
            goTo('products');
          }}
          onSuccess={showSuccess}
          onError={setError}
          creating={creating}
          onCreatingDone={() => setCreating(false)}
        />
      )}

      {activeTab === 'products' && (
        <ProductsPanel
          search={search.products}
          groups={groups}
          categories={categories}
          filter={productsFilter}
          onFilterChange={setProductsFilter}
          onTotal={setProductsTotal}
          onChanged={reloadGroups}
          onSuccess={showSuccess}
          onError={setError}
        />
      )}
    </AdminLayout>
  );
}
