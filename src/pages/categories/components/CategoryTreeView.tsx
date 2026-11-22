/**
 * Vista de Árbol de Categorías
 */
import type { Category, CategoryTree } from '../types';
import { AdminOnly } from '../../../components/routing/AdminOnly';

interface CategoryTreeViewProps {
  categoryTree: CategoryTree[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryTreeView({
  categoryTree,
  onEdit,
  onDelete
}: CategoryTreeViewProps) {
  if (categoryTree.length === 0) {
    return (
      <div className="empty-state">
        <p>🌳 No hay categorías disponibles</p>
        <p className="empty-state-hint">Crea tu primera categoría para visualizar el árbol</p>
      </div>
    );
  }

  const renderTreeNode = (node: CategoryTree) => (
    <div key={node.id} className="tree-node">
      <div className="tree-node-content">
        <div className="tree-node-info">
          <span className="tree-node-icon">
            {node.children.length > 0 ? '📁' : '📄'}
          </span>
          <span className="tree-node-label">
            <span className="tree-node-name">{node.name}</span>
            {!node.isAssignable && (
              <span className="badge badge-secondary tree-node-badge">
                Solo agrupa
              </span>
            )}
          </span>
        </div>
        <div className="tree-node-actions">
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(node)}
            title="Editar categoría"
          >
            <img src="../../../../assets/icons/brownPencil.png" alt="Editar" className="icon-img" />
          </button>
          <AdminOnly>
            <button
              className="action-btn delete-btn"
              onClick={() => onDelete(node)}
              title="Eliminar categoría"
            >
              <img src="../../../../assets/icons/trashcan.png" alt="Eliminar" className="icon-img" />
            </button>
          </AdminOnly>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map(child => renderTreeNode(child))}
        </div>
      )}
    </div>
  );

  return (
    <div className="tree-container">
      {categoryTree.map(node => renderTreeNode(node))}
    </div>
  );
}
