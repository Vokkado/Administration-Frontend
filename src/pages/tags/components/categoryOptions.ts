/**
 * Categorías para los selectores de la pestaña Tags: cada padre seguido de sus hijas.
 */
import { apiService } from '../../../services/api.service';
import type { Category } from '../../categories/types';

export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

export async function loadCategoryOptions(): Promise<CategoryOption[]> {
  const res = await apiService.get<{ data?: Category[] }>('/categories');
  const all: CategoryOption[] = (res.data ?? []).map((c) => ({ id: c.id, name: c.name, parentId: c.parentCategoryId ?? null }));
  const byName = (a: CategoryOption, b: CategoryOption) => a.name.localeCompare(b.name, 'es');
  const roots = all.filter((c) => !c.parentId || !all.some((p) => p.id === c.parentId)).sort(byName);
  return roots.flatMap((root) => [root, ...all.filter((c) => c.parentId === root.id).sort(byName)]);
}
