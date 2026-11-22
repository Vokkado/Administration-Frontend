/** Aviso "Chequeo de calorías" (paso Más info): ver kcalCheck.ts. Solo informa. */
import { useMemo } from 'react';
import { checkKcal } from './kcalCheck';
import type { ValidationDetail } from '../../services/validation.service';

export function KcalPanel({ detail }: { detail: ValidationDetail }) {
  const r = useMemo(
    () => checkKcal(detail.nutrition.map((n) => ({ name: n.name, value: n.value, unit: n.unit }))),
    [detail],
  );
  const tone = r.status === 'revisar' ? 'warn' : r.status === 'ok' ? 'ok' : 'info';
  return (
    <div className={`nova-panel nova-${tone}`}>
      <strong>Chequeo de calorías:</strong> <span>{r.detail}</span>
    </div>
  );
}
