/**
 * Crear o editar un grupo de tags: nombre y a qué productos aplica (todos, o ciertas categorías).
 * Una categoría padre incluye a sus hijas. El alcance no se cambia después de crearlo.
 */
import { useMemo, useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import { TagsService } from '../../../services/tags.service';
import type { TagGroupSummary } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';
import { matchesSearch } from '../../../utils/search';
import type { CategoryOption } from './categoryOptions';

interface GroupModalProps {
  show: boolean;
  /** null = crear. */
  group: TagGroupSummary | null;
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function GroupModal(props: GroupModalProps) {
  return props.show ? <GroupForm {...props} /> : null;
}

function GroupForm({ group, categories, onClose, onSaved }: GroupModalProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [scope, setScope] = useState<'global' | 'category'>(group?.scope ?? 'category');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(group?.categories.map((c) => c.id) ?? []));
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleCategories = useMemo(
    () => categories.filter((c) => !filter || matchesSearch(c.name, filter)),
    [categories, filter],
  );

  const trimmed = name.trim();
  const sameCategories =
    !!group && group.categories.length === selected.size && group.categories.every((c) => selected.has(c.id));
  const invalid =
    trimmed.length < 2 || trimmed.length > 80 ||
    (scope === 'category' && selected.size === 0) ||
    (!!group && trimmed === group.name && (scope === 'global' || sameCategories));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError('');
    const categoryIds = scope === 'category' ? [...selected] : undefined;
    try {
      if (group) {
        await TagsService.updateGroup(group.id, {
          ...(trimmed !== group.name ? { name: trimmed } : {}),
          ...(scope === 'category' && !sameCategories ? { categoryIds } : {}),
        });
        onSaved(`✅ Grupo "${trimmed}" actualizado`);
      } else {
        await TagsService.createGroup({ name: trimmed, scope, categoryIds });
        onSaved(`✅ Grupo "${trimmed}" creado. Agregale sus tags desde la pestaña Tags.`);
      }
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el grupo'));
      setSaving(false);
    }
  };

  return (
    <Modal show title={group ? 'Editar grupo' : 'Nuevo grupo'} onClose={onClose} error={error} maxWidth="560px" className="page-tags">
      <div className="modal-body">
        <form className="modal-form" id="tag-group-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="group-name">Nombre</label>
            <input id="group-name" type="text" value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
            <p className="form-hint">Es lo que la IA lee como eje (ej. "Carne", "Tipo de chocolate").</p>
          </div>

          <div className="form-group">
            <label>Aplica a</label>
            {group ? (
              <p className="form-hint">{scope === 'global' ? 'Todos los productos.' : 'Las categorías elegidas (y sus hijas).'}</p>
            ) : (
              <div className="tags-radio-row">
                <label>
                  <input type="radio" checked={scope === 'category'} onChange={() => setScope('category')} />
                  Algunas categorías
                </label>
                <label>
                  <input type="radio" checked={scope === 'global'} onChange={() => setScope('global')} />
                  Todos los productos
                </label>
              </div>
            )}
          </div>

          {scope === 'category' && (
            <div className="form-group">
              <label htmlFor="group-category-filter">Categorías ({selected.size})</label>
              {selected.size > 0 && (
                <div className="tag-chips">
                  {categories.filter((c) => selected.has(c.id)).map((c) => (
                    <span key={c.id} className="tag-chip">
                      {c.name}
                      <button type="button" className="tag-chip-remove" onClick={() => toggle(c.id)} title="Quitar" aria-label={`Quitar ${c.name}`}>
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="group-category-filter"
                type="text"
                value={filter}
                placeholder="Filtrar categorías…"
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className="tags-category-list">
                {visibleCategories.map((c) => (
                  <label key={c.id} className={c.parentId ? 'child' : 'parent'}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    {c.name}
                  </label>
                ))}
                {visibleCategories.length === 0 && <span className="text-muted">Sin resultados</span>}
              </div>
              <p className="form-hint">Una categoría padre (ej. "Bebidas") incluye a todas sus hijas.</p>
            </div>
          )}

          {!group && (
            <p className="tags-note">
              Los grupos nuevos son de lista cerrada: la IA elige entre sus tags o lo deja vacío. Los productos que ya
              tienen tags no lo reciben solos: buscalos con "Les falta este grupo".
            </p>
          )}
        </form>
      </div>
      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="tag-group-form" variant="primary" loading={saving} disabled={saving || invalid}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
