/**
 * Tipos para Reportes (Admin)
 */

export type ReportType = 'BUG' | 'MISSING_PRODUCT' | 'OUTDATED_PRODUCT' | 'WRONG_ANALYSIS' | 'DELETE_ACCOUNT' | 'SUGGESTION';

export type ReportStatus = 'NEW' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  BUG: 'Error',
  MISSING_PRODUCT: 'Producto faltante',
  OUTDATED_PRODUCT: 'Producto desactualizado',
  WRONG_ANALYSIS: 'Análisis incorrecto',
  DELETE_ACCOUNT: 'Eliminar cuenta',
  SUGGESTION: 'Sugerencia',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  NEW: 'Pendiente',
  PENDING: 'Pendiente',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

export interface AdminReportListItem {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  type: ReportType;
  status: ReportStatus;
  description: string;
  createdAt: string;
  productId?: string | null;
  productName?: string | null;
}

export interface ReportMetadata {
  appVersion: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  timezone: string | null;
  clientSentAt: string | null;
}

export interface MissingProductDetails {
  name?: string;
  brand?: string;
  category?: string;
  barcode?: string;
}

export interface OutdatedProductDetails {
  productId?: string;
  product?: {
    id: string;
    name: string;
    barcode?: string | null;
    brand?: string | null;
  };
}

export type ReportDetailsJson = MissingProductDetails | OutdatedProductDetails | Record<string, unknown> | null;

export interface ReportDetail {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  type: ReportType;
  status: ReportStatus;
  description: string;
  adminResponse?: string | null;
  detailsJson: ReportDetailsJson;
  appVersion: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  timezone: string | null;
  clientSentAt: string | null;
  createdAt: string;
}

export interface AdminReportsFilters {
  type: ReportType | 'ALL';
  status: ReportStatus | 'ALL';
}

export interface AdminReportsListQuery {
  limit: number;
  offset: number;
  type?: ReportType;
  status?: ReportStatus;
}

export interface AdminReportsListResponse {
  items: AdminReportListItem[];
  total: number;
  limit: number;
  offset: number;
}
