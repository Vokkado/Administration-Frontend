import type { EntitlementSource, NutritionistRow } from '../types';

const dateFormat = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Montevideo' });

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
