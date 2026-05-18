/**
 * Shared types for ProductModal sub-components
 */
import type { ProductAllergen, ProductIngredientVariant } from '../../types';

export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isAssignable: boolean;
}

export interface Allergen {
  id: string;
  name: string;
  inspected: boolean;
}

export interface Company {
  id: string;
  name: string;
  address: string | null;
  countryCode: string | null;
  isInspected: boolean;
}

export interface IngredientVariant {
  id: string;
  name: string;
  ingredientId: string;
  isInspected: boolean;
}

export interface NutritionFactOption {
  id: string;
  name: string;
  baseUnit: string;
  isBeneficial: boolean;
}

export interface ProductFormData {
  name: string;
  brand: string;
  barcode: string;
  categoryId: string;
  registrationName: string;
  registrationCode: string;
  legalName: string;
  servingSizeQuantity: string;
  servingSizeUnit: string;
  allergenData: ProductAllergen[];
  rawIngredients: string;
  fatAlert: boolean;
  saturatedFatAlert: boolean;
  sugarAlert: boolean;
  sodiumAlert: boolean;
  nutritionFactData: Array<{ nutritionFactId: string; value: string; unit: string }>;
  image: string;
  inspected: boolean;
  isUltraProcessed: boolean;
  alcoholGraduation: string;
  ingredientVariants: ProductIngredientVariant[];
  companyData: Array<{ companyId: string; role: string }>;
}

export const SERVING_SIZE_UNITS = ['g', 'ml', 'un', 'kg'];

export const NUTRITION_UNITS = ['g', 'mg', 'mcg', 'ml', 'kcal', 'kJ', 'UI', '%'];
