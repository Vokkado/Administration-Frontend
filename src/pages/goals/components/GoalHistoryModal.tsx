/**
 * Historial de cambios de una meta (de la auditoría del catálogo): quién, cuándo y qué cambió.
 */
import { useEffect, useState } from 'react';
import { Button, LoadingSpinner, Modal } from '../../../components/ui';
import { GoalsService } from '../../../services/goals.service';
import type { AdminGoal, GoalHistoryEntry, GoalParamValue } from '../../../services/goals.service';
import { getApiMessage } from '../../../services/apiError';
import { formatDateTime, formatParamValue } from '../goalFormat';

interface GoalHistoryModalProps {
  goal: AdminGoal | null;
  onClose: () => void;
}

export function GoalHistoryModal(props: GoalHistoryModalProps) {
  // Se monta de nuevo por cada meta (key): arranca vacío y carga su historial.
  return props.goal ? <GoalHistory key={props.goal.code} goal={props.goal} onClose={props.onClose} /> : null;
}

function GoalHistory({ goal, onClose }: { goal: AdminGoal; onClose: () => void }) {
  const [entries, setEntries] = useState<GoalHistoryEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    GoalsService.getHistory(goal.code)
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiMessage(err, 'No se pudo cargar el historial'));
      });
    return () => {
      cancelled = true;
    };
  }, [goal.code]);

  return (
    <Modal show title={`Historial: ${goal.name}`} onClose={onClose} error={error} maxWidth="680px" className="page-goals">
      <div className="modal-body">
        {entries === null && !error ? (
          <LoadingSpinner />
        ) : entries && entries.length === 0 ? (
          <p className="goal-muted">Todavía no hubo cambios desde el admin: tiene los valores iniciales.</p>
        ) : (
          <ol className="goal-history">
            {(entries ?? []).map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="goal-history-item">
                <div className="goal-history-head">
                  <strong>{formatDateTime(entry.at)}</strong>
                  <span className="goal-muted">{entry.actorEmail ?? 'Cuenta borrada'}</span>
                </div>
                <ul className="goal-history-changes">
                  {describeEntry(goal, entry, previousSave(entries ?? [], i)).map((line) => <li key={line}>{line}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="modal-footer">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}

/**
 * El guardado anterior a `entries[index]` (la lista viene del más nuevo al más viejo). Se saltean
 * activar/desactivar y los truncados: no traen los valores completos para comparar.
 */
function previousSave(entries: GoalHistoryEntry[], index: number): GoalHistoryEntry | undefined {
  return entries.slice(index + 1).find((e) => e.kind !== 'ACTIVE' && !e.payload?._truncado);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Qué cambió en ese guardado, en palabras. El formulario manda todos los campos cada vez, así que
 * se compara con el guardado anterior y solo se lista lo distinto (el primero muestra todo).
 */
function describeEntry(goal: AdminGoal, entry: GoalHistoryEntry, previous?: GoalHistoryEntry): string[] {
  const p = entry.payload ?? {};
  if (entry.kind === 'ACTIVE') {
    return [p.isActive === false ? 'Desactivó la meta' : 'Activó la meta'];
  }
  if (p._truncado) return ['Guardó cambios (el detalle era demasiado largo para el historial)'];
  const prev = previous?.payload;
  const changed = (value: unknown, before: unknown) => !prev || !same(value, before);

  const lines: string[] = [];
  if (typeof p.name === 'string' && changed(p.name, prev?.name)) lines.push(`Nombre: «${p.name}»`);
  if (typeof p.description === 'string' && changed(p.description, prev?.description)) lines.push(`Descripción: «${p.description}»`);
  if (typeof p.icon === 'string' && changed(p.icon, prev?.icon)) lines.push(`Ícono: ${p.icon}`);
  if (typeof p.sortOrder === 'number' && changed(p.sortOrder, prev?.sortOrder)) lines.push(`Orden: ${p.sortOrder}`);
  if (p.params && typeof p.params === 'object') {
    const before = (prev?.params ?? {}) as Record<string, GoalParamValue>;
    for (const spec of goal.paramSpecs) {
      const value = (p.params as Record<string, GoalParamValue>)[spec.key];
      if (value !== undefined && changed(value, before[spec.key])) lines.push(`${spec.label}: ${formatParamValue(spec, value)}`);
    }
  }
  // Atributos por rol ("Fuentes de azúcar"): qué se agregó y qué se quitó.
  if (p.attributes && typeof p.attributes === 'object') {
    const names = new Map(goal.roles.flatMap((r) => r.attributes.map((a) => [a.id, a.name] as const)));
    const nameOf = (id: string) => names.get(id) ?? 'un atributo que ya no está vinculado';
    const now = p.attributes as Record<string, string[]>;
    const before = (prev?.attributes ?? {}) as Record<string, string[]>;
    for (const role of goal.roles) {
      const ids = now[role.role];
      if (!Array.isArray(ids)) continue;
      if (!prev) {
        lines.push(`${role.label}: ${ids.length ? ids.map(nameOf).join(', ') : 'ninguno'}`);
        continue;
      }
      const old = before[role.role] ?? [];
      const added = ids.filter((id) => !old.includes(id)).map(nameOf);
      const removed = old.filter((id) => !ids.includes(id)).map(nameOf);
      if (added.length) lines.push(`${role.label}: agregó ${added.join(', ')}`);
      if (removed.length) lines.push(`${role.label}: quitó ${removed.join(', ')}`);
    }
  }
  if (lines.length > 0) return lines;
  return prev ? ['Guardó sin cambios'] : ['Guardó cambios'];
}
