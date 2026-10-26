/**
 * Tags API service (Admin) — taxonomía de etiquetas de producto (tag_groups + product_tags).
 */
import { apiService } from './api.service';

/** Cuerpo de las respuestas del backend: { success, data, total? }. */
interface ApiEnvelope<T> {
  data: T;
  total?: number;
}

export interface TagGroup {
  id: string;
  name: string;
  scope: 'global' | 'category';
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  tagGroupId: string;
  tagGroupName?: string;
  name: string;
  isInspected: boolean;
  createdByAi: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicableTagGroup extends TagGroup {
  tags: Tag[];
}

/** Tag del listado admin (incluye en cuántos productos está). */
export interface AdminTag extends Tag {
  productCount: number;
}

export interface TagGroupSummary extends TagGroup {
  categories: { id: string; name: string }[];
  tagCount: number;
  /** Tags creados por la IA sin revisar. */
  pendingCount: number;
  productCount: number;
}

export interface TaggedProductTag {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  isInspected: boolean;
  source: 'ai' | 'admin';
}

export interface TaggedProduct {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  tags: TaggedProductTag[];
}

export interface TaggedProductsQuery {
  limit: number;
  offset: number;
  search?: string;
  categoryId?: string;
  tagIds?: string[];
  untagged?: boolean;
  missingGroupId?: string;
}

/** Propuesta de la IA para un grupo (tagId null = tag que todavía no existe). */
export interface TagSuggestion {
  groupId: string;
  groupName: string;
  tagId: string | null;
  tagName: string;
}

/**
 * Grupos donde la IA inventa valores nuevos (el resto son listas cerradas). Espejo de
 * GENERATIVE_GROUPS del backend (ClassifyTagsPrompt.ts).
 */
export const OPEN_TAG_GROUPS = ['Tipo de producto', 'Variante o sabor'];

export interface AdminTagListQuery {
  limit: number;
  offset: number;
  search?: string;
  tagGroupId?: string;
  isInspected?: boolean;
  sort?: 'name' | 'products';
}

export interface AdminTagListResponse {
  data: AdminTag[];
  total: number;
}

export class TagsService {
  static async getAllGroups(): Promise<TagGroup[]> {
    const res = await apiService.get<ApiEnvelope<TagGroup[]>>('/tags/groups');
    return res.data ?? [];
  }

  /** Grupos + tags aplicables a una categoría (globales + los scoped a esa categoría). */
  static async getApplicableGroups(categoryId: string | null): Promise<ApplicableTagGroup[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    const res = await apiService.get<ApiEnvelope<ApplicableTagGroup[]>>(`/tags/groups/applicable?${params.toString()}`);
    return res.data ?? [];
  }

  static async createGroup(data: { name: string; scope: 'global' | 'category'; categoryIds?: string[] }): Promise<TagGroup> {
    const res = await apiService.post<ApiEnvelope<TagGroup>>('/tags/groups', data);
    return res.data;
  }

  static async updateGroup(id: string, data: { name?: string; categoryIds?: string[] }): Promise<TagGroup> {
    const res = await apiService.put<ApiEnvelope<TagGroup>>(`/tags/groups/${id}`, data);
    return res.data;
  }

  static async deleteGroup(id: string): Promise<void> {
    await apiService.delete(`/tags/groups/${id}`);
  }

  static async listAdminTags(query: AdminTagListQuery): Promise<AdminTagListResponse> {
    const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
    if (query.search) params.append('search', query.search);
    if (query.tagGroupId) params.append('tagGroupId', query.tagGroupId);
    if (query.isInspected !== undefined) params.append('isInspected', String(query.isInspected));
    if (query.sort) params.append('sort', query.sort);
    const res = await apiService.get<ApiEnvelope<AdminTag[]>>(`/tags?${params.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  static async getGroupsSummary(): Promise<TagGroupSummary[]> {
    const res = await apiService.get<ApiEnvelope<TagGroupSummary[]>>('/tags/groups/summary');
    return res.data ?? [];
  }

  /** Marca como revisados; devuelve cuántos cambiaron. */
  static async validateTags(ids: string[]): Promise<number> {
    const res = await apiService.post<ApiEnvelope<{ updated: number }>>('/tags/validate', { ids });
    return res.data?.updated ?? 0;
  }

  /** Pasa los productos de `sourceId` a `targetId` y borra `sourceId`. */
  static async mergeTag(sourceId: string, targetId: string): Promise<{ moved: number }> {
    const res = await apiService.post<ApiEnvelope<{ moved: number }>>(`/tags/${sourceId}/merge`, { targetId });
    return { moved: res.data?.moved ?? 0 };
  }

  static async listTaggedProducts(query: TaggedProductsQuery): Promise<{ data: TaggedProduct[]; total: number }> {
    const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
    if (query.search) params.append('search', query.search);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    if (query.tagIds?.length) params.append('tagIds', query.tagIds.join(','));
    if (query.untagged) params.append('untagged', 'true');
    if (query.missingGroupId) params.append('missingGroupId', query.missingGroupId);
    const res = await apiService.get<ApiEnvelope<TaggedProduct[]>>(`/tags/products?${params.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  /** Lo que propone la IA para el producto. No guarda nada (una llamada a la IA). */
  static async suggestProductTags(productId: string): Promise<TagSuggestion[]> {
    const res = await apiService.post<ApiEnvelope<TagSuggestion[]>>(`/products/${productId}/tags/suggest`, {});
    return res.data ?? [];
  }

  /** Reemplaza todos los tags del producto. */
  static async setProductTags(productId: string, tagIds: string[]): Promise<void> {
    await apiService.put(`/products/${productId}/tags`, { tagIds });
  }

  static async createTag(data: { tagGroupId: string; name: string }): Promise<Tag> {
    const res = await apiService.post<ApiEnvelope<Tag>>('/tags', data);
    return res.data;
  }

  static async updateTag(id: string, data: { name?: string; isInspected?: boolean }): Promise<Tag> {
    const res = await apiService.put<ApiEnvelope<Tag>>(`/tags/${id}`, data);
    return res.data;
  }

  static async deleteTag(id: string): Promise<void> {
    await apiService.delete(`/tags/${id}`);
  }
}
