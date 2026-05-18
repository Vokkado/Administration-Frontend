/**
 * Restrictions API service (Admin)
 */

import { apiService } from './api.service';
import type { Restriction } from '../pages/restriction/types';

export interface AdminRestrictionListQuery {
  limit: number;
  offset: number;
  search?: string;
  type?: string;
  active?: boolean;
  isAbsolute?: boolean;
}

export interface AdminRestrictionListResponse {
  data: Restriction[];
  total: number;
}

export class RestrictionsService {
  static async listAdminRestrictions(query: AdminRestrictionListQuery): Promise<AdminRestrictionListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.type !== undefined) params.append('type', query.type);
    if (query.active !== undefined) params.append('active', String(query.active));
    if (query.isAbsolute !== undefined) params.append('isAbsolute', String(query.isAbsolute));

    const response = await apiService.get<any>(`/restrictions?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
