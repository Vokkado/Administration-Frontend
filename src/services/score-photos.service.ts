/**
 * Fotos para el puntaje: cuando al producto le falta información (sin tabla, sin porción, sin tipo…) el puntaje v4
 * queda APROXIMADO y la app le pide al usuario UNA foto de la tabla nutricional. Esas fotos llegan acá para que
 * catálogo cargue los datos en el producto; al recalcular, el puntaje deja de ser aproximado.
 */
import { apiService } from './api.service';

export interface ScorePhoto {
  id: string;
  productId: string;
  productName: string | null;
  barcode: string | null;
  /** URL firmada: vence en 1 hora (si no carga, hay que recargar la lista). */
  imageUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export type ScorePhotoStatus = 'pending' | 'all';

export const ScorePhotosService = {
  async list(status: ScorePhotoStatus, limit: number, offset: number): Promise<{ items: ScorePhoto[]; total: number }> {
    const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    const r = await apiService.get<{ success: boolean; data: { items: ScorePhoto[]; total: number } }>(`/products/score-photos?${params.toString()}`);
    return { items: r.data?.items ?? [], total: r.data?.total ?? 0 };
  },
  async markReviewed(photoId: string): Promise<void> {
    await apiService.post<{ success: boolean }>(`/products/score-photos/${encodeURIComponent(photoId)}/reviewed`, {});
  },
};
