import { useEffect, useState } from 'react';
import { LoadingSpinner, Modal } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';
import type { BillingPlan, PlanChange } from '../types';

interface PlanHistoryModalProps {
  plan: BillingPlan | null;
  fetchChanges: (code: string) => Promise<PlanChange[]>;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  maxPatients: 'Pacientes activos',
  priceAmount: 'Precio',
  currency: 'Moneda',
  features: 'Características',
  isPublic: 'Contratable',
  isActive: 'Activo',
  sortOrder: 'Orden',
};

function show(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(' · ') : '—';
  return String(value);
}

/** Solo los campos que cambiaron, con el valor anterior y el nuevo. */
function diff(change: PlanChange): { field: string; before: string; after: string }[] {
  return Object.keys(LABELS)
    .filter((key) => change.action === 'create' || JSON.stringify(change.before?.[key]) !== JSON.stringify(change.after[key]))
    .map((key) => ({ field: LABELS[key], before: show(change.before?.[key]), after: show(change.after[key]) }));
}

export function PlanHistoryModal({ plan, fetchChanges, onClose }: PlanHistoryModalProps) {
  const [changes, setChanges] = useState<PlanChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!plan) return;
    setLoading(true);
    setError('');
    fetchChanges(plan.code)
      .then(setChanges)
      .catch((err) => setError(getApiMessage(err, 'No se pudo cargar el historial')))
      .finally(() => setLoading(false));
  }, [plan, fetchChanges]);

  return (
    <Modal show={plan !== null} title={plan ? `Historial: ${plan.name}` : ''} onClose={onClose} error={error}>
      <div className="plan-history">
        {loading && <LoadingSpinner />}
        {!loading && changes.length === 0 && !error && (
          <p className="plan-history-empty">Sin cambios registrados desde el panel. Los planes iniciales vienen de la migración.</p>
        )}
        {!loading &&
          changes.map((change) => (
            <article key={change.id} className="plan-history-item">
              <header>
                <strong>{change.action === 'create' ? 'Creado' : 'Editado'}</strong>
                <span>
                  {new Date(change.createdAt).toLocaleString('es-UY')} · {change.changedByEmail ?? 'desconocido'}
                </span>
              </header>
              <ul>
                {diff(change).map((d) => (
                  <li key={d.field}>
                    <span className="plan-history-field">{d.field}:</span>{' '}
                    {change.action === 'create' ? d.after : `${d.before} → ${d.after}`}
                  </li>
                ))}
              </ul>
            </article>
          ))}
      </div>
    </Modal>
  );
}
