/**
 * Títulos y orden de los grupos de metas ("Quiero reducir"…). Qué metas van en cada grupo es parte
 * de la lógica y no se cambia.
 */
import { useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import type { GoalGroup } from '../../../services/goals.service';

type GroupRow = { code: GoalGroup; name: string; sortOrder: number };

interface GroupsModalProps {
  show: boolean;
  groups: GroupRow[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (changed: GroupRow[]) => void;
}

export function GroupsModal(props: GroupsModalProps) {
  // Se monta al abrir: el formulario arranca con los valores actuales.
  return props.show ? <GroupsForm {...props} /> : null;
}

function GroupsForm({ groups, saving, error, onClose, onSave }: GroupsModalProps) {
  const [rows, setRows] = useState(() => groups.map((g) => ({ ...g, order: String(g.sortOrder) })));

  const invalid = rows.some((r) => {
    const order = Number(r.order);
    return r.name.trim().length < 2 || r.name.trim().length > 80 || !Number.isInteger(order) || order < 0 || order > 99;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    const changed = rows
      .map((r) => ({ code: r.code, name: r.name.trim(), sortOrder: Number(r.order) }))
      .filter((r) => {
        const before = groups.find((g) => g.code === r.code);
        return !before || before.name !== r.name || before.sortOrder !== r.sortOrder;
      });
    onSave(changed);
  };

  const update = (code: GoalGroup, patch: Partial<{ name: string; order: string }>) =>
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...patch } : r)));

  return (
    <Modal show title="Grupos de metas" onClose={onClose} error={error} maxWidth="640px" className="page-goals">
      <div className="modal-body">
        <form className="modal-form" id="goal-groups-form" onSubmit={submit}>
          <p className="form-hint goal-groups-intro">
            El título lo ve el usuario arriba de las metas de cada grupo. Los de menor orden aparecen primero.
          </p>
          <div className="goal-groups-list">
            <div className="goal-groups-row goal-groups-head" aria-hidden>
              <span>Título</span>
              <span>Orden</span>
            </div>
            {rows.map((r) => (
              <div key={r.code} className="goal-groups-row">
                <input
                  type="text"
                  value={r.name}
                  maxLength={80}
                  aria-label={`Título del grupo ${r.code}`}
                  onChange={(e) => update(r.code, { name: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={r.order}
                  aria-label={`Orden del grupo ${r.code}`}
                  onChange={(e) => update(r.code, { order: e.target.value })}
                />
              </div>
            ))}
          </div>
        </form>
      </div>
      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="goal-groups-form" variant="primary" loading={saving} disabled={saving || invalid}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
