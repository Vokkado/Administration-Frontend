/**
 * Vista de Árbol de Categorías
 */
import type { Category, CategoryTree } from '../types';

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

  const renderTreeNode = (node: CategoryTree, level: number = 0) => (
    <div key={node.id} className="tree-node" style={{ marginLeft: `${level * 24}px` }}>
      <div className="tree-node-content">
        <div className="tree-node-info">
          <span className="tree-node-icon">
            {node.children.length > 0 ? '📁' : '📄'}
          </span>
          <span className="tree-node-name">{node.name}</span>
          {!node.isAssignable && (
            <span className="badge badge-secondary" style={{ marginLeft: '8px', fontSize: '11px' }}>
              Solo agrupa
            </span>
          )}
        </div>
        <div className="tree-node-actions">
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(node)}
            title="Editar categoría"
          >
            <img src="../../../../assets/icons/brownPencil.png" alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(node)}
            title="Eliminar categoría"
          >
            <img src="../../../../assets/icons/trashcan.png" alt="Eliminar" className="icon-img" />
          </button>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map(child => renderTreeNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="tree-container">
      {categoryTree.map(node => renderTreeNode(node, 0))}
    </div>
  );
}
