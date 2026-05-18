/**
 * Tipos y constantes para Restricciones
 */

export interface Restriction {
  id: string;
  name: string;
  description?: string;
  type: RestrictionType;
  mode: Mode;
  category?: IngredientCategory;
  inspected?: boolean;
  active: boolean;
  isAbsolute?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RestrictionType = 'INVOLUNTARY' | 'VOLUNTARY' | 'ALLERGY' | 'ILLNESS';
export type Mode = 'AVOID' | 'LIMIT' | 'INCREASE';

export type IngredientCategory =
  | 'NUTS' | 'SEAFOOD' | 'DAIRY' | 'GLUTEN' | 'EGGS' | 'SOY'
  | 'LEGUMES' | 'FISH' | 'SHELLFISH' | 'MEAT' | 'RED_MEAT' | 'POULTRY'
  | 'SUGAR' | 'SODIUM' | 'SATURATED_FAT' | 'FATS' | 'GRAINS' | 'SEEDS'
  | 'CONDIMENTS' | 'VEGETABLES' | 'ADDITIVES' | 'STIMULANTS' | 'ALCOHOL'
  | 'PURINES' | 'CALCIUM' | 'IRON' | 'VITAMINS' | 'IODINE'
  | 'PHENYLALANINE' | 'PREGNANCY' | 'ANIMAL_PRODUCTS';

export interface RestrictionFormData {
  name: string;
  description: string;
  type: RestrictionType;
  mode: Mode;
  category?: IngredientCategory | '';
  isAbsolute: boolean;
}

export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  INVOLUNTARY: 'Involuntaria',
  VOLUNTARY: 'Voluntaria',
  ALLERGY: 'Alergia',
  ILLNESS: 'Enfermedad'
};

export const MODE_LABELS: Record<Mode, string> = {
  AVOID: 'Evitar',
  LIMIT: 'Limitar',
  INCREASE: 'Aumentar',
};

export const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  NUTS: 'Frutos Secos',
  SEAFOOD: 'Mariscos',
  DAIRY: 'Lácteos',
  GLUTEN: 'Gluten',
  EGGS: 'Huevos',
  SOY: 'Soja',
  LEGUMES: 'Legumbres',
  FISH: 'Pescado',
  SHELLFISH: 'Crustáceos',
  MEAT: 'Carne',
  RED_MEAT: 'Carne Roja',
  POULTRY: 'Aves',
  SUGAR: 'Azúcar',
  SODIUM: 'Sodio',
  SATURATED_FAT: 'Grasas Saturadas',
  FATS: 'Grasas',
  GRAINS: 'Granos',
  SEEDS: 'Semillas',
  CONDIMENTS: 'Condimentos',
  VEGETABLES: 'Vegetales',
  ADDITIVES: 'Aditivos',
  STIMULANTS: 'Estimulantes',
  ALCOHOL: 'Alcohol',
  PURINES: 'Purinas',
  CALCIUM: 'Calcio',
  IRON: 'Hierro',
  VITAMINS: 'Vitaminas',
  IODINE: 'Yodo',
  PHENYLALANINE: 'Fenilalanina',
  PREGNANCY: 'Embarazo',
  ANIMAL_PRODUCTS: 'Productos Animales',
};
