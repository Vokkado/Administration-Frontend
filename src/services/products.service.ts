/**
 * Products API service (Admin)
 */

import { apiService } from './api.service';
import type { Product } from '../pages/products/types';

export interface AdminProductListQuery {
  limit: number;
  offset: number;
  search?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  inspected?: boolean;
  /** true => lista SOLO productos reference (curaduría). Default: solo normales. */
  isReference?: boolean;
}

export interface AdminProductListResponse {
  data: Product[];
  total: number;
}

export class ProductsService {
  static async listAdminProducts(query: AdminProductListQuery): Promise<AdminProductListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.categoryId !== undefined) {
      params.append('categoryId', query.categoryId === null ? 'NONE' : query.categoryId);
    }
    if (query.categoryIds && query.categoryIds.length > 0) {
      params.append('categoryIds', query.categoryIds.join(','));
    }
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.isReference) params.append('isReference', 'true');

    const response = await apiService.get<any>(`/products?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
