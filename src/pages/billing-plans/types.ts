export interface BillingPlan {
  code: string;
  name: string;
  description: string | null;
  /** null = sin límite de pacientes activos. */
  maxPatients: number | null;
  priceAmount: number;
  currency: string;
  billingInterval: 'month';
  features: string[];
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
  features: string; // una por línea
  isPublic: boolean;
  isActive: boolean;
  sortOrder: string;
}

export const FREE_PLAN_CODE = 'free';
