export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isAssignable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface CategoryFormData {
  name: string;
  parentCategoryId: string;
  isAssignable: boolean;
}
