/**
 * Enriquecimiento admin de productos "reference": buscar su nutrición e ingredientes en
 * los súper + OpenFoodFacts y completarlos con IA.
 *
 * El backend enriquece UN producto por request (tarda 5-15s y la Lambda corta a los 30s),
 * así que el lote lo itera la página. Ver EnrichmentPage.
 */
import { apiService } from './api.service';

export type EnrichStatus =
  | 'enriched'
  | 'incomplete'
  | 'no_sources'
  | 'sources_timeout'
  | 'ai_error'
  | 'throttled'
  | 'not_reference';

export interface EnrichOneResult {
  productId: string;
  status: EnrichStatus;
  /** 'cover' | 'nutrition' | 'ingredients'. Vacío si se enriqueció. */
  missing: string[];
  found: {
    cover: boolean;
    nutrition: boolean;
    ingredients: boolean;
    labelCandidates: number;
    stores: string[];
  };
  linked: boolean;
  durationMs: number;
  productName: string | null;
}

export interface EnrichCandidate {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  image: string | null;
  source: string | null;
  lastEnrichAttemptAt: string | null;
  createdAt: string;
}

export interface EnrichCandidateQuery {
  limit: number;
  offset: number;
  search?: string;
  /** Default del backend: true. Pasar false para ver también los intentados hace poco. */
  onlyPending?: boolean;
}

const BASE = '/products';

export class EnrichmentService {
  static async listCandidates(q: EnrichCandidateQuery): Promise<{ data: EnrichCandidate[]; total: number }> {
    const params = new URLSearchParams({ limit: String(q.limit), offset: String(q.offset) });
    if (q.search) params.append('search', q.search);
    if (q.onlyPending === false) params.append('onlyPending', 'false');
    const res = await apiService.get<any>(`${BASE}/enrichment/candidates?${params.toString()}`);
    return { data: res.data || [], total: res.total || 0 };
  }

  /** `force` ignora el límite de 24h entre intentos. */
  static async enrichOne(productId: string, force = false): Promise<EnrichOneResult> {
    const res = await apiService.post<any>(`${BASE}/${productId}/enrich`, { force });
    return res.data;
  }
}
