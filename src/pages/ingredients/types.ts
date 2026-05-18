/**
 * Tipos y constantes para Ingredientes y Variantes de Ingrediente
 */

export interface Ingredient {
  id: string;
  name: string;
  toxicityLevel?: string;
  score: number;
  reason?: string;
  isInspected: boolean;
  isNutritive: boolean;
  restrictionIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IngredientVariant {
  id: string;
  ingredientId: string;
  name: string;
  isInspected: boolean;
  attributeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IngredientVariantFormData {
  ingredientId: string;
  name: string;
  isInspected: boolean;
  attributeIds: string[];
}

export interface AttributeForVariant {
  id: string;
  name: string;
  score?: number;
  typeId: string;
  isInspected: boolean;
  restrictionIds?: string[];
}

export interface AttributeTypeForVariant {
  id: string;
  type: string;
}

// Union type for all subtypes
export type IngredientSubtype = 
  | FoodGroup 
  | CulinaryRole 
  | NutrientType 
  | FunctionalType;

export type IngredientType = 
  | 'EMULSIONANTE' 
  | 'AROMATIZANTE' 
  | 'ACIDULANTE' 
  | 'COLORANTE' 
  | 'ESPESANTE' 
  | 'ESTABILIZANTE' 
  | 'RESALTADOR_DE_SABOR' 
  | 'REGULADOR_DE_ACIDEZ' 
  | 'EDULCORANTE' 
  | 'ANTIOXIDANTE' 
  | 'CONSERVADOR' 
  | 'AGENTE_DE_MASA'
  | 'ANTIAGLUTINANTE'
  | 'ANTIESPUMANTE'
  | 'ESTABILIZANTE_DE_COLOR'
  | 'AGENTE_DE_FIRMEZA'
  | 'MEJORADOR_DE_HARINA'
  | 'ESPUMANTE'
  | 'GASIFICANTE'
  | 'GELIFICANTE'
  | 'GLASEANTE'
  | 'HUMECTANTE'
  | 'LEUDANTE_QUIMICO'
  | 'SECUESTRANTE';

// Orígenes del ingrediente (ahora es array)
export type IngredientOrigin = 
  | 'VEGETAL'
  | 'ANIMAL'
  | 'SINTETICO'
  | 'NATURAL'
  | 'SEMISINTETICO'
  | 'MINERAL'
  | 'BIOTECNOLOGICO';

// Nueva categoría semántica de ingredientes
export type IngredientCategory = 
  | 'NATURAL_FOOD'
  | 'CULINARY_INGREDIENT'
  | 'ISOLATED_NUTRIENT'
  | 'ADDITIVE'
  | 'FUNCTIONAL_COMPOUND';

// Funciones tecnológicas (solo para ADDITIVE)
export type TechnologicalFunction =
  | 'PRESERVATIVE'
  | 'COLORANT'
  | 'THICKENER'
  | 'EMULSIFIER'
  | 'SWEETENER'
  | 'ACIDULANT'
  | 'ANTIOXIDANT'
  | 'STABILIZER'
  | 'GELLING_AGENT'
  | 'FLAVOR_ENHANCER'
  | 'FLAVORING'
  | 'ACIDITY_REGULATOR'
  | 'HUMECTANT'
  | 'ANTI_CAKING_AGENT'
  | 'LEAVENING_AGENT'
  | 'GLAZING_AGENT'
  | 'CARBONATING_AGENT'
  | 'SEQUESTRANT'
  | 'BULKING_AGENT'
  | 'COLOR_STABILIZER'
  | 'FIRMING_AGENT'
  | 'FOAMING_AGENT'
  | 'ANTIFOAMING_AGENT';

// Grupo alimentario (solo para NATURAL_FOOD)
export type FoodGroup =
  | 'FRUIT'
  | 'VEGETABLE'
  | 'LEGUME'
  | 'CEREAL'
  | 'NUT_SEED'
  | 'MEAT'
  | 'POULTRY'
  | 'FISH_SEAFOOD'
  | 'DAIRY'
  | 'EGG'
  | 'MUSHROOM'
  | 'HERB_SPICE'
  | 'ALGAE'
  | 'HONEY_BEE_PRODUCTS';

// Rol culinario (solo para CULINARY_INGREDIENT)
export type CulinaryRole =
  | 'CALORIC_SWEETENER'
  | 'NON_CALORIC_SWEETENER'
  | 'FAT_OIL'
  | 'FLOUR_STARCH'
  | 'SEASONING'
  | 'VINEGAR'
  | 'FERMENTED'
  | 'SAUCE_CONDIMENT'
  | 'BEVERAGE_BASE'
  | 'THICKENER_BINDER'
  | 'LEAVENING'
  | 'SALT';

// Tipo de nutriente (solo para ISOLATED_NUTRIENT)
export type NutrientType =
  | 'VITAMIN'
  | 'MINERAL'
  | 'PROTEIN_AMINO_ACID'
  | 'FATTY_ACID'
  | 'FIBER'
  | 'CARBOHYDRATE'
  | 'NUCLEOTIDE';

// Tipo funcional (solo para FUNCTIONAL_COMPOUND)
export type FunctionalType =
  | 'PROBIOTIC'
  | 'PREBIOTIC'
  | 'SYNBIOTIC'
  | 'PHYTOCHEMICAL'
  | 'BIOACTIVE_PEPTIDE'
  | 'FUNCTIONAL_FIBER'
  | 'PLANT_EXTRACT'
  | 'ENZYME';



export type RiskLevel = 'HIGH' | 'MEDIUM_HIGH' | 'MEDIUM'  | 'LOW' | 'NONE';

export interface IngredientFormData {
  name: string;
  toxicityLevel: string;
  score: string;
  reason?: string;
  isInspected: boolean;
  isNutritive: boolean;
  restrictionIds?: string[];
}

export interface CreateIngredientData {
  name: string;
  toxicityLevel?: string;
  score: number;
  reason?: string;
  isInspected?: boolean;
  isNutritive?: boolean;
  restrictionIds?: string[];
}

export interface UpdateIngredientData {
  name?: string;
  toxicityLevel?: string;
  score?: number;
  reason?: string;
  isInspected?: boolean;
  isNutritive?: boolean;
  restrictionIds?: string[];
}

// Tipos para restricciones
export interface Restriction {
  id: string;
  name: string;
  description?: string;
  type: RestrictionType;
  mode: string;
  category?: string;
  isInspected?: boolean;
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
  'INVOLUNTARY': 'Involuntaria'
};

export const INGREDIENT_TYPE_LABELS: Record<IngredientType, string> = {
  'EMULSIONANTE': 'Emulsionante',
  'AROMATIZANTE': 'Aromatizante',
  'ACIDULANTE': 'Acidulante',
  'COLORANTE': 'Colorante',
  'ESPESANTE': 'Espesante',
  'ESTABILIZANTE': 'Estabilizante',
  'RESALTADOR_DE_SABOR': 'Resaltador de Sabor',
  'REGULADOR_DE_ACIDEZ': 'Regulador de Acidez',
  'EDULCORANTE': 'Edulcorante',
  'ANTIOXIDANTE': 'Antioxidante',
  'CONSERVADOR': 'Conservador',
  'AGENTE_DE_MASA': 'Agente de Masa',
  'ANTIAGLUTINANTE': 'Antiaglutinante',
  'ANTIESPUMANTE': 'Antiespumante',
  'ESTABILIZANTE_DE_COLOR': 'Estabilizante de Color',
  'AGENTE_DE_FIRMEZA': 'Agente de Firmeza',
  'MEJORADOR_DE_HARINA': 'Mejorador de Harina',
  'ESPUMANTE': 'Espumante',
  'GASIFICANTE': 'Gasificante',
  'GELIFICANTE': 'Gelificante',
  'GLASEANTE': 'Glaseante',
  'HUMECTANTE': 'Humectante',
  'LEUDANTE_QUIMICO': 'Leudante Químico',
  'SECUESTRANTE': 'Secuestrante',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  'HIGH': 'Alto',
  'MEDIUM_HIGH': 'Medio Alto',
  'MEDIUM': 'Medio',
  'LOW': 'Bajo',
  'NONE': 'Ninguno'
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  'HIGH': '#D32F2F',
  'MEDIUM_HIGH': '#f54500',
  'MEDIUM': '#F57C00',
  'LOW': '#FBC02D',
  'NONE': '#388E3C'
};

export const ORIGIN_LABELS: Record<IngredientOrigin, string> = {
  'VEGETAL': 'Vegetal',
  'ANIMAL': 'Animal',
  'SINTETICO': 'Sintético',
  'NATURAL': 'Natural',
  'SEMISINTETICO': 'Semisintético',
  'MINERAL': 'Mineral',
  'BIOTECNOLOGICO': 'Biotecnológico'
};

// Funciones tecnológicas (solo para aditivos)
export const TECHNOLOGICAL_FUNCTION_LABELS: Record<TechnologicalFunction, string> = {
  'PRESERVATIVE': 'Conservador',
  'COLORANT': 'Colorante',
  'THICKENER': 'Espesante',
  'EMULSIFIER': 'Emulsionante',
  'SWEETENER': 'Edulcorante',
  'ACIDULANT': 'Acidulante',
  'ANTIOXIDANT': 'Antioxidante',
  'STABILIZER': 'Estabilizante',
  'GELLING_AGENT': 'Gelificante',
  'FLAVOR_ENHANCER': 'Resaltador de sabor',
  'FLAVORING': 'Aromatizante',
  'ACIDITY_REGULATOR': 'Regulador de acidez',
  'HUMECTANT': 'Humectante',
  'ANTI_CAKING_AGENT': 'Antiaglutinante',
  'LEAVENING_AGENT': 'Leudante químico',
  'GLAZING_AGENT': 'Glaseante',
  'CARBONATING_AGENT': 'Gasificante',
  'SEQUESTRANT': 'Secuestrante',
  'BULKING_AGENT': 'Agente de masa',
  'COLOR_STABILIZER': 'Estabilizante de color',
  'FIRMING_AGENT': 'Agente de firmeza',
  'FOAMING_AGENT': 'Espumante',
  'ANTIFOAMING_AGENT': 'Antiespumante'
};

// Grupo alimentario (para alimentos naturales)
export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  'FRUIT': 'Fruta',
  'VEGETABLE': 'Verdura',
  'LEGUME': 'Legumbre',
  'CEREAL': 'Cereal',
  'NUT_SEED': 'Fruto seco / Semilla',
  'MEAT': 'Carne',
  'POULTRY': 'Ave',
  'FISH_SEAFOOD': 'Pescado / Marisco',
  'DAIRY': 'Lácteo',
  'EGG': 'Huevo',
  'MUSHROOM': 'Hongo',
  'HERB_SPICE': 'Hierba / Especia',
  'ALGAE': 'Alga',
  'HONEY_BEE_PRODUCTS': 'Miel / Productos apícolas'
};

// Rol culinario (para ingredientes culinarios)
export const CULINARY_ROLE_LABELS: Record<CulinaryRole, string> = {
  'CALORIC_SWEETENER': 'Endulzante calórico',
  'NON_CALORIC_SWEETENER': 'Endulzante no calórico',
  'FAT_OIL': 'Grasa / Aceite',
  'FLOUR_STARCH': 'Harina / Almidón',
  'SEASONING': 'Condimento',
  'VINEGAR': 'Vinagre',
  'FERMENTED': 'Fermentado',
  'SAUCE_CONDIMENT': 'Salsa / Aderezo',
  'BEVERAGE_BASE': 'Base de bebida',
  'THICKENER_BINDER': 'Espesante / Ligante',
  'LEAVENING': 'Leudante',
  'SALT': 'Sal'
};

// Tipo de nutriente (para nutrientes aislados)
export const NUTRIENT_TYPE_LABELS: Record<NutrientType, string> = {
  'VITAMIN': 'Vitamina',
  'MINERAL': 'Mineral',
  'PROTEIN_AMINO_ACID': 'Proteína / Aminoácido',
  'FATTY_ACID': 'Ácido graso',
  'FIBER': 'Fibra',
  'CARBOHYDRATE': 'Carbohidrato',
  'NUCLEOTIDE': 'Nucleótido'
};

// Tipo funcional (para compuestos funcionales)
export const FUNCTIONAL_TYPE_LABELS: Record<FunctionalType, string> = {
  'PROBIOTIC': 'Probiótico',
  'PREBIOTIC': 'Prebiótico',
  'SYNBIOTIC': 'Simbiótico',
  'PHYTOCHEMICAL': 'Fitoquímico',
  'BIOACTIVE_PEPTIDE': 'Péptido bioactivo',
  'FUNCTIONAL_FIBER': 'Fibra funcional',
  'PLANT_EXTRACT': 'Extracto vegetal',
  'ENZYME': 'Enzima'
};

// Labels para la nueva categoría semántica
export const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  'NATURAL_FOOD': 'Ingrediente natural',
  'CULINARY_INGREDIENT': 'Ingrediente culinario',
  'ISOLATED_NUTRIENT': 'Nutriente aislado',
  'ADDITIVE': 'Aditivo',
  'FUNCTIONAL_COMPOUND': 'Compuesto funcional'
};

// Descripciones detalladas para tooltips
export const INGREDIENT_CATEGORY_DESCRIPTIONS: Record<IngredientCategory, string> = {
  'NATURAL_FOOD': 'Alimentos en su estado natural o mínimamente procesados (frutas, verduras, carnes, etc.)',
  'CULINARY_INGREDIENT': 'Ingredientes usados en cocina tradicional (aceites, harinas, azúcar, sal, etc.)',
  'ISOLATED_NUTRIENT': 'Nutrientes extraídos y añadidos (vitaminas, minerales, proteínas aisladas)',
  'ADDITIVE': 'Aditivos alimentarios con código E o función tecnológica específica',
  'FUNCTIONAL_COMPOUND': 'Compuestos con propiedades funcionales específicas (probióticos, fibras funcionales)'
};

// Helper para obtener los labels de subtipo según la categoría
export const getSubtypeLabelsForCategory = (category: IngredientCategory | 'ALL'): Record<string, string> => {
  switch (category) {
    case 'ADDITIVE':
      return TECHNOLOGICAL_FUNCTION_LABELS;
    case 'NATURAL_FOOD':
      return FOOD_GROUP_LABELS;
    case 'CULINARY_INGREDIENT':
      return CULINARY_ROLE_LABELS;
    case 'ISOLATED_NUTRIENT':
      return NUTRIENT_TYPE_LABELS;
    case 'FUNCTIONAL_COMPOUND':
      return FUNCTIONAL_TYPE_LABELS;
    default:
      // Si es 'ALL' o no hay categoría, mostrar todos los tipos generales
      return INGREDIENT_TYPE_LABELS;
  }
};

// Helper para obtener el label del filtro según la categoría
export const getSubtypeFilterLabel = (category: IngredientCategory | 'ALL'): string => {
  switch (category) {
    case 'ADDITIVE':
      return 'Función Tecnológica:';
    case 'NATURAL_FOOD':
      return 'Grupo Alimentario:';
    case 'CULINARY_INGREDIENT':
      return 'Rol Culinario:';
    case 'ISOLATED_NUTRIENT':
      return 'Tipo de Nutriente:';
    case 'FUNCTIONAL_COMPOUND':
      return 'Tipo Funcional:';
    default:
      return 'Tipo:';
  }
};


// Mappers para normalizar valores del backend
export const normalizeIngredientType = (type: string): IngredientType => {
  const typeMap: Record<string, IngredientType> = {
    'emulsionante': 'EMULSIONANTE',
    'aromatizante': 'AROMATIZANTE',
    'acidulante': 'ACIDULANTE',
    'colorante': 'COLORANTE',
    'espesante': 'ESPESANTE',
    'estabilizante': 'ESTABILIZANTE',
    'resaltador_de_sabor': 'RESALTADOR_DE_SABOR',
    'resaltador_sabor': 'RESALTADOR_DE_SABOR',
    'regulador_de_acidez': 'REGULADOR_DE_ACIDEZ',
    'regulador_acidez': 'REGULADOR_DE_ACIDEZ',
    'edulcorante': 'EDULCORANTE',
    'antioxidante': 'ANTIOXIDANTE',
    'conservador': 'CONSERVADOR',
  };
  
  const normalized = typeMap[type.toLowerCase()] || type.toUpperCase() as IngredientType;
  return normalized;
};

export const normalizeRiskLevel = (risk: string): RiskLevel => {
  const riskMap: Record<string, RiskLevel> = {
    'ninguno': 'NONE',
    'none': 'NONE',
    'bajo': 'LOW',
    'low': 'LOW',
    'medio': 'MEDIUM',
    'medium': 'MEDIUM',
    'medio_alto': 'MEDIUM_HIGH',
    'medium_high': 'MEDIUM_HIGH',
    'alto': 'HIGH',
    'high': 'HIGH',
  };
  
  const normalized = riskMap[risk.toLowerCase()] || risk.toUpperCase() as RiskLevel;
  return normalized;
};

export const normalizeIngredientCategory = (category: string | null | undefined): IngredientCategory => {
  if (!category) return 'NATURAL_FOOD'; // Default
  
  const categoryMap: Record<string, IngredientCategory> = {
    'natural_food': 'NATURAL_FOOD',
    'culinary_ingredient': 'CULINARY_INGREDIENT',
    'isolated_nutrient': 'ISOLATED_NUTRIENT',
    'additive': 'ADDITIVE',
    'functional_compound': 'FUNCTIONAL_COMPOUND',
  };
  
  const normalized = categoryMap[category.toLowerCase()] || category.toUpperCase() as IngredientCategory;
  return normalized;
};
