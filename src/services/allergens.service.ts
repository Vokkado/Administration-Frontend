/**
 * Allergens API service (Admin)
 */

import { apiService } from './api.service';
import type { Allergen } from '../pages/allergens/types';

export interface AdminAllergenListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
}

export interface AdminAllergenListResponse {
  data: Allergen[];
  total: number;
}

export class AllergensService {
  static async listAdminAllergens(query: AdminAllergenListQuery): Promise<AdminAllergenListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));

    const response = await apiService.get<any>(`/allergens?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
