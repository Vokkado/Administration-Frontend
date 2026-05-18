/**
 * Componente EmptyState
 * Estado vacío reutilizable para tablas y listados sin datos
 */

import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
}

export function EmptyState({
  icon = '📭',
  title = 'No se encontraron resultados',
  message = 'Intenta ajustar los filtros o crea un nuevo registro',
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
