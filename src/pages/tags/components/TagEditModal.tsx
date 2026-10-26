/**
 * Crear un tag (eligiendo el grupo) o renombrar uno existente. Lo que crea una persona queda validado.
 */
import { useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import { TagsService } from '../../../services/tags.service';
import type { AdminTag, TagGroupSummary } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';

interface TagEditModalProps {
  show: boolean;
  /** null = crear. */
  tag: AdminTag | null;
  groups: TagGroupSummary[];
  defaultGroupId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function TagEditModal(props: TagEditModalProps) {
  // Se monta al abrir: el formulario arranca con los valores actuales.
  return props.show ? <TagEditForm {...props} /> : null;
}

function TagEditForm({ tag, groups, defaultGroupId, onClose, onSaved }: TagEditModalProps) {
  const [name, setName] = useState(tag?.name ?? '');
  const [groupId, setGroupId] = useState(tag?.tagGroupId ?? defaultGroupId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const trimmed = name.trim();
  const invalid = trimmed.length < 2 || trimmed.length > 80 || !groupId || (tag !== null && trimmed === tag.name);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError('');
    try {
      if (tag) {
        await TagsService.updateTag(tag.id, { name: trimmed });
        onSaved(`✅ "${tag.name}" ahora se llama "${trimmed}"`);
      } else {
        await TagsService.createTag({ tagGroupId: groupId, name: trimmed });
        onSaved(`✅ Tag "${trimmed}" creado`);
      }
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el tag'));
      setSaving(false);
    }
  };

  return (
    <Modal show title={tag ? 'Renombrar tag' : 'Nuevo tag'} onClose={onClose} error={error} maxWidth="520px" className="page-tags">
      <div className="modal-body">
        <form className="modal-form" id="tag-edit-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="tag-group">Grupo</label>
            {tag ? (
              <span className="badge badge-type" style={{ alignSelf: 'flex-start' }}>{tag.tagGroupName}</span>
            ) : (
              <select id="tag-group" className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Elegí un grupo…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="tag-name">Nombre</label>
            <input
              id="tag-name"
              type="text"
              value={name}
              maxLength={80}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <p className="form-hint">
              {tag
                ? `${tag.productCount === 0 ? 'Ningún producto lo tiene todavía.' : tag.productCount === 1 ? 'Cambia en el producto que lo tiene.' : `Cambia en los ${tag.productCount} productos que lo tienen.`} Si ya existe otro tag igual en el grupo, fusionalos en vez de renombrar.`
                : 'Corto y sin marca ni tamaño (ej. "Dulce de leche", no "Dulce de leche Conaprole 1 kg").'}
            </p>
          </div>
        </form>
      </div>
      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="tag-edit-form" variant="primary" loading={saving} disabled={saving || invalid}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
