/**
 * Companies API service (Admin)
 */

import { apiService } from './api.service';
import type { Company } from '../pages/companies/types';

export interface AdminCompanyListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
  countryCode?: string;
}

export interface AdminCompanyListResponse {
  data: Company[];
  total: number;
}

export class CompaniesService {
  static async listAdminCompanies(query: AdminCompanyListQuery): Promise<AdminCompanyListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.countryCode) params.append('countryCode', query.countryCode);

    const response = await apiService.get<any>(`/companies?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }
}
