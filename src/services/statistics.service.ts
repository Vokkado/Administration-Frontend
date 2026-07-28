/**
 * Statistics API service (Admin) — gamificación + analytics de productos.
 * Backend: módulo engagement (`/engagement/admin/*`).
 */
import { apiService } from './api.service';
import type { PaginatedFetchParams } from '../hooks/usePaginatedList';

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  email: string | null; // censurado por el backend (ej: "n***@gmail.com")
  totalScans: number;
  productsUploaded: number;
  productsApproved: number;
  cartsCreated: number;
  cartsCompleted: number;
  reportsApproved: number;
  pointsBalance: number;
}

export interface ProductScanStat {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  totalScans: number;
}

export type GenderFilter = 'male' | 'female' | 'prefer-not-to-say';
export type AgeBucketFilter = '<18' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';

/** Rango de fechas para filtrar estadísticas (from/to en Date; se serializan a ISO al pegarle al backend). */
export interface StatsDateRange {
  from: Date;
  to: Date;
}

export interface PlatformStatsFilters {
  gender?: GenderFilter | null;
  ageBucket?: AgeBucketFilter | null;
  dateRange?: StatsDateRange | null;
}

export interface PlatformStats {
  totalScans: number;
  distinctUsers: number;
  addToCartCount: number;
  completedCartCount: number;
}

export interface ProductStatsDetail {
  productId: string;
  totalScans: number;
  distinctUsers: number;
  addToCartCount: number;
  completedCartCount: number;
  byAge: Array<{ age: number | null; scans: number; distinctUsers: number }>;
  byAgeBucket: Array<{ ageBucket: string | null; scans: number; distinctUsers: number }>;
  byGender: Array<{ gender: string | null; scans: number; distinctUsers: number }>;
}

export type BadgeMetric = 'scans' | 'uploads' | 'carts';
export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeDefinitionAdmin {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  metric: BadgeMetric;
  threshold: number;
  tier: BadgeTier;
  isActive: boolean;
  sortOrder: number;
}

export interface BadgeUpdateFields {
  name?: string;
  threshold?: number;
  iconUrl?: string | null;
  isActive?: boolean;
}

const BASE = '/engagement/admin';

/** Agrega from/to (ISO) a un URLSearchParams si hay rango — comparten esta convención los 3 endpoints de stats. */
function appendDateRange(qs: URLSearchParams, dateRange?: StatsDateRange | null): void {
  if (!dateRange) return;
  qs.append('from', dateRange.from.toISOString());
  qs.append('to', dateRange.to.toISOString());
}

export class StatisticsService {
  /** Ranking paginado y buscable de usuarios (por puntos, luego escaneos). */
  static async getLeaderboardPage(params: PaginatedFetchParams): Promise<{ data: LeaderboardEntry[]; total: number }> {
    const qs = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.search) qs.append('search', params.search);
    const res = await apiService.get<any>(`${BASE}/leaderboard?${qs.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  /** Tabla paginada y buscable de productos con su cantidad de escaneos, filtrable por rango de fechas. */
  static async getProductScanStatsPage(
    params: PaginatedFetchParams, dateRange?: StatsDateRange | null,
  ): Promise<{ data: ProductScanStat[]; total: number }> {
    const qs = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.search) qs.append('search', params.search);
    appendDateRange(qs, dateRange);
    const res = await apiService.get<any>(`${BASE}/products/scan-stats?${qs.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  /** Totales de toda la plataforma (escaneos, usuarios, carrito, completados), filtrables por género/edad/fecha. */
  static async getPlatformStats(filters: PlatformStatsFilters = {}): Promise<PlatformStats> {
    const qs = new URLSearchParams();
    if (filters.gender) qs.append('gender', filters.gender);
    if (filters.ageBucket) qs.append('ageBucket', filters.ageBucket);
    appendDateRange(qs, filters.dateRange);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiService.get<any>(`${BASE}/products/platform-stats${suffix}`);
    return res.data ?? { totalScans: 0, distinctUsers: 0, addToCartCount: 0, completedCartCount: 0 };
  }

  /** Detalle de uso de un producto (demografía + conversión a carrito), para el modal. Filtrable por rango de fechas. */
  static async getProductStatsDetail(productId: string, dateRange?: StatsDateRange | null): Promise<ProductStatsDetail> {
    const qs = new URLSearchParams();
    appendDateRange(qs, dateRange);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiService.get<any>(`${BASE}/product/${encodeURIComponent(productId)}/stats${suffix}`);
    return res.data;
  }

  /** Catálogo completo de insignias (activas e inactivas) para administrarlas. */
  static async getBadges(): Promise<BadgeDefinitionAdmin[]> {
    const res = await apiService.get<any>(`${BASE}/badges`);
    return res.data ?? [];
  }

  /** Actualiza una insignia (nombre, umbral, foto, activa). */
  static async updateBadge(id: string, fields: BadgeUpdateFields): Promise<BadgeDefinitionAdmin> {
    const res = await apiService.patch<any>(`${BASE}/badges/${encodeURIComponent(id)}`, fields);
    return res.data;
  }

  /** Sube la foto de una insignia a su propia carpeta en S3 (badgeImages/) y devuelve su URL. */
  static async uploadImage(imageBase64: string, contentType: string): Promise<string> {
    const res = await apiService.post<any>(`${BASE}/badges/image`, { imageBase64, contentType }, { timeout: 60000 });
    return res.data.url;
  }
}
