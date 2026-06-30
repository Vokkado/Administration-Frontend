/**
 * Statistics API service (Admin) — gamificación + analytics de productos.
 * Backend: módulo engagement (`/engagement/admin/*`).
 */
import { apiService } from './api.service';

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  totalScans: number;
  productsApproved: number;
  cartsCreated: number;
  pointsBalance: number;
  level: number;
}

export interface ProductStats {
  productId: string;
  totalScans: number;
  distinctUsers: number;
  addToCartCount: number;
  byAgeBucket: Array<{ ageBucket: string | null; count: number }>;
  byGender: Array<{ gender: string | null; count: number }>;
}

const BASE = '/engagement/admin';

export class StatisticsService {
  /** Ranking de contribuidores (por puntos, luego escaneos). */
  static async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const res = await apiService.get<any>(`${BASE}/leaderboard?limit=${limit}`);
    return res.data ?? [];
  }

  /** Estadísticas de uso de un producto (escaneos, demografía, conversión a carrito). */
  static async getProductStats(productId: string): Promise<ProductStats> {
    const res = await apiService.get<any>(`${BASE}/product/${encodeURIComponent(productId)}/stats`);
    return res.data;
  }
}
