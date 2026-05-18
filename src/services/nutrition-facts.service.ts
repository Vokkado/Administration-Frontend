/**
 * Nutrition Facts API service (Admin)
 */

import { apiService } from './api.service';
import type { Nutrition_Fact } from '../pages/nutrition_facts/types';

export interface AdminNutritionFactListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
}

export interface AdminNutritionFactListResponse {
  data: Nutrition_Fact[];
  total: number;
}

export class NutritionFactsService {
  static async listAdminNutritionFacts(query: AdminNutritionFactListQuery): Promise<AdminNutritionFactListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));

    const response = await apiService.get<any>(`/nutrition-facts?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
