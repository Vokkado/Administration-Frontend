/**
 * Puntaje aproximado (≈): cuando al producto le falta información (sin tabla, sin porción, sin tipo…) el puntaje v4
 * se calcula con el promedio de su familia y la app le pide al usuario UNA foto de la tabla nutricional.
 * Las fotos se ven en el asistente de validación del producto (y en la cola, con el filtro "Foto de tabla nueva");
 * al validarlo quedan revisadas. La pestaña "Aproximados" de Puntaje lista los productos que siguen así.
 */
import { apiService } from './api.service';

/** Foto de tabla que mandó un usuario (en el detalle del asistente). */
export interface ScorePhotoLite {
  id: string;
  /** URL firmada: vence en 1 hora (si no carga, hay que recargar el producto). */
  imageUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Producto con puntaje aproximado. */
export interface ApproximateProduct {
  id: string;
  name: string;
  barcode: string | null;
  image: string | null;
  score: number | null;
  validated: boolean;
  /** Por qué es aproximado (lo calcula el modelo). */
  reasons: string[];
  pendingPhotos: number;
}

export const ScorePhotosService = {
  async markReviewed(photoId: string): Promise<void> {
    await apiService.post<{ success: boolean }>(`/products/score-photos/${encodeURIComponent(photoId)}/reviewed`, {});
  },
  async approximate(): Promise<ApproximateProduct[]> {
    const r = await apiService.get<{ success: boolean; data: ApproximateProduct[] }>('/products/score-approximate');
    return r.data ?? [];
  },
};
