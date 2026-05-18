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
}

export interface CreateAttributeData {
  name: string;
  score?: number | null;
  reason?: string;
  typeId: string;
  isInspected?: boolean;
  restrictionIds?: string[];
}

export interface UpdateAttributeData {
  name?: string;
  score?: number | null;
  reason?: string;
  typeId?: string;
  isInspected?: boolean;
  restrictionIds?: string[];
}

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
