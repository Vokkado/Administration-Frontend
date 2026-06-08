export type AllergenPresence = 'CONTAINS' | 'MAY_CONTAIN';

export interface ProductAllergen {
    allergenId: string;
    name: string;
    presence: AllergenPresence;
}

export interface ProductIngredientVariant {
    ingredientVariantId: string;
    name?: string;
    position?: number;
}

export interface ProductNutritionFact {
    nutritionFactId: string;
    name: string;
    value: number | string;
    unit: string;
}

export interface ProductCompany {
    companyId: string;
    companyName: string;
    role: 'MANUFACTURER' | 'DISTRIBUTOR' | 'IMPORTER' | 'OTHER';
}

export interface ProductRestrictionsSnapshot {
    generatedAt: string;
    ingredientRestrictions: Array<{
        restrictionId: string;
        ingredientId: string;
        ingredientName: string;
        ingredientVariantId: string;
        ingredientVariantName: string;
    }>;
    allergenRestrictions: Array<{
        restrictionId: string;
        allergenId: string;
        allergenName: string;
    }>;
}

export interface Product {
    id: string;
    name: string;
    brand: string;
    barcode: string;
    categoryId: string;
    registrationName?: string;
    registrationCode?: string;
    legalName?: string;
    manufacturerName?: string;
    manufacturerAddress?: string;
    manufacturerCountry?: string;
    distributorName?: string;
    distributorAddress?: string;
    importerName?: string;
    importerAddress?: string;
    servingSizeQuantity?: number;
    servingSizeUnit?: string;
    allergens?: ProductAllergen[];
    fatAlert?: boolean;
    saturatedFatAlert?: boolean;
    sugarAlert?: boolean;
    sodiumAlert?: boolean;
    nutritionFacts?: any;
    image?: string;
    url?: string;
    rawIngredients?: string;
    inspected: boolean;
    aiGenerated?: boolean;
    /** Ficha de referencia liviana (sin nutrición). El admin la completa y promueve a validada. */
    isReference?: boolean;
    source?: string | null;
    isUltraProcessed?: boolean;
    alcoholGraduation?: number | null;
    ingredientVariants?: ProductIngredientVariant[];
    companies?: ProductCompany[];
    productNutritionFacts?: ProductNutritionFact[];
    restrictions?: ProductRestrictionsSnapshot | null;
    score?: number | null;
    scoreCalculatedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const ALLERGEN_PRESENCE_LABELS: Record<AllergenPresence, string> = {
    CONTAINS: 'Contiene',
    MAY_CONTAIN: 'Puede contener',
};
