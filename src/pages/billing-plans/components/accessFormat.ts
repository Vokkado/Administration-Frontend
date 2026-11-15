import type { EntitlementSource, NutritionistRow } from '../types';

const dateFormat = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Montevideo' });

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** "AAAA-MM-DD" del día en Montevideo (para un <input type="date">). El backend devuelve UTC. */
export function montevideoDay(iso: string | Date): string {
  return isoDay.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Hoy en Montevideo + N días, como "AAAA-MM-DD". */
export function montevideoDayPlusDays(days: number): string {
  const [y, m, d] = montevideoDay(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Hoy en Montevideo + N meses, sin desbordar (31 ene + 1 mes = 28/29 feb). */
export function montevideoDayPlusMonths(months: number): string {
  const [y, m, d] = montevideoDay(new Date()).split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** "31 dic 2026", en hora de Montevideo. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function patientsLabel(max: number | null): string {
  return max === null ? 'sin límite' : `${max} pacientes`;
}

export function sourceLabel(source: EntitlementSource): string {
  return source === 'grant' ? 'acceso de Vokkado' : source === 'subscription' ? 'pago' : 'Free';
}

/** Estado de la suscripción paga; una que todavía no empezó dice desde cuándo. */
export function paidLabel(paid: NonNullable<NutritionistRow['paidSubscription']>): string {
  return paid.startsAt ? `empieza el ${formatDate(paid.startsAt)}` : subscriptionStatusLabel(paid.status);
}

export function subscriptionStatusLabel(status: NonNullable<NutritionistRow['paidSubscription']>['status']): string {
  switch (status) {
    case 'active':
      return 'activa';
    case 'past_due':
      return 'cobro pendiente';
    case 'paused':
      return 'pausada';
    case 'pending':
      return 'pago en curso';
    case 'cancelled':
      return 'cancelada';
    default:
      return 'terminada';
  }
}
