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
                  {describeEntry(goal, entry).map((line) => <li key={line}>{line}</li>)}
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

/** Qué se guardó en ese cambio, en palabras (la auditoría guarda lo que se mandó). */
function describeEntry(goal: AdminGoal, entry: GoalHistoryEntry): string[] {
  const p = entry.payload ?? {};
  if (entry.kind === 'ACTIVE') {
    return [p.isActive === false ? 'Desactivó la meta' : 'Activó la meta'];
  }
  if (p._truncado) return ['Guardó cambios (el detalle era demasiado largo para el historial)'];
  const lines: string[] = [];
  if (typeof p.name === 'string') lines.push(`Nombre: «${p.name}»`);
  if (typeof p.description === 'string') lines.push(`Descripción: «${p.description}»`);
  if (typeof p.icon === 'string') lines.push(`Ícono: ${p.icon}`);
  if (typeof p.sortOrder === 'number') lines.push(`Orden: ${p.sortOrder}`);
  if (p.params && typeof p.params === 'object') {
    for (const spec of goal.paramSpecs) {
      const value = (p.params as Record<string, GoalParamValue>)[spec.key];
      if (value !== undefined) lines.push(`${spec.label}: ${formatParamValue(spec, value)}`);
    }
  }
  return lines.length > 0 ? lines : ['Guardó cambios'];
}
