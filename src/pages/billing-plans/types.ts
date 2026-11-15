export interface BillingPlan {
  code: string;
  name: string;
  description: string | null;
  /** null = sin límite de pacientes activos. */
  maxPatients: number | null;
  priceAmount: number;
  currency: string;
  billingInterval: 'month';
  /** Visible en la web de nutricionistas para contratar. Los internos (beta, promos) se asignan como concesión. */
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Suscripciones vigentes con este plan (pagas vivas + concesiones activas). */
  liveSubscriptions: number;
}

export interface PlanChange {
  id: string;
  planCode: string;
  action: 'create' | 'update';
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  changedByEmail: string | null;
  createdAt: string;
}

/** Estado del formulario: los números como texto para poder dejarlos vacíos mientras se escribe. */
export interface PlanFormData {
  code: string;
  name: string;
  description: string;
  unlimited: boolean;
  maxPatients: string;
  priceAmount: string;
  currency: string;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: string;
}

export const FREE_PLAN_CODE = 'free';

/** De dónde sale el plan que rige: Free, una suscripción paga o un acceso de Vokkado. */
export type EntitlementSource = 'free' | 'subscription' | 'grant';

/** Fila de la pestaña "Nutricionistas" (GET /admin/billing/nutritionists). Fechas en ISO. */
export interface NutritionistRow {
  userId: string;
  name: string | null;
  email: string | null;
  memberRole: 'owner' | 'nutritionist' | 'assistant';
  entitlement: {
    planCode: string;
    planName: string;
    maxPatients: number | null;
    source: EntitlementSource;
    validUntil: string | null;
  };
  /** Cuándo termina lo que rige (null si es indefinido o una suscripción que se renueva). */
  entitlementEndsAt: string | null;
  access: {
    id: string;
    planCode: string;
    planName: string;
    maxPatients: number | null;
    endsAt: string | null;
    note: string | null;
    grantedAt: string;
    grantedByEmail: string | null;
  } | null;
  paidSubscription: {
    id: string;
    planCode: string;
    planName: string;
    status: 'pending' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    /** Todavía no empezó: el día del primer cobro. */
    startsAt: string | null;
  } | null;
  previousAccesses: number;
  activePatients: number;
}

/** Lo que el backend avisa después de dar, extender o revocar un acceso. */
export interface AccessImpact {
  paidSubscription: { id: string; planCode: string; planName: string; status: string } | null;
  deferredSubscription: { id: string; planCode: string; planName: string; firstChargeAt: string } | null;
}

export interface NutritionistFilters {
  search: string;
  source: '' | EntitlementSource;
  planCode: string;
  expiringWithinDays: '' | '7' | '30';
}
