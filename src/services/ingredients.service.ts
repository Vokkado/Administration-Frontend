/**
 * Ingredients API service (Admin)
 */

import { apiService } from './api.service';
import type { Ingredient } from '../pages/ingredients/types';

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
}
