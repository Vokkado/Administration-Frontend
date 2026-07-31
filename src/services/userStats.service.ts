/**
 * Totales de usuarios registrados (Admin) — filtrables por género, edad y fecha de registro.
 * Backend: módulo users (`/users/stats`).
 */
import { apiService } from './api.service';

export type GenderFilter = 'male' | 'female' | 'prefer-not-to-say';
export type AgeBucketFilter = '<18' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';

export interface UserStatsDateRange {
  from: Date;
  to: Date;
}

export interface UserStatsFilters {
  gender?: GenderFilter | null;
  ageBucket?: AgeBucketFilter | null;
  dateRange?: UserStatsDateRange | null;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
}

export class UserStatsService {
  /** Totales de usuarios registrados, filtrables por género/edad/fecha de registro. */
  static async getUserStats(filters: UserStatsFilters = {}): Promise<UserStats> {
    const qs = new URLSearchParams();
    if (filters.gender) qs.append('gender', filters.gender);
    if (filters.ageBucket) qs.append('ageBucket', filters.ageBucket);
    if (filters.dateRange) {
      qs.append('from', filters.dateRange.from.toISOString());
      qs.append('to', filters.dateRange.to.toISOString());
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiService.get<any>(`/users/stats${suffix}`);
    const data = res.data ?? res;
    return { total: data?.total ?? 0, active: data?.active ?? 0, inactive: data?.inactive ?? 0 };
  }
}
