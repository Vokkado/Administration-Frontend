import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';
import { endOfDayMontevideo } from '../hooks/useNutritionists';
import { FREE_PLAN_CODE, type AccessImpact, type BillingPlan, type NutritionistRow } from '../types';
import { formatDate, paidLabel, patientsLabel, sourceLabel } from './accessFormat';

type Action = 'grant' | 'extend' | 'revoke';
type Duration = 'until' | 'indefinite';

interface AccessModalProps {
  row: NutritionistRow | null;
  plans: BillingPlan[];
  onClose: () => void;
  onGrant: (userId: string, planCode: string, endsAt: string | null, note: string) => Promise<AccessImpact>;
  onExtend: (accessId: string, endsAt: string | null, note: string) => Promise<AccessImpact>;
  onRevoke: (accessId: string, note: string) => Promise<AccessImpact>;
  /** Terminó bien: el mensaje de éxito y lo que el backend avisa (suscripciones que no se tocaron). */
  onDone: (message: string, impact: AccessImpact) => void;
}

/** Hoy + N meses, como "AAAA-MM-DD" (para el campo de fecha). */
function monthsFromToday(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Más pacientes = mejor; null = sin límite. */
function morePatients(a: number | null, b: number | null): boolean {
  if (a === null) return b !== null;
  if (b === null) return false;
  return a > b;
}

/**
 * Dar un acceso de Vokkado (un plan sin cobrar, con fecha de fin o indefinido), cambiar su fecha de fin o
 * revocarlo. Uno vigente por nutricionista: dar otro reemplaza al actual. El motivo queda en el historial.
 */
export function AccessModal({ row, plans, onClose, onGrant, onExtend, onRevoke, onDone }: AccessModalProps) {
  const [action, setAction] = useState<Action>('grant');
  const [planCode, setPlanCode] = useState('');
  const [duration, setDuration] = useState<Duration>('until');
  const [endDate, setEndDate] = useState(monthsFromToday(1));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const grantable = useMemo(() => plans.filter((p) => p.isActive && p.code !== FREE_PLAN_CODE), [plans]);

  // Cada vez que se abre para otra persona arranca de cero.
  useEffect(() => {
    if (!row) return;
    setAction(row.access ? 'extend' : 'grant');
    setPlanCode(row.access?.planCode ?? grantable[0]?.code ?? '');
    setDuration(row.access && row.access.endsAt === null ? 'indefinite' : 'until');
    setEndDate(row.access?.endsAt ? row.access.endsAt.slice(0, 10) : monthsFromToday(1));
    setNote('');
    setError('');
  }, [row, grantable]);

  if (!row) return null;
  const who = row.name ?? row.email ?? 'este nutricionista';
  const chosen = grantable.find((p) => p.code === planCode) ?? null;
  const paid = row.paidSubscription && ['active', 'past_due'].includes(row.paidSubscription.status) ? row.paidSubscription : null;
  const paidPlan = paid ? plans.find((p) => p.code === paid.planCode) ?? null : null;
  const endsAt = duration === 'indefinite' ? null : endOfDayMontevideo(endDate);
  const dateInvalid = action !== 'revoke' && duration === 'until' && (!endDate || endDate <= today());
  const noteMissing = action !== 'revoke' && !note.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row || saving || dateInvalid || noteMissing) return;
    setSaving(true);
    setError('');
    try {
      if (action === 'grant') {
        const impact = await onGrant(row.userId, planCode, endsAt, note.trim());
        onDone(`Acceso a ${chosen?.name ?? planCode} dado a ${who}${endsAt ? ` hasta el ${formatDate(endsAt)}` : ', sin fecha de fin'}.`, impact);
      } else if (action === 'extend') {
        const impact = await onExtend(row.access!.id, endsAt, note.trim());
        onDone(`El acceso de ${who} ahora ${endsAt ? `termina el ${formatDate(endsAt)}` : 'no tiene fecha de fin'}.`, impact);
      } else {
        const impact = await onRevoke(row.access!.id, note.trim());
        onDone(`Se revocó el acceso de ${who}.`, impact);
      }
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el cambio'));
    } finally {
      setSaving(false);
    }
  }

  const durationFields = (
    <>
      <fieldset className="access-duration">
        <legend>Duración</legend>
        <label className="plan-check-inline">
          <input type="radio" name="duration" checked={duration === 'until'} onChange={() => setDuration('until')} />
          Hasta una fecha (prueba)
        </label>
        {duration === 'until' && (
          <div className="access-date-row">
            <input
              type="date"
              className="input access-date"
              value={endDate}
              min={today()}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Último día del acceso"
            />
            <div className="access-quick">
              {[1, 3, 6, 12].map((m) => (
                <button key={m} type="button" className="access-quick-btn" onClick={() => setEndDate(monthsFromToday(m))}>
                  {m === 1 ? '1 mes' : m === 12 ? '1 año' : `${m} meses`}
                </button>
              ))}
            </div>
          </div>
        )}
        {duration === 'until' && dateInvalid && <p className="access-field-error">Elegí una fecha a partir de mañana.</p>}
        <label className="plan-check-inline">
          <input type="radio" name="duration" checked={duration === 'indefinite'} onChange={() => setDuration('indefinite')} />
          Indefinido (acceso gratis)
        </label>
      </fieldset>
    </>
  );

  return (
    <Modal show={row !== null} title={`Plan de ${who}`} onClose={onClose} error={error}>
      <form className="modal-form plan-modal-form" onSubmit={submit}>
        <div className="plan-modal-body">
          <dl className="access-summary">
            <div>
              <dt>Rige hoy</dt>
              <dd>
                {row.entitlement.planName} · {sourceLabel(row.entitlement.source)}
                {row.entitlementEndsAt && ` · hasta el ${formatDate(row.entitlementEndsAt)}`}
              </dd>
            </div>
            <div>
              <dt>Pacientes activos</dt>
              <dd>
                {row.activePatients} de {patientsLabel(row.entitlement.maxPatients)}
              </dd>
            </div>
            {row.paidSubscription && (
              <div>
                <dt>Suscripción paga</dt>
                <dd>
                  {row.paidSubscription.planName} · {paidLabel(row.paidSubscription)}
                </dd>
              </div>
            )}
            {row.access && (
              <div>
                <dt>Acceso de Vokkado</dt>
                <dd>
                  {row.access.planName} · {row.access.endsAt ? `hasta el ${formatDate(row.access.endsAt)}` : 'indefinido'}
                  {row.access.grantedByEmail && ` · lo dio ${row.access.grantedByEmail}`}
                  {row.access.note && <span className="access-note">“{row.access.note}”</span>}
                </dd>
              </div>
            )}
          </dl>

          {row.access && (
            <div className="access-actions" role="radiogroup" aria-label="Qué querés hacer">
              {(
                [
                  ['extend', 'Cambiar la fecha de fin'],
                  ['grant', 'Dar otro plan'],
                  ['revoke', 'Revocar'],
                ] as [Action, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={action === value}
                  className={`filter-btn ${action === value ? 'active' : ''}`}
                  onClick={() => setAction(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {action === 'grant' && (
            <>
              <div className="input-wrapper input-fullwidth">
                <label className="input-label" htmlFor="access-plan">
                  Plan *
                </label>
                <select id="access-plan" className="input plan-select" value={planCode} onChange={(e) => setPlanCode(e.target.value)} required>
                  {grantable.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} — {patientsLabel(p.maxPatients)}
                      {p.isPublic ? '' : ' (interno)'}
                    </option>
                  ))}
                </select>
              </div>
              {durationFields}
            </>
          )}

          {action === 'extend' && durationFields}

          {action === 'revoke' && (
            <p className="plan-note">
              Desde ahora deja de regir {row.access?.planName}. Si tiene más pacientes activos que el plan que le queda, la cuenta pasa a
              solo lectura (no se borra nada).
            </p>
          )}

          {/* Lo que el admin tiene que saber antes de confirmar. */}
          {action === 'grant' && row.access && <p className="plan-note">Reemplaza su acceso actual a {row.access.planName}.</p>}
          {action === 'grant' && paid?.startsAt && (
            <p className="plan-note plan-note-warning">
              Tiene una suscripción a {paid.planName} que empieza el {formatDate(paid.startsAt)}, con el primer cobro. El acceso no la
              cancela ni mueve esa fecha (Mercado Pago no lo permite): ese día se le cobra igual.
            </p>
          )}
          {action === 'grant' && paid && !paid.startsAt && (
            <p className="plan-note plan-note-warning">
              Paga {paid.planName}
              {paid.status === 'past_due' ? ' (con un cobro pendiente)' : ''}: el acceso no cancela su suscripción, se le sigue cobrando.
              {chosen && paidPlan && !morePatients(chosen.maxPatients, paidPlan.maxPatients)
                ? ` Mientras pague ${paid.planName}, este acceso no le cambia nada: rige si cancela.`
                : ' Si el acceso le da lo mismo o más, pensá si corresponde pedirle que cancele.'}
            </p>
          )}
          {action === 'grant' && row.previousAccesses > 0 && (
            <p className="plan-note">
              Ya tuvo {row.previousAccesses === 1 ? 'un acceso' : `${row.previousAccesses} accesos`} antes.
            </p>
          )}

          <div className="form-group">
            <label htmlFor="access-note">{action === 'revoke' ? 'Motivo (opcional)' : 'Motivo *'}</label>
            <textarea
              id="access-note"
              className="textarea"
              placeholder={action === 'revoke' ? 'Por qué se revoca' : 'Ej: prueba de 3 meses acordada con la clínica'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              required={action !== 'revoke'}
            />
          </div>
        </div>

        <div className="modal-actions plan-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant={action === 'revoke' ? 'danger' : 'primary'} disabled={saving || dateInvalid || noteMissing || (action === 'grant' && !chosen)}>
            {saving ? 'Guardando...' : action === 'grant' ? 'Dar acceso' : action === 'extend' ? 'Guardar fecha' : 'Revocar acceso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
