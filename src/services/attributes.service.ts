/**
 * Attributes API service (Admin)
 */

import { apiService } from './api.service';
import type { Attribute } from '../pages/attributes/types';

export interface AdminAttributeListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
  typeId?: string;
  scoreRange?: string;
}

export interface AdminAttributeListResponse {
  data: Attribute[];
  total: number;
}

export class AttributesService {
  static async listAdminAttributes(query: AdminAttributeListQuery): Promise<AdminAttributeListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.typeId) params.append('typeId', query.typeId);
    if (query.scoreRange) params.append('scoreRange', query.scoreRange);

    const response = await apiService.get<any>(`/attributes?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
