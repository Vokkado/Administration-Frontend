/**
 * Categories API service (Admin)
 */

import { apiService } from './api.service';
import type { Category } from '../pages/categories/types';

export interface AdminCategoryListQuery {
  limit: number;
  offset: number;
  search?: string;
  isAssignable?: boolean;
}

export interface AdminCategoryListResponse {
  data: Category[];
  total: number;
}

export class CategoriesService {
  static async listAdminCategories(query: AdminCategoryListQuery): Promise<AdminCategoryListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.isAssignable !== undefined) params.append('isAssignable', String(query.isAssignable));

    const response = await apiService.get<any>(`/categories?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
