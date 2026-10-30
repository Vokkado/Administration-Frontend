/**
 * Versiones de la app por plataforma (Admin). Backend: módulo app-versions (`/app-version/*`).
 * Subir la mínima bloquea la app a todo el que tenga una menor, hasta que actualice.
 */
import { apiService } from './api.service';

export type AppPlatform = 'ANDROID' | 'IOS';

export interface AppVersionConfig {
  platform: AppPlatform;
  minVersion: string;
  latestVersion: string;
  updatedAt: string;
  updatedByName: string | null;
}

const BASE = '/app-version/admin';

const VERSION_REGEX = /^\d{1,4}(\.\d{1,4}){0,2}$/;

/** Misma regla que el backend: "1", "1.2" o "1.2.3". */
export function isValidVersion(version: string): boolean {
  return VERSION_REGEX.test(version);
}

/** Por número, no por texto: "1.10.0" es mayor que "1.9.0". */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export class AppVersionsService {
  static async list(): Promise<AppVersionConfig[]> {
    const res = await apiService.get<{ data?: AppVersionConfig[] }>(BASE);
    return res.data ?? [];
  }

  static async update(platform: AppPlatform, minVersion: string, latestVersion: string): Promise<AppVersionConfig> {
    const res = await apiService.put<{ data: AppVersionConfig }>(`${BASE}/${platform}`, { minVersion, latestVersion });
    return res.data;
  }
}
