/**
 * Componente reutilizable para tarjetas del dashboard.
 * Recibe `color` y `colorEnd` para el gradiente de acento visual.
 */
import type { ReactNode } from 'react';
import './DashboardCard.css';

export interface DashboardCardProps {
  title: string;
  description: string;
  children: ReactNode;
  /** Color inicial del gradiente */
  color?: string;
  /** Color final del gradiente (si no se pasa, usa `color` como sólido) */
  colorEnd?: string;
}

export function DashboardCard({
  title,
  description,
  children,
  color = 'var(--color-primary)',
  colorEnd,
}: DashboardCardProps) {
  return (
    <div
      className="dashboard-card"
      style={{
        '--card-accent': color,
        '--card-accent-end': colorEnd ?? color,
      } as React.CSSProperties}
    >
      <div className="card-icon-bar"></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="dashboard-card-actions">{children}</div>
    </div>
  );
}
