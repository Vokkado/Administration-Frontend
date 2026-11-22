/**
 * Ingredient Variants API service (Admin)
 */

import { apiService } from './api.service';
import type { IngredientVariant } from '../pages/ingredients/types';

/** Columnas admitidas por el backend para ordenar. */
export type VariantSortBy = 'name' | 'createdAt' | 'productCount';

export interface AdminVariantListQuery {
  limit: number;
  offset: number;
  search?: string;
  inspected?: boolean;
  /** Con o sin algún atributo automático (Metas, Embarazo…: con criterio o palabras clave). */
  autoAttributes?: 'with' | 'without';
  /** AI = creadas por IA sin aprobar; HUMAN = cargadas o aprobadas por personas. Sin esto: todas. */
  origin?: 'AI' | 'HUMAN';
  /** Default en el backend: name asc. */
  sortBy?: VariantSortBy;
  sortDir?: 'asc' | 'desc';
}

/** Atributo automático sugerido para una variante (por el nombre, por IA o porque lo tiene una hermana). */
export interface AttributeSuggestion {
  attributeId: string;
  attributeName: string;
  source: 'KEYWORD' | 'AI' | 'SIBLING';
  detail: string;
}

export interface AdminVariantListResponse {
  data: IngredientVariant[];
  total: number;
}

export class IngredientVariantsService {
  static async listAdminVariants(query: AdminVariantListQuery): Promise<AdminVariantListResponse> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });

    if (query.search) params.append('search', query.search);
    if (query.inspected !== undefined) params.append('inspected', String(query.inspected));
    if (query.autoAttributes) params.append('autoAttributes', query.autoAttributes);
    if (query.origin) params.append('origin', query.origin);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);

    const response = await apiService.get<any>(`/ingredient-variants?${params.toString()}`);

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }

  /**
   * Atributos automáticos sugeridos para una variante (por SU nombre: palabras clave + IA; lo que
   * tienen las hermanas va como dato, nunca premarcado).
   */
  static async suggestAttributes(params: { ingredientId: string; name?: string; variantId?: string }): Promise<AttributeSuggestion[]> {
    const query = new URLSearchParams({ ingredientId: params.ingredientId });
    if (params.name && params.name.trim()) query.set('name', params.name.trim().slice(0, 200));
    if (params.variantId) query.set('variantId', params.variantId);
    const res = await apiService.get<{ data: AttributeSuggestion[] }>(`/ingredient-variants/suggest-attributes?${query.toString()}`);
    return res.data ?? [];
  }
}
