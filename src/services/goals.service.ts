/**
 * Metas y Embarazo (Admin).
 *
 * - Metas: catálogo cerrado definido en el código del backend (qué metas existen y su lógica).
 *   Desde el admin se ajusta lo editable: nombre visible, descripción, ícono, orden, umbrales (con
 *   el rango que permite el código) y QUÉ ATRIBUTOS cuentan para cada rol ("Fuentes de azúcar" ←
 *   Metas > Azúcares, Subtipo > Miel…), igual que se vinculan atributos a una restricción.
 *   Activar / desactivar es solo de admin. No hay alta ni baja. El `code` (ej. reduce_sugar) es el
 *   id interno: nunca cambia.
 * - Embarazo: una restricción de SISTEMA ("Embarazo", modo Limitar → Precaución) vinculada a
 *   atributos; se suma sola a quien marcó embarazo en el perfil.
 */
import { apiService } from './api.service';
import { getAttributeTypeLabel } from '../pages/attributes/types';

// ── Metas ────────────────────────────────────────────────────────────────────

export type GoalGroup = 'OBJECTIVES' | 'REDUCE' | 'INCREASE' | 'LIFESTYLE';
export type NutrientCode = 'SODIUM' | 'SUGARS' | 'SATURATED_FAT' | 'PROTEIN' | 'FIBER' | 'ENERGY' | 'CARBS';
/** Rol de atributos de una meta (qué cuenta como fuente de algo cuando falta la tabla). */
export type GoalAttributeRole = 'SUGARS' | 'SODIUM' | 'SATURATED_FAT';

export interface PerBasisValue {
  g: number;
  ml: number;
}
export type GoalParamValue = number | PerBasisValue;
export type GoalParamValues = Record<string, GoalParamValue>;

export interface GoalParamSpec {
  key: string;
  label: string;
  unit: string;
  perBasis: boolean;
  default: GoalParamValue;
  min: number;
  max: number;
  mlRange?: { min: number; max: number };
  integer?: boolean;
  help: string;
  source?: string;
  nutrientLimitRef?: NutrientCode;
}

export interface GoalUses {
  nutrients: NutrientCode[];
  seals: ('sugar' | 'sodium' | 'saturatedFat' | 'fat')[];
  roles: GoalAttributeRole[];
  product: 'ULTRA_PROCESSED'[];
}

/** Atributo tal como lo muestra el admin. */
export interface AttributeRef {
  id: string;
  name: string;
  typeName: string;
}

/** Un rol de la meta con los atributos vinculados. */
export interface GoalRole {
  role: GoalAttributeRole;
  label: string;
  help: string;
  attributes: AttributeRef[];
}

export interface AdminGoal {
  code: string;
  group: GoalGroup;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  params: GoalParamValues;
  paramSpecs: GoalParamSpec[];
  coherence: { lessThan: [string, string]; message: string }[];
  uses: GoalUses;
  /** [] si la meta no mira ingredientes. */
  roles: GoalRole[];
  usersCount: number;
  rulesUpdatedAt: string | null;
  updatedAt: string | null;
}

/** Embarazo: la restricción de sistema y sus atributos. */
export interface PregnancyView {
  restrictionId: string;
  name: string;
  description: string | null;
  mode: string;
  attributes: AttributeRef[];
}

export interface AdminGoalsView {
  /** false si las metas están apagadas en el backend (GOALS_ENABLED=false). */
  enabled: boolean;
  groups: { code: GoalGroup; name: string; sortOrder: number }[];
  goals: AdminGoal[];
  /** null si la DB todavía no tiene la restricción de sistema (migración 268 sin correr). */
  pregnancy: PregnancyView | null;
  nutrientLimits: { code: NutrientCode; name: string; unit: string | null; solidLimit: number | null; liquidLimit: number | null }[];
  iconOptions: string[];
}

export interface GoalHistoryEntry {
  at: string;
  actorEmail: string | null;
  kind: 'UPDATE' | 'ACTIVE';
  payload: Record<string, unknown> | null;
}

export interface UpdateGoalInput {
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  params: GoalParamValues;
  /** Atributos por rol (lista completa de cada rol). Sin esto no se tocan. */
  attributes?: Partial<Record<GoalAttributeRole, string[]>>;
}

export const NUTRIENT_LABELS: Record<NutrientCode, string> = {
  SODIUM: 'Sodio',
  SUGARS: 'Azúcares',
  SATURATED_FAT: 'Grasas saturadas',
  PROTEIN: 'Proteínas',
  FIBER: 'Fibra',
  ENERGY: 'Calorías',
  CARBS: 'Carbohidratos',
};

export const SEAL_LABELS: Record<GoalUses['seals'][number], string> = {
  sugar: 'Octógono de azúcares',
  sodium: 'Octógono de sodio',
  saturatedFat: 'Octógono de grasas saturadas',
  fat: 'Octógono de grasas',
};

export const ROLE_LABELS: Record<GoalAttributeRole, string> = {
  SUGARS: 'Fuentes de azúcar',
  SODIUM: 'Fuentes de sodio',
  SATURATED_FAT: 'Fuentes de grasas saturadas',
};

export class GoalsService {
  static async getAdminView(): Promise<AdminGoalsView> {
    const res = await apiService.get<{ data: AdminGoalsView }>('/goal-definitions');
    // Los tipos viejos tienen nombre técnico en la base ("SUBTYPE"): se muestran traducidos.
    const label = (attrs: AttributeRef[]) => attrs.map((a) => ({ ...a, typeName: getAttributeTypeLabel(a.typeName) }));
    const view = res.data;
    return {
      ...view,
      goals: view.goals.map((g) => ({ ...g, roles: g.roles.map((r) => ({ ...r, attributes: label(r.attributes) })) })),
      pregnancy: view.pregnancy ? { ...view.pregnancy, attributes: label(view.pregnancy.attributes) } : null,
    };
  }

  static async updateGoal(code: string, input: UpdateGoalInput): Promise<AdminGoal> {
    const res = await apiService.put<{ data: AdminGoal }>(`/goal-definitions/${code}`, input);
    return res.data;
  }

  /** Solo admin (el backend lo exige). */
  static async setActive(code: string, isActive: boolean): Promise<AdminGoal> {
    const res = await apiService.patch<{ data: AdminGoal }>(`/goal-definitions/${code}/active`, { isActive });
    return res.data;
  }

  static async updateGroup(code: GoalGroup, input: { name: string; sortOrder: number }): Promise<void> {
    await apiService.put(`/goal-definitions/groups/${code}`, input);
  }

  static async getHistory(code: string): Promise<GoalHistoryEntry[]> {
    const res = await apiService.get<{ data: GoalHistoryEntry[] }>(`/goal-definitions/${code}/history`);
    return res.data ?? [];
  }

  /**
   * Vincular / desvincular un atributo del embarazo. Es el mismo vínculo atributo ↔ restricción de
   * Atributos: se manda la lista completa de restricciones del atributo (`current`), con o sin la de
   * embarazo. El backend marca desactualizados los productos con ese atributo.
   */
  static async setPregnancyLink(attributeId: string, current: string[], restrictionId: string, linked: boolean): Promise<void> {
    const next = linked ? [...new Set([...current, restrictionId])] : current.filter((id) => id !== restrictionId);
    await apiService.put(`/attributes/${attributeId}`, { restrictionIds: next });
  }
}
