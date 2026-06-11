/**
 * Validation API service (Admin) — cola "Validar productos".
 */
import { apiService } from './api.service';

export type LinkColor = 'green' | 'yellow' | 'red';

export interface ValidationQueueItem {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  barcode: string | null;
  createdAt: string;
  counts: { green: number; yellow: number; red: number };
}

export interface ValidationIngredient {
  variantId: string;
  variantName: string;
  ingredientId: string;
  ingredientName: string;
  position: number | null;
  matchTier: string | null;
  linkInspected: boolean;
  ingredientInspected: boolean;
  score: number | null;
  toxicityLevel: string | null;
  reason: string | null;
  isNutritive: boolean;
  color: LinkColor;
}

export interface ValidationAllergen {
  allergenId: string;
  allergenName: string;
  presence: string | null;
  matchTier: string | null;
  color: LinkColor;
}

export interface ValidationNutrition {
  nutritionFactId: string;
  name: string;
  value: number | null;
  unit: string | null;
  matchTier: string | null;
  color: LinkColor;
}

export interface ValidationDetail {
  product: {
    id: string; name: string; brand: string | null; image: string | null; barcode: string | null;
    rawIngredients: string | null; rawNutritionFacts: any; rawAllergens: string | null;
  };
  ingredients: ValidationIngredient[];
  allergens: ValidationAllergen[];
  nutrition: ValidationNutrition[];
}

const BASE = '/products/validation';

export class ValidationService {
  static async getQueue(limit = 30, offset = 0): Promise<{ items: ValidationQueueItem[]; total: number }> {
    const res = await apiService.get<any>(`${BASE}/queue?limit=${limit}&offset=${offset}`);
    return res.data ?? { items: [], total: 0 };
  }

  static async getDetail(id: string): Promise<ValidationDetail> {
    const res = await apiService.get<any>(`${BASE}/${id}`);
    return res.data;
  }

  static async approve(id: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/approve`);
  }

  static async confirmIngredient(id: string, variantId: string): Promise<void> {
    await apiService.patch(`${BASE}/${id}/ingredient/${variantId}/confirm`);
  }

  static async removeIngredient(id: string, variantId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/ingredient/${variantId}`);
  }

  static async reassignIngredient(id: string, oldVariantId: string, newVariantId: string): Promise<void> {
    await apiService.put(`${BASE}/${id}/ingredient/reassign`, { oldVariantId, newVariantId });
  }

  static async validateIngredient(
    ingredientId: string,
    edits?: { score?: number; toxicityLevel?: string; reason?: string; isNutritive?: boolean },
  ): Promise<void> {
    await apiService.patch(`${BASE}/ingredient/${ingredientId}/validate`, edits ?? {});
  }

  // ── Edición directa ────────────────────────────────────────────────────────
  static async updateBasics(id: string, data: { name?: string; brand?: string | null; image?: string | null }): Promise<void> {
    await apiService.patch(`${BASE}/${id}/product`, data);
  }
  static async addIngredient(id: string, variantId: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/ingredient`, { variantId });
  }
  static async addAllergen(id: string, allergenId: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/allergen`, { allergenId });
  }
  static async removeAllergen(id: string, allergenId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/allergen/${allergenId}`);
  }
  static async upsertNutrition(id: string, nutritionFactId: string, value: number, unit: string | null): Promise<void> {
    await apiService.post(`${BASE}/${id}/nutrition`, { nutritionFactId, value, unit });
  }
  static async removeNutrition(id: string, nutritionFactId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/nutrition/${nutritionFactId}`);
  }

  /** Sube una imagen (file → base64) al bucket y devuelve la URL pública. */
  static async uploadImage(file: File): Promise<string> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await apiService.post<any>('/products/cover-image', { imageBase64: dataUrl, contentType: file.type });
    return res.data.url;
  }
}
