export type NutritionBenefitType = 'BENEFICIAL' | 'NOT_BENEFICIAL' | 'NEUTRAL' | 'TOTAL_FATS';

export interface Nutrition_Fact {
    id: string;
    name: string;
    baseUnit: string;
    benefit: NutritionBenefitType;
    inspected: boolean;
    solidMin?: number | null;
    solidMaxScore?: number | null;
    solidNutritionLimit?: number | null;
    liquidMin?: number | null;
    liquidMaxScore?: number | null;
    liquidNutritionLimit?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface NutritionFactFormData {
    name: string;
    baseUnit: string;
    benefit: NutritionBenefitType;
    inspected: boolean;
    solidMin: string;
    solidMaxScore: string;
    solidNutritionLimit: string;
    liquidMin: string;
    liquidMaxScore: string;
    liquidNutritionLimit: string;
}

export const BASE_UNITS = ['g', 'mg', 'mcg', 'ml', 'kcal', 'kJ', 'UI', '%'];

export const BENEFIT_OPTIONS: { value: NutritionBenefitType; label: string }[] = [
    { value: 'BENEFICIAL', label: 'Beneficioso' },
    { value: 'NOT_BENEFICIAL', label: 'No beneficioso' },
    { value: 'NEUTRAL', label: 'Neutral' },
    { value: 'TOTAL_FATS', label: 'Grasas totales' },
];
