/**
 * Pestaña Tags: todos los tags con su grupo, en cuántos productos están y si alguien los revisó.
 * Validar, renombrar y fusionar (editor de catálogo); borrar (solo admin).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoGitMergeOutline } from 'react-icons/io5';
import { Button, ColumnFilter, ConfirmDialog, DataTable, Pagination, StatusBadge } from '../../../components/ui';
import type { ColumnFilterOption, DataTableColumn } from '../../../components/ui';
import { AdminOnly } from '../../../components/routing/AdminOnly';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import { TagsService } from '../../../services/tags.service';
import type { AdminTag, TagGroupSummary } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { TagEditModal } from './TagEditModal';
import { MergeTagModal } from './MergeTagModal';

export interface TagsFilter {
  groupId: string; // 'ALL' o id de grupo
  status: 'ALL' | 'PENDING' | 'VALIDATED';
  sort: 'name' | 'products';
}

interface TagsPanelProps {
  search: string;
  groups: TagGroupSummary[];
  filter: TagsFilter;
  onFilterChange: (filter: TagsFilter) => void;
  onTotal: (total: number) => void;
  onOpenProducts: (tag: AdminTag) => void;
  /** Algo cambió (conteos de la pestaña Grupos). */
  onChanged: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  /** Se pidió crear un tag desde el encabezado. */
  creating: boolean;
  onCreatingDone: () => void;
}

const STATUS_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Sin validar' },
  { value: 'VALIDATED', label: 'Validados' },
];

export function TagsPanel({
  search, groups, filter, onFilterChange, onTotal, onOpenProducts, onChanged, onSuccess, onError, creating, onCreatingDone,
}: TagsPanelProps) {
  const isInspected = filter.status === 'ALL' ? undefined : filter.status === 'VALIDATED';
  const tagGroupId = filter.groupId === 'ALL' ? undefined : filter.groupId;

  const fetchFn = useCallback(
    (p: PaginatedFetchParams) => TagsService.listAdminTags({ ...p, tagGroupId, isInspected, sort: filter.sort }),
    [tagGroupId, isInspected, filter.sort],
  );
  const { items, total, loading, error, currentPage, totalPages, setSearchTerm, setCurrentPage, refetch } =
    usePaginatedList<AdminTag>({ fetchFn });

  useEffect(() => { setSearchTerm(search); }, [search, setSearchTerm]);
  // Mientras carga, el contador del encabezado mantiene el número anterior (no salta a 0).
  useEffect(() => { if (!loading) onTotal(total); }, [loading, total, onTotal]);
  useEffect(() => { if (error) onError(error); }, [error, onError]);

  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [merging, setMerging] = useState<AdminTag | null>(null);
  const [deleting, setDeleting] = useState<AdminTag | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const afterChange = async (message: string) => {
    await refetch();
    onChanged();
    onSuccess(message);
  };

  const validate = async (tags: AdminTag[]) => {
    if (tags.length === 0) return;
    setBusyId(tags.length === 1 ? tags[0].id : 'BULK');
    try {
      await TagsService.validateTags(tags.map((t) => t.id));
      await afterChange(tags.length === 1 ? `✅ "${tags[0].name}" validado` : `✅ ${tags.length} tags validados`);
    } catch (err) {
      onError(getApiMessage(err, 'No se pudo validar'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await TagsService.deleteTag(deleting.id);
      await afterChange(`✅ "${deleting.name}" eliminado`);
    } catch (err) {
      onError(getApiMessage(err, 'No se pudo eliminar el tag'));
    } finally {
      setSaving(false);
      setDeleting(null);
    }
  };

  const groupOptions = useMemo<ColumnFilterOption[]>(
    () => [{ value: 'ALL', label: 'Todos' }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
    [groups],
  );

  const columns: DataTableColumn<AdminTag>[] = [
      {
        key: 'name',
        header: 'Tag',
        render: (tag) => (
          <div>
            <span className="td-name">{tag.name}</span>
            {/* En celular la columna Grupo no entra. */}
            <span className="tags-inline-meta mobile-only">{tag.tagGroupName}</span>
          </div>
        ),
      },
      {
        key: 'group',
        header: 'Grupo',
        width: '220px',
        hideOnMobile: true,
        headerAction: (
          <ColumnFilter
            value={filter.groupId}
            options={groupOptions}
            onChange={(groupId) => onFilterChange({ ...filter, groupId })}
            title="Filtrar por grupo"
          />
        ),
        render: (tag) => <span className="badge badge-type">{tag.tagGroupName}</span>,
      },
      {
        key: 'products',
        header: 'Productos',
        align: 'center',
        width: '120px',
        sortable: true,
        render: (tag) => (
          <button
            type="button"
            className="tags-link-btn"
            disabled={tag.productCount === 0}
            onClick={() => onOpenProducts(tag)}
            title="Ver los productos con este tag"
          >
            {tag.productCount}
          </button>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        align: 'center',
        width: '160px',
        headerAction: (
          <ColumnFilter
            value={filter.status}
            options={STATUS_OPTIONS}
            onChange={(status) => onFilterChange({ ...filter, status: status as TagsFilter['status'] })}
            title="Filtrar por estado"
          />
        ),
        render: (tag) =>
          tag.isInspected ? (
            <StatusBadge variant="validated">Validado</StatusBadge>
          ) : (
            <StatusBadge
              variant="pending"
              clickable={busyId === null}
              onClick={() => busyId === null && validate([tag])}
              title={tag.createdByAi ? 'Lo creó la IA. Click para validarlo' : 'Click para validarlo'}
            >
              {busyId === tag.id ? '⏳' : tag.createdByAi ? 'Sin validar · IA' : 'Sin validar'}
            </StatusBadge>
          ),
      },
  ];

  const pendingOnPage = items.filter((t) => !t.isInspected);

  return (
    <>
      {pendingOnPage.length > 1 && (
        <div className="tags-toolbar">
          <span className="form-hint">
            {pendingOnPage.length} tags de esta página están sin validar.
          </span>
          <Button
            variant="outline"
            size="small"
            loading={busyId === 'BULK'}
            disabled={busyId !== null}
            onClick={() => validate(pendingOnPage)}
          >
            Validar los {pendingOnPage.length}
          </Button>
        </div>
      )}

      <DataTable<AdminTag>
        columns={columns}
        data={items}
        loading={loading}
        loadingMessage="Cargando tags..."
        emptyMessage="No se encontraron tags"
        keyExtractor={(tag) => tag.id}
        className="tags-table-container"
        sort={filter.sort === 'products' ? { key: 'products', direction: 'desc' } : undefined}
        onSortChange={() => onFilterChange({ ...filter, sort: filter.sort === 'products' ? 'name' : 'products' })}
        renderActions={(tag) => (
          <div className="tags-actions">
            <button className="action-btn edit-btn" onClick={() => setEditing(tag)} title="Renombrar">
              <img src={editIcon} alt="Renombrar" className="icon-img" />
            </button>
            <button className="action-btn" onClick={() => setMerging(tag)} title="Fusionar con otro tag del mismo grupo">
              <IoGitMergeOutline size={18} />
            </button>
            <AdminOnly>
              <button className="action-btn delete-btn" onClick={() => setDeleting(tag)} title="Eliminar">
                <img src={deleteIcon} alt="Eliminar" className="icon-img" />
              </button>
            </AdminOnly>
          </div>
        )}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <TagEditModal
        show={editing !== null || creating}
        tag={editing}
        groups={groups}
        defaultGroupId={tagGroupId}
        onClose={() => { setEditing(null); onCreatingDone(); }}
        onSaved={async (message) => { setEditing(null); onCreatingDone(); await afterChange(message); }}
      />
      <MergeTagModal
        source={merging}
        onClose={() => setMerging(null)}
        onMerged={async (message) => { setMerging(null); await afterChange(message); }}
      />
      <ConfirmDialog
        show={deleting !== null}
        title="Eliminar tag"
        message={
          deleting
            ? deleting.productCount > 0
              ? `"${deleting.name}" está en ${deleting.productCount} ${deleting.productCount === 1 ? 'producto' : 'productos'} y se les va a quitar. Si es un duplicado, mejor fusionalo: así los productos pasan al otro tag.`
              : `"${deleting.name}" no está en ningún producto.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
