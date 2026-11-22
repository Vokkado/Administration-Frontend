import type { BillingPlan, Coupon, CouponRedemption } from '../types';
import { formatDate } from './accessFormat';

/** "20% durante 6 meses", "20% para siempre", "20% el primer mes", "2 meses gratis". */
export function couponTerms(c: Pick<Coupon, 'kind' | 'percentOff' | 'durationMonths'>): string {
  if (c.kind === 'free_months') return c.durationMonths === 1 ? '1 mes gratis' : `${c.durationMonths} meses gratis`;
  const pct = `${(c.percentOff ?? 0).toLocaleString('es-UY')}%`;
  if (c.durationMonths === null) return `${pct} para siempre`;
  return c.durationMonths === 1 ? `${pct} el primer mes` : `${pct} durante ${c.durationMonths} meses`;
}

/** El precio con el porcentaje de descuento, redondeado a centavos (la misma cuenta que el backend). */
export function discountedPrice(listPrice: number, percentOff: number): number {
  return Math.round(listPrice * (100 - percentOff)) / 100;
}

/** "Pro, Premium" con los nombres del catálogo (o el código si ya no está). */
export function planNames(codes: string[], plans: BillingPlan[]): string {
  return codes.map((code) => plans.find((p) => p.code === code)?.name ?? code).join(', ');
}

/** Usos posibles: con códigos únicos, uno por código; con el compartido, su límite (null = sin límite). */
export function couponCapacity(c: Coupon): number | null {
  return c.codeMode === 'unique' ? (c.codes ?? 0) : c.maxRedemptions;
}

/** Estado para mostrar: inactivo, vencido, agotado o activo. */
export function couponState(c: Coupon): { label: string; variant: 'active' | 'inactive' | 'pending' } {
  if (!c.isActive) return { label: 'Inactivo', variant: 'inactive' };
  if (c.validUntil && new Date(c.validUntil).getTime() <= Date.now()) return { label: `Venció el ${formatDate(c.validUntil)}`, variant: 'inactive' };
  const capacity = couponCapacity(c);
  if (capacity !== null && (c.redemptions ?? 0) >= capacity) return { label: 'Agotado', variant: 'pending' };
  return { label: 'Activo', variant: 'active' };
}

export function redemptionStatusLabel(r: CouponRedemption): string {
  switch (r.status) {
    case 'active':
      return 'Vigente';
    case 'completed':
      return 'Usado entero';
    case 'lost':
      return r.endReason === 'plan_change' ? 'Perdido (cambió de plan)' : r.endReason === 'cancelled' ? 'Perdido (canceló)' : 'Perdido (plan no válido)';
    default:
      return 'Anulado (el pago falló)';
  }
}

/** Descarga los códigos como CSV (código, usos). */
export function downloadCodesCsv(name: string, codes: { code: string; redemptions: number }[]): void {
  const rows = [['codigo', 'usos'], ...codes.map((c) => [c.code, String(c.redemptions)])];
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cupon-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'codigos'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
