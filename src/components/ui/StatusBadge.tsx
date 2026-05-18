/**
 * Componente StatusBadge
 * Badge de estado reutilizable (validado/pendiente, activo/inactivo, etc.)
 */

import './StatusBadge.css';

type BadgeVariant = 'validated' | 'pending' | 'active' | 'inactive' | 'info' | 'danger';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
  title?: string;
}

export function StatusBadge({
  variant,
  children,
  onClick,
  clickable = false,
  title,
}: StatusBadgeProps) {
  const classes = [
    'status-badge',
    `status-badge-${variant}`,
    clickable && 'status-badge-clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} onClick={onClick} title={title}>
      {children}
    </span>
  );
}
