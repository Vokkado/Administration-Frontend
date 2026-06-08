/**
 * Componente de Filtros para Productos
 * Dos filtros de categoría separados: padre y subcategoría
 */
import { useEffect, useMemo, useState } from 'react';
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentCategoryId: string | null;
  isAssignable: boolean;
}

interface ProductFilterProps {
  searchTerm: string;
  filterInspected: string;
  filterParentCategory: string;
  filterCategory: string;
  filterReference: string;
  categories: Category[];
  onSearchChange: (value: string) => void;
  onFilterInspectedChange: (value: string) => void;
  onFilterParentCategoryChange: (value: string) => void;
  onFilterCategoryChange: (value: string) => void;
  onFilterReferenceChange: (value: string) => void;
}

const VALIDATION_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'No Validados', className: 'filter-btn-not-validated' },
];

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'NORMAL', label: 'Normales' },
  { value: 'REFERENCE', label: 'Reference' },
];

export function ProductFilter({
  searchTerm,
  filterParentCategory,
  filterCategory,
  filterInspected,
  filterReference,
  categories,
  onSearchChange,
  onFilterParentCategoryChange,
  onFilterCategoryChange,
  onFilterInspectedChange,
  onFilterReferenceChange,
}: ProductFilterProps) {
  const [showSubcategoryFilter, setShowSubcategoryFilter] = useState(false);

  // Opciones de categoría padre (categorías no asignables, son agrupadores)
  const parentCategoryOptions: FilterOption[] = useMemo(() => {
    const parents = categories
      .filter(cat => !cat.isAssignable && cat.parentCategoryId === null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      { value: 'ALL', label: 'Todas' },
      ...parents.map(cat => ({ value: cat.id, label: cat.name })),
    ];
  }, [categories]);

  // Opciones de subcategoría (categorías asignables)
  // Filtradas por el padre seleccionado
  const subcategoryOptions: FilterOption[] = useMemo(() => {
    let assignable = categories.filter(cat => cat.isAssignable);

    // Si hay un padre seleccionado, mostrar solo sus hijas
    if (filterParentCategory !== 'ALL') {
      assignable = assignable.filter(cat => cat.parentCategoryId === filterParentCategory);
    }

    const sorted = assignable.sort((a, b) => a.name.localeCompare(b.name));

    return [
      { value: 'ALL', label: 'Todas' },
      { value: 'NONE', label: 'Sin categoría' },
      ...sorted.map(cat => ({ value: cat.id, label: cat.name })),
    ];
  }, [categories, filterParentCategory]);

  // Si hay una subcategoría seleccionada, mantener visible el filtro al re-renderizar.
  useEffect(() => {
    if (filterCategory !== 'ALL') {
      setShowSubcategoryFilter(true);
    }
  }, [filterCategory]);

  const hasSubcategoryOptions = subcategoryOptions.length > 2;

  const toggleSubcategoryFilter = () => {
    setShowSubcategoryFilter((prev) => {
      const next = !prev;
      if (!next) {
        onFilterCategoryChange('ALL');
      }
      return next;
    });
  };

  return (
    <>
      {/* Search Box */}
      <div className="product-controls">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Buscar por nombre, marca, código de barras o categoría..."
        />
      </div>

      {/* Filters */}
      <div className="product-filters">

        <FilterButtonGroup
          label="Tipo"
          options={TYPE_OPTIONS}
          value={filterReference}
          onChange={onFilterReferenceChange}
        />

        <FilterButtonGroup
          label="Validación"
          options={VALIDATION_OPTIONS}
          value={filterInspected}
          onChange={onFilterInspectedChange}
        />

        {parentCategoryOptions.length > 1 && (
          <FilterButtonGroup
            label="Categoría"
            options={parentCategoryOptions}
            value={filterParentCategory}
            onChange={onFilterParentCategoryChange}
          />
        )}

        {hasSubcategoryOptions && (
          <div className="subcategory-toggle">
            <button
              type="button"
              className={`subcategory-toggle-btn${showSubcategoryFilter ? ' active' : ''}`}
              onClick={toggleSubcategoryFilter}
            >
              {showSubcategoryFilter ? 'Ocultar subcategorías' : 'Mostrar subcategorías'}
            </button>
          </div>
        )}

        {hasSubcategoryOptions && showSubcategoryFilter && (
          <FilterButtonGroup
            label="Subcategoría"
            options={subcategoryOptions}
            value={filterCategory}
            onChange={onFilterCategoryChange}
          />
        )}
      </div>
    </>
  );
}
