/**
 * Fusionar un tag en otro del mismo grupo (típico: sinónimos que inventó la IA, "Galleta" y
 * "Galletita"). Los productos del origen pasan al destino y el origen se borra.
 */
import { useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import { TagsService } from '../../../services/tags.service';
import type { AdminTag } from '../../../services/tags.service';
import { getApiMessage } from '../../../services/apiError';
import { TagSearch } from './TagSearch';

interface MergeTagModalProps {
  source: AdminTag | null;
  onClose: () => void;
  onMerged: (message: string) => void;
}

export function MergeTagModal(props: MergeTagModalProps) {
  return props.source ? <MergeTagForm {...props} source={props.source} /> : null;
}

function MergeTagForm({ source, onClose, onMerged }: MergeTagModalProps & { source: AdminTag }) {
  const [target, setTarget] = useState<AdminTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!target || saving) return;
    setSaving(true);
    setError('');
    try {
      await TagsService.mergeTag(source.id, target.id);
      onMerged(`✅ "${source.name}" fusionado en "${target.name}"`);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo fusionar'));
      setSaving(false);
    }
  };

  return (
    <Modal show title="Fusionar tag" onClose={onClose} error={error} maxWidth="560px" className="page-tags">
      <div className="modal-body">
        <p className="tags-note">
          <strong>"{source.name}"</strong> ({source.tagGroupName}, {source.productCount}{' '}
          {source.productCount === 1 ? 'producto' : 'productos'}) se borra y sus productos pasan al tag que elijas.
          Solo se puede fusionar dentro del mismo grupo.
        </p>
        <div className="form-group">
          <label>Fusionar en</label>
          {target ? (
            <div className="tag-chips">
              <span className="tag-chip">
                {target.name}
                <span className="tag-chip-group">· {target.productCount} {target.productCount === 1 ? 'producto' : 'productos'}</span>
                <button type="button" className="tag-chip-remove" onClick={() => setTarget(null)} title="Elegir otro" aria-label="Elegir otro">
                  ✕
                </button>
              </span>
            </div>
          ) : (
            <TagSearch
              inline
              tagGroupId={source.tagGroupId}
              excludeIds={[source.id]}
              placeholder={`Buscar en ${source.tagGroupName}…`}
              onPick={setTarget}
            />
          )}
        </div>
        {target && (
          <p className="form-hint">
            {source.productCount === 0
              ? `"${target.name}" queda como está.`
              : `Queda "${target.name}" con hasta ${target.productCount + source.productCount} productos (los que tenían los dos cuentan una vez).`}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="button" variant="danger" loading={saving} disabled={!target || saving} onClick={submit}>
          Fusionar
        </Button>
      </div>
    </Modal>
  );
}
