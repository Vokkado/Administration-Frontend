/**
 * Statistics API service (Admin) — gamificación + analytics de productos.
 * Backend: módulo engagement (`/engagement/admin/*`).
 */
import { apiService } from './api.service';
import type { PaginatedFetchParams } from '../hooks/usePaginatedList';

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  totalScans: number;
  productsApproved: number;
  cartsCreated: number;
  cartsCompleted: number;
  pointsBalance: number;
  level: number;
}

export interface ProductScanStat {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  totalScans: number;
}

export interface ProductStatsDetail {
  productId: string;
  totalScans: number;
  distinctUsers: number;
  addToCartCount: number;
  byAgeBucket: Array<{ ageBucket: string | null; count: number }>;
  byGender: Array<{ gender: string | null; count: number }>;
}

const BASE = '/engagement/admin';

export class StatisticsService {
  /** Ranking paginado y buscable de usuarios (por puntos, luego escaneos). */
  static async getLeaderboardPage(params: PaginatedFetchParams): Promise<{ data: LeaderboardEntry[]; total: number }> {
    const qs = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.search) qs.append('search', params.search);
    const res = await apiService.get<any>(`${BASE}/leaderboard?${qs.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  /** Tabla paginada y buscable de productos con su cantidad de escaneos. */
  static async getProductScanStatsPage(params: PaginatedFetchParams): Promise<{ data: ProductScanStat[]; total: number }> {
    const qs = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.search) qs.append('search', params.search);
    const res = await apiService.get<any>(`${BASE}/products/scan-stats?${qs.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  /** Métrica grande: escaneos totales en toda la plataforma. */
  static async getTotalScans(): Promise<number> {
    const res = await apiService.get<any>(`${BASE}/products/total-scans`);
    return res.data?.totalScans ?? 0;
  }

  /** Detalle de uso de un producto (demografía + conversión a carrito), para el modal. */
  static async getProductStatsDetail(productId: string): Promise<ProductStatsDetail> {
    const res = await apiService.get<any>(`${BASE}/product/${encodeURIComponent(productId)}/stats`);
    return res.data;
  }
}
