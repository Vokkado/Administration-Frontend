/**
 * Familias del puntaje (v4): cada producto se compara con los de su familia, que tiene un máximo ("techo").
 * El número del techo vive en el código del backend; desde el admin se edita la JUSTIFICACIÓN que ve el usuario
 * en la explicación del puntaje: "Arranca en 90 · Es el máximo para \"<familia>\": <justificación>".
 */
import { apiService } from './api.service';

export interface ScoreFamily {
  code: string;
  label: string;
  ceiling: number;
  reason: string;
  updatedAt: string | null;
}

export const REASON_MIN = 5;
export const REASON_MAX = 300;

export const ScoreFamiliesService = {
  async list(): Promise<ScoreFamily[]> {
    const r = await apiService.get<{ success: boolean; data: ScoreFamily[] }>('/products/score-families');
    return r.data;
  },
  /** updatedAt: la versión que se estaba editando. Si otra persona la cambió en el medio, el backend responde 409. */
  async update(code: string, reason: string, updatedAt: string | null): Promise<ScoreFamily> {
    const r = await apiService.put<{ success: boolean; data: ScoreFamily }>(`/products/score-families/${encodeURIComponent(code)}`, { reason, updatedAt });
    return r.data;
  },
};
