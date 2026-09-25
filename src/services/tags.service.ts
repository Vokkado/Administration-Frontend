/**
 * Tags API service (Admin) — taxonomía de etiquetas de producto (tag_groups + product_tags).
 */
import { apiService } from './api.service';

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

export interface AdminTagListQuery {
  limit: number;
  offset: number;
  search?: string;
  tagGroupId?: string;
  isInspected?: boolean;
}

export interface AdminTagListResponse {
  data: Tag[];
  total: number;
}

export class TagsService {
  static async getAllGroups(): Promise<TagGroup[]> {
    const res = await apiService.get<any>('/tags/groups');
    return res.data ?? [];
  }

  /** Grupos + tags aplicables a una categoría (globales + los scoped a esa categoría). */
  static async getApplicableGroups(categoryId: string | null): Promise<ApplicableTagGroup[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    const res = await apiService.get<any>(`/tags/groups/applicable?${params.toString()}`);
    return res.data ?? [];
  }

  static async createGroup(data: { name: string; scope: 'global' | 'category'; categoryIds?: string[] }): Promise<TagGroup> {
    const res = await apiService.post<any>('/tags/groups', data);
    return res.data;
  }

  static async updateGroup(id: string, data: { name?: string; categoryIds?: string[] }): Promise<TagGroup> {
    const res = await apiService.put<any>(`/tags/groups/${id}`, data);
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
    const res = await apiService.get<any>(`/tags?${params.toString()}`);
    return { data: res.data ?? [], total: res.total ?? 0 };
  }

  static async createTag(data: { tagGroupId: string; name: string }): Promise<Tag> {
    const res = await apiService.post<any>('/tags', data);
    return res.data;
  }

  static async updateTag(id: string, data: { name?: string; isInspected?: boolean }): Promise<Tag> {
    const res = await apiService.put<any>(`/tags/${id}`, data);
    return res.data;
  }

  static async deleteTag(id: string): Promise<void> {
    await apiService.delete(`/tags/${id}`);
  }
}
