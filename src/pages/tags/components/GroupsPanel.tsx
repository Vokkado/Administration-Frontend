/**
 * Pestaña Grupos: cada eje de tags ("Tipo de producto", "Carne"…), a qué productos aplica y cuánto
 * se usa. Los grupos abiertos los va llenando la IA; en los cerrados elige de la lista.
 */
import { useMemo, useState } from 'react';
import { IoAlertCircleOutline } from 'react-icons/io5';
import { ConfirmDialog, DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { AdminOnly } from '../../../components/routing/AdminOnly';
import { OPEN_TAG_GROUPS, TagsService } from '../../../services/tags.service';
import type { TagGroupSummary } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';
import { matchesSearch } from '../../../utils/search';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { GroupModal } from './GroupModal';
import type { CategoryOption } from './categoryOptions';

interface GroupsPanelProps {
  search: string;
  groups: TagGroupSummary[];
  loading: boolean;
  categories: CategoryOption[];
  onChanged: () => Promise<void>;
  onOpenPending: (group: TagGroupSummary) => void;
  onOpenMissing: (group: TagGroupSummary) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  creating: boolean;
  onCreatingDone: () => void;
}

export function GroupsPanel({
  search, groups, loading, categories, onChanged, onOpenPending, onOpenMissing, onSuccess, onError, creating, onCreatingDone,
}: GroupsPanelProps) {
  const [editing, setEditing] = useState<TagGroupSummary | null>(null);
  const [deleting, setDeleting] = useState<TagGroupSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => groups.filter((g) => !search || matchesSearch(g.name, search) || g.categories.some((c) => matchesSearch(c.name, search))),
    [groups, search],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await TagsService.deleteGroup(deleting.id);
      await onChanged();
      onSuccess(`✅ Grupo "${deleting.name}" eliminado`);
    } catch (err) {
      onError(getApiMessage(err, 'No se pudo eliminar el grupo'));
    } finally {
      setSaving(false);
      setDeleting(null);
    }
  };

  const columns: DataTableColumn<TagGroupSummary>[] = [
    {
      key: 'name',
      header: 'Grupo',
      render: (g) => (
        <div>
          <span className="td-name">{g.name}</span>
          <span className="tags-inline-meta mobile-only">
            {g.scope === 'global' ? 'Todos los productos' : g.categories.map((c) => c.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Aplica a',
      hideOnMobile: true,
      render: (g) =>
        g.scope === 'global' ? (
          <span className="text-muted">Todos los productos</span>
        ) : g.categories.length === 0 ? (
          <span className="tags-pending-link">Ninguna categoría: no aplica a nada</span>
        ) : (
          <div className="tag-chips">
            {g.categories.map((c) => (
              <span key={c.id} className="badge badge-type">{c.name}</span>
            ))}
          </div>
        ),
    },
    {
      key: 'kind',
      header: 'Lista',
      align: 'center',
      width: '130px',
      hideOnMobile: true,
      render: (g) =>
        OPEN_TAG_GROUPS.includes(g.name) ? (
          <span className="badge badge-open" title="La IA puede crear valores nuevos (quedan sin validar)">Abierta</span>
        ) : (
          <span className="badge badge-closed" title="La IA solo elige de la lista; si nada encaja, lo deja vacío">Cerrada</span>
        ),
    },
    {
      key: 'tags',
      header: 'Tags',
      align: 'center',
      width: '130px',
      render: (g) => (
        <div>
          <span>{g.tagCount}</span>
          {g.pendingCount > 0 && (
            <button type="button" className="tags-link-btn tags-pending-link" onClick={() => onOpenPending(g)}>
              {g.pendingCount} sin validar
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Productos',
      align: 'center',
      width: '110px',
      hideOnMobile: true,
      render: (g) => <span>{g.productCount}</span>,
    },
  ];

  return (
    <>
      <DataTable<TagGroupSummary>
        columns={columns}
        data={visible}
        loading={loading}
        loadingMessage="Cargando grupos..."
        emptyMessage="No se encontraron grupos"
        keyExtractor={(g) => g.id}
        className="tags-table-container"
        renderActions={(g) => (
          <div className="tags-actions">
            <button className="action-btn" onClick={() => onOpenMissing(g)} title="Productos a los que les falta este grupo">
              <IoAlertCircleOutline size={18} />
            </button>
            <button className="action-btn edit-btn" onClick={() => setEditing(g)} title="Editar">
              <img src={editIcon} alt="Editar" className="icon-img" />
            </button>
            <AdminOnly>
              {/* Borrar un grupo se lleva sus tags y los vínculos de los productos: solo vacío. */}
              <button
                className="action-btn delete-btn"
                onClick={() => setDeleting(g)}
                disabled={g.tagCount > 0}
                title={g.tagCount > 0 ? 'Solo se puede eliminar un grupo sin tags' : 'Eliminar'}
              >
                <img src={deleteIcon} alt="Eliminar" className="icon-img" />
              </button>
            </AdminOnly>
          </div>
        )}
      />

      <GroupModal
        show={editing !== null || creating}
        group={editing}
        categories={categories}
        onClose={() => { setEditing(null); onCreatingDone(); }}
        onSaved={async (message) => {
          setEditing(null);
          onCreatingDone();
          await onChanged();
          onSuccess(message);
        }}
      />
      <ConfirmDialog
        show={deleting !== null}
        title="Eliminar grupo"
        message={deleting ? `"${deleting.name}" no tiene tags. Se elimina el grupo.` : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
