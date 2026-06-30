/**
 * Legal API service (Admin) — Términos y Condiciones / Política de Privacidad
 * versionados. Backend: módulo legal (`/legal/*`).
 */
import { apiService } from './api.service';

export type LegalDocType = 'TERMS' | 'PRIVACY';

export interface LegalVersion {
  version: number;
  content: string;
  publishedAt: string;
}

export interface LegalVersionHistoryItem extends LegalVersion {
  id: string;
  publishedByName: string | null;
}

const BASE = '/legal';

export class LegalService {
  static async getCurrent(docType: LegalDocType): Promise<LegalVersion> {
    const res = await apiService.get<any>(`${BASE}/${docType}/current`);
    return res.data;
  }

  static async listVersions(docType: LegalDocType): Promise<LegalVersionHistoryItem[]> {
    const res = await apiService.get<any>(`${BASE}/admin/${docType}/versions`);
    return res.data ?? [];
  }

  /** Publica una nueva versión (incrementa automáticamente). Dispara el cartel de re-aceptación a TODOS los usuarios que estén en una versión anterior. */
  static async publish(docType: LegalDocType, content: string): Promise<LegalVersionHistoryItem> {
    const res = await apiService.post<any>(`${BASE}/admin/${docType}`, { content });
    return res.data;
  }
}
