/**
 * Ingredient Variants API service (Admin)
 */

import { apiService } from './api.service';
import type { IngredientVariant } from '../pages/ingredients/types';

/** Columnas admitidas por el backend para ordenar. */
export type VariantSortBy = 'name' | 'createdAt';

export interface AdminVariantListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
  /** AI = creadas por IA sin aprobar; HUMAN = cargadas o aprobadas por personas. Sin esto: todas. */
  origin?: 'AI' | 'HUMAN';
  /** Default en el backend: name asc. */
  sortBy?: VariantSortBy;
  sortDir?: 'asc' | 'desc';
}

export interface AdminVariantListResponse {
  data: IngredientVariant[];
  total: number;
}

export class IngredientVariantsService {
  static async listAdminVariants(query: AdminVariantListQuery): Promise<AdminVariantListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.origin) params.append('origin', query.origin);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);

    const response = await apiService.get<any>(`/ingredient-variants?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
