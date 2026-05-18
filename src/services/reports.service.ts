/**
 * Reports API service (Admin)
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  AdminReportsListQuery,
  AdminReportsListResponse,
  ReportDetail,
  ReportStatus,
} from '../pages/reports/types';

export class ReportsService {
  static async listAdminReports(query: AdminReportsListQuery): Promise<AdminReportsListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.type) params.append('type', query.type);
    if (query.status) params.append('status', query.status);

    const response = await apiService.get<any>(`${API_ENDPOINTS.adminReports}?${params.toString()}`);
    const data = response.data || response;

    return {
      items: data.items || [],
      total: data.total || 0,
      limit: data.limit ?? query.limit,
      offset: data.offset ?? query.offset,
    };
  }

  static async getAdminReportById(id: string): Promise<ReportDetail> {
    const response = await apiService.get<any>(API_ENDPOINTS.adminReportById(id));
    const data = response.data || response;
    return data as ReportDetail;
  }

  static async updateAdminReportStatus(id: string, status: ReportStatus): Promise<ReportDetail> {
    return ReportsService.updateAdminReport(id, { status });
  }

  static async updateAdminReport(
    id: string,
    payload: { status?: ReportStatus; adminResponse?: string | null }
  ): Promise<ReportDetail> {
    const response = await apiService.patch<any>(API_ENDPOINTS.adminReportById(id), payload);
    const data = response.data || response;
    return data as ReportDetail;
  }
}
