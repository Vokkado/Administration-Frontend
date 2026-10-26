/** Filtros de la pestaña Productos (se setean también desde las otras pestañas). */
export interface ProductsFilter {
  /** Tags elegidos, con nombre y grupo para mostrarlos como chips. */
  tags: { id: string; name: string; groupName: string }[];
  categoryId: string;
  untagged: boolean;
  missingGroupId: string;
}

export const EMPTY_PRODUCTS_FILTER: ProductsFilter = { tags: [], categoryId: '', untagged: false, missingGroupId: '' };
