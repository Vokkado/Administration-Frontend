/**
 * Tabla de Categorías
 * Usa el componente genérico DataTable.
 */
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { Category } from '../types';

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  getParentName: (parentId: string | null) => string;
  getProductsCount: (categoryId: string) => number;
}

export function CategoryTable({
  categories,
  onEdit,
  onDelete,
  getParentName,
  getProductsCount
}: CategoryTableProps) {
  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (category) => (
        <>
          <strong>{category.name}</strong>
          {!category.isAssignable && (
            <span className="badge badge-secondary" style={{ marginLeft: '8px' }}>
              📦 Solo agrupa
            </span>
          )}
        </>
      ),
    },
    {
      key: 'parent',
      header: 'Categoría Padre',
      hideOnMobile: true,
      render: (category) => getParentName(category.parentCategoryId),
    },
    {
      key: 'products',
      header: 'Productos',
      render: (category) => (
        <span className="badge">{getProductsCount(category.id)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha de Creación',
      hideOnMobile: true,
      render: (category) =>
        new Date(category.createdAt).toLocaleDateString('es-UY'),
    },
  ];

  return (
    <DataTable<Category>
      columns={columns}
      data={categories}
      emptyMessage="No hay categorías disponibles"
      keyExtractor={(category) => category.id}
      renderActions={(category) => (
        <>
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(category)}
            title="Editar categoría"
          >
            <img src="../../../../assets/icons/brownPencil.png" alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(category)}
            title="Eliminar categoría"
          >
            <img src="../../../../assets/icons/trashcan.png" alt="Eliminar" className="icon-img" />
          </button>
        </>
      )}
    />
  );
}
