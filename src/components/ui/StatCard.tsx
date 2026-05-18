/**
 * Componente reutilizable para tarjetas de estadísticas
 */
import './StatCard.css';

export interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  description: string;
  isActive?: boolean;
  isPlaceholder?: boolean;
}

export function StatCard({
  icon,
  label,
  value,
  description,
  isActive = false,
  isPlaceholder = false
}: StatCardProps) {
  return (
    <div className={`stat-card ${isPlaceholder ? 'stat-card-placeholder' : ''}`}>
      <div className={`stat-icon ${isActive ? 'active' : ''}`}>
        {icon}
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        <span className="stat-description">{description}</span>
      </div>
    </div>
  );
}
