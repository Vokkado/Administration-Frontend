/**
 * Tipos y constantes para Alérgenos
 */

export interface Allergen {
  id: string;
  name: string;
  inspected: boolean;
  restrictionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AllergenFormData {
  name: string;
  inspected?: boolean;
  restrictionIds: string[];
}

export interface CreateAllergenData {
  name: string;
  inspected?: boolean;
  restrictionIds?: string[];
}

export interface UpdateAllergenData {
  name?: string;
  inspected?: boolean;
  restrictionIds?: string[];
}

export interface Restriction {
  id: string;
  name: string;
  type: RestrictionType;
  active: boolean;
  isAbsolute?: boolean;
  description?: string;
}

export type RestrictionType = 'ALLERGY' | 'ILLNESS' | 'VOLUNTARY' | 'INVOLUNTARY' | 'GOAL';

export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  ALLERGY: 'Alergia',
  ILLNESS: 'Enfermedad',
  VOLUNTARY: 'Voluntaria',
  INVOLUNTARY: 'Involuntaria',
  GOAL: 'Meta',
};
