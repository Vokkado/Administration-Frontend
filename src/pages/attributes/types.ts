/**
 * Tipos y constantes para Atributos (Attributes) y Tipos de Atributo (AttributeTypes)
 */

export interface Attribute {
  id: string;
  name: string;
  score?: number | null;
  reason?: string;
  typeId: string;
  isInspected: boolean;
  restrictionIds?: string[];
  /** Señal nutricional que usan las metas (SUGARS / SODIUM / SATURATED_FAT) o null. */
  signalCode?: SignalCode | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeType {
  id: string;
  type: string;
  isInspected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeFormData {
  name: string;
  score: string;
  reason: string;
  typeId: string;
  isInspected: boolean;
  restrictionIds: string[];
  /** '' = sin señal */
  signalCode: SignalCode | '';
}

export interface CreateAttributeData {
  name: string;
  score?: number | null;
  reason?: string;
  typeId: string;
  isInspected?: boolean;
  restrictionIds?: string[];
  signalCode?: SignalCode | null;
}

export interface UpdateAttributeData {
  name?: string;
  score?: number | null;
  reason?: string;
  typeId?: string;
  isInspected?: boolean;
  restrictionIds?: string[];
  signalCode?: SignalCode | null;
}

/**
 * Señales nutricionales de ingredientes (lista cerrada, espejo de
 * Backend/src/shared/domain/ingredientSignals.ts). Un atributo con señal marca a los ingredientes
 * que lo tienen como fuente de ese nutriente: las metas de la app ("Reducir el sodio", etc.) lo
 * usan cuando el producto no declara ese valor en la tabla nutricional.
 */
export type SignalCode = 'SUGARS' | 'SODIUM' | 'SATURATED_FAT';

export const SIGNAL_LABELS: Record<SignalCode, string> = {
  SUGARS: 'Azúcares',
  SODIUM: 'Sodio',
  SATURATED_FAT: 'Grasas saturadas',
};

export interface AttributeTypeFormData {
  type: string;
  isInspected: boolean;
}

export interface CreateAttributeTypeData {
  type: string;
  isInspected?: boolean;
}

export interface UpdateAttributeTypeData {
  type?: string;
  isInspected?: boolean;
}

export type AttributeTypeKey =
  | 'ORIGIN'
  | 'SUBTYPE'
  | 'COOKING_METHOD'
  | 'TECHNOLOGICAL_FUNCTION'
  | 'CATEGORY'
  | string;

export const ATTRIBUTE_TYPE_LABELS: Record<string, string> = {
  ORIGIN: 'Origen',
  SUBTYPE: 'Subtipo',
  COOKING_METHOD: 'Método de cocción',
  TECHNOLOGICAL_FUNCTION: 'Función tecnológica',
  CATEGORY: 'Categoría',
};

export const getAttributeTypeLabel = (type: AttributeTypeKey): string => {
  return ATTRIBUTE_TYPE_LABELS[type] || type;
};

export interface Restriction {
  id: string;
  name: string;
  description?: string;
  type: RestrictionType;
  mode: string;
  category?: string;
  inspected?: boolean;
  active: boolean;
  isAbsolute?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RestrictionType = 'INVOLUNTARY' | 'VOLUNTARY' | 'ALLERGY' | 'ILLNESS';

export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  'ALLERGY': 'Alergia',
  'ILLNESS': 'Enfermedad',
  'VOLUNTARY': 'Voluntaria',
  'INVOLUNTARY': 'Involuntaria',
};

export const getScoreColor = (score: number): string => {
  if (score >= 8) return '#388E3C';
  if (score >= 5) return '#FBC02D';
  if (score >= 3) return '#F57C00';
  return '#D32F2F';
};
