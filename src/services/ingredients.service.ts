/**
 * Ingredients API service (Admin)
 */

import { apiService } from './api.service';
import type { Ingredient, UpdateIngredientData } from '../pages/ingredients/types';

export interface AdminIngredientListQuery {
  limit: number;
  offset: number;
  search?: string;
  toxicityLevel?: string;
  inspected?: boolean;
  reason?: 'WITH_REASON' | 'WITHOUT_REASON';
}

export interface AdminIngredientListResponse {
  data: Ingredient[];
  total: number;
}

export class IngredientsService {
  static async listAdminIngredients(query: AdminIngredientListQuery): Promise<AdminIngredientListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.toxicityLevel) params.append('toxicityLevel', query.toxicityLevel);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.reason) params.append('reason', query.reason);

    const response = await apiService.get<any>(`/ingredients?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }

  /** Ficha completa de un ingrediente, con sus restricciones. */
  static async getAdminIngredient(id: string): Promise<Ingredient> {
    const response = await apiService.get<{ success: boolean; data: Ingredient }>(`/ingredients/${id}`);
    return response.data;
  }

  static async updateAdminIngredient(id: string, data: UpdateIngredientData): Promise<void> {
    await apiService.put(`/ingredients/${id}`, data);
  }
}
