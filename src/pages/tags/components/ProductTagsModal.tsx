/**
 * Editor de los tags de UN producto, grupo por grupo (los que aplican a su categoría).
 *
 * "Sugerir con IA" pide a la misma IA del backfill lo que asignaría (una llamada, no guarda nada):
 * la propuesta reemplaza lo elegido en esos grupos y queda resaltada para revisarla. Recién al
 * guardar se crean los tags nuevos que se aceptaron (validados: los aceptó una persona) y se
 * reemplazan los tags del producto.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, LoadingSpinner, Modal } from '../../../components/ui';
import { OPEN_TAG_GROUPS, TagsService } from '../../../services/tags.service';
import type { ApplicableTagGroup, Tag, TaggedProduct } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';
import { matchesSearch, normalizeForSearch } from '../../../utils/search';

/** Hasta cuántos tags se muestran todos como opciones; con más, buscador. */
const MAX_INLINE_OPTIONS = 12;
const MAX_RESULTS = 8;

interface DraftTag {
  /** null = tag nuevo, se crea al guardar. */
  id: string | null;
  name: string;
}

interface EditorGroup {
  id: string;
  name: string;
  tags: Tag[];
  /** Grupo que ya no aplica a la categoría del producto (tiene tags de antes). */
  stale?: boolean;
}

interface ProductTagsModalProps {
  product: TaggedProduct | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function ProductTagsModal(props: ProductTagsModalProps) {
  return props.product ? <ProductTagsForm {...props} product={props.product} /> : null;
}

const draftKey = (draft: Record<string, DraftTag[]>) =>
  Object.values(draft).flat().map((t) => t.id ?? `new:${t.name}`).sort().join('|');

function ProductTagsForm({ product, onClose, onSaved }: ProductTagsModalProps & { product: TaggedProduct }) {
  const [groups, setGroups] = useState<EditorGroup[] | null>(null);
  const initialDraft = useMemo(() => {
    const draft: Record<string, DraftTag[]> = {};
    for (const t of product.tags) (draft[t.groupId] ??= []).push({ id: t.id, name: t.name });
    return draft;
  }, [product]);
  const [draft, setDraft] = useState<Record<string, DraftTag[]>>(initialDraft);
  const [aiGroups, setAiGroups] = useState<Set<string>>(new Set());
  const [aiNote, setAiNote] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    TagsService.getApplicableGroups(product.categoryId)
      .then((applicable: ApplicableTagGroup[]) => {
        if (!alive) return;
        const list: EditorGroup[] = applicable.map((g) => ({ id: g.id, name: g.name, tags: g.tags }));
        // Tags de grupos que ya no aplican (ej. le cambiaron la categoría): se muestran para poder sacarlos.
        for (const t of product.tags) {
          if (!list.some((g) => g.id === t.groupId)) list.push({ id: t.groupId, name: t.groupName, tags: [], stale: true });
        }
        setGroups(list);
      })
      .catch((err) => { if (alive) setError(getApiMessage(err, 'No se pudieron cargar los grupos')); });
    return () => { alive = false; };
  }, [product]);

  const dirty = draftKey(draft) !== draftKey(initialDraft);

  const setGroupDraft = (groupId: string, tags: DraftTag[]) => setDraft((prev) => ({ ...prev, [groupId]: tags }));

  const suggest = async () => {
    setSuggesting(true);
    setError('');
    setAiNote('');
    try {
      const suggestions = await TagsService.suggestProductTags(product.id);
      if (suggestions.length === 0) {
        setAiNote('La IA no propuso nada para este producto.');
        return;
      }
      setDraft((prev) => {
        const next = { ...prev };
        for (const s of suggestions) next[s.groupId] = [{ id: s.tagId, name: s.tagName }];
        return next;
      });
      setAiGroups(new Set(suggestions.map((s) => s.groupId)));
      const created = suggestions.filter((s) => !s.tagId).length;
      setAiNote(
        `La IA completó ${suggestions.length} ${suggestions.length === 1 ? 'grupo' : 'grupos'} (resaltados)` +
          (created > 0 ? ` y propuso ${created} ${created === 1 ? 'tag nuevo' : 'tags nuevos'}` : '') +
          '. Revisalos y guardá; los demás grupos quedaron como estaban.',
      );
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo pedir la sugerencia'));
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError('');
    try {
      const ids: string[] = [];
      for (const [groupId, tags] of Object.entries(draft)) {
        for (const t of tags) {
          if (t.id) ids.push(t.id);
          else ids.push(await createOrFind(groupId, t.name));
        }
      }
      await TagsService.setProductTags(product.id, [...new Set(ids)]);
      onSaved(`✅ Tags de "${product.name}" guardados`);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron guardar los tags'));
      setSaving(false);
    }
  };

  const busy = saving || suggesting;

  return (
    <Modal show title={`Tags · ${product.name}`} onClose={onClose} error={error} maxWidth="720px" className="page-tags">
      <div className="modal-body">
        <p className="tags-note">
          {product.categoryName ? `Categoría: ${product.categoryName}. ` : 'Sin categoría: solo aplican los grupos generales. '}
          Los tags con borde punteado los creó la IA y están sin validar.
        </p>
        {aiNote && <p className="tags-note ai">{aiNote}</p>}

        {!groups ? (
          <LoadingSpinner />
        ) : (
          <div className="product-tag-groups">
            {groups.map((g) => (
              <GroupEditor
                key={g.id}
                group={g}
                selected={draft[g.id] ?? []}
                aiTouched={aiGroups.has(g.id)}
                disabled={busy}
                onChange={(tags) => setGroupDraft(g.id, tags)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={suggest} loading={suggesting} disabled={busy || !groups}>
          ✨ Sugerir con IA
        </Button>
        <div style={{ flex: 1 }} />
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="button" variant="primary" onClick={save} loading={saving} disabled={!dirty || busy}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}

/** Crea el tag; si justo ya existe (otro lo creó), usa ese. */
async function createOrFind(groupId: string, name: string): Promise<string> {
  try {
    return (await TagsService.createTag({ tagGroupId: groupId, name })).id;
  } catch (err) {
    const { data } = await TagsService.listAdminTags({ limit: 20, offset: 0, tagGroupId: groupId, search: name });
    const existing = data.find((t) => normalizeForSearch(t.name) === normalizeForSearch(name));
    if (existing) return existing.id;
    throw err;
  }
}

function GroupEditor({ group, selected, aiTouched, disabled, onChange }: {
  group: EditorGroup;
  selected: DraftTag[];
  aiTouched: boolean;
  disabled: boolean;
  onChange: (tags: DraftTag[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selectedIds = new Set(selected.map((t) => t.id).filter(Boolean));
  const pendingIds = new Set(group.tags.filter((t) => !t.isInspected).map((t) => t.id));
  const unselected = group.tags.filter((t) => !selectedIds.has(t.id));
  // En las listas cerradas no se crea al vuelo: un valor nuevo se agrega desde la pestaña Tags.
  const canCreate = OPEN_TAG_GROUPS.includes(group.name) && !group.stale;
  const inline = group.tags.length <= MAX_INLINE_OPTIONS;

  const term = query.trim();
  const results = term ? unselected.filter((t) => matchesSearch(t.name, term)).slice(0, MAX_RESULTS) : [];
  const exactExists =
    group.tags.some((t) => normalizeForSearch(t.name) === normalizeForSearch(term)) ||
    selected.some((t) => normalizeForSearch(t.name) === normalizeForSearch(term));

  const add = (tag: DraftTag) => {
    onChange([...selected, tag]);
    setQuery('');
  };

  return (
    <div className={`product-tag-group ${aiTouched ? 'ai-touched' : ''}`}>
      <div className="product-tag-group-head">
        {group.name}
        <span className="tags-inline-meta">
          {group.stale ? 'ya no aplica a esta categoría' : OPEN_TAG_GROUPS.includes(group.name) ? 'lista abierta' : 'lista cerrada'}
        </span>
      </div>

      <div className="tag-chips">
        {selected.map((t) => (
          <span key={t.id ?? `new:${t.name}`} className={`tag-chip ${!t.id ? 'new' : pendingIds.has(t.id) ? 'pending' : ''}`}>
            {t.name}
            {!t.id && <span className="tag-chip-group">(nuevo)</span>}
            <button
              type="button"
              className="tag-chip-remove"
              disabled={disabled}
              onClick={() => onChange(selected.filter((x) => x !== t))}
              title="Quitar"
              aria-label={`Quitar ${t.name}`}
            >
              ✕
            </button>
          </span>
        ))}
        {inline &&
          unselected.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tag-chip option ${t.isInspected ? '' : 'pending'}`}
              disabled={disabled}
              onClick={() => add({ id: t.id, name: t.name })}
              title="Agregar"
            >
              + {t.name}
            </button>
          ))}
        {selected.length === 0 && (group.stale || (inline && unselected.length === 0)) && (
          <span className="text-muted">Sin tags</span>
        )}
      </div>

      {(!inline || canCreate) && !group.stale && (
        <div className="tag-search inline" style={{ maxWidth: 'none', marginTop: 8 }}>
          <input
            type="text"
            value={query}
            disabled={disabled}
            placeholder={inline ? 'Crear otro…' : `Buscar en ${group.tags.length} tags${canCreate ? ' o crear uno' : ''}…`}
            onChange={(e) => setQuery(e.target.value)}
          />
          {term && (
            <ul className="tag-search-results">
              {!inline && results.map((t) => (
                <li key={t.id}>
                  <button type="button" className="tag-search-option" onClick={() => add({ id: t.id, name: t.name })}>
                    <span>{t.name}</span>
                    {!t.isInspected && <span className="tag-search-option-meta">sin validar</span>}
                  </button>
                </li>
              ))}
              {canCreate && !exactExists && term.length >= 2 && (
                <li>
                  <button type="button" className="tag-search-option" onClick={() => add({ id: null, name: term })}>
                    <span>Crear «{term}»</span>
                    <span className="tag-search-option-meta">se crea al guardar</span>
                  </button>
                </li>
              )}
              {(inline || results.length === 0) && (exactExists || !canCreate || term.length < 2) && (
                <li className="tag-search-empty">{exactExists ? 'Ya existe: elegilo de la lista' : 'No hay tags que coincidan'}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
