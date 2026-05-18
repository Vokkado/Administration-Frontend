/**
 * Componente PageHeader
 * Header reutilizable para todas las páginas CRUD con botón de volver,
 * título, descripción, contador y acciones
 */

import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import './PageHeader.css';

export interface CountBadge {
  value: number;
  label: string;
  labelSingular?: string;
  className?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  count?: number;
  countLabel?: string;
  countLabelSingular?: string;
  extraCounts?: CountBadge[];
  actions?: React.ReactNode;
  backTo?: string;
}

export function PageHeader({
  title,
  description,
  count,
  countLabel = 'registros',
  countLabelSingular,
  extraCounts,
  actions,
  backTo = '/dashboard',
}: PageHeaderProps) {
  const navigate = useNavigate();
  const singular = countLabelSingular || countLabel.replace(/s$/, '');

  return (
    <div className="page-header">
      <div className="page-header-info">
        <Button variant="outline" onClick={() => navigate(backTo)}>
          ← Volver al Dashboard
        </Button>
        <h2>{title}</h2>
        {(description || count !== undefined || extraCounts) && (
          <div className="page-header-row">
            {description && <p>{description}</p>}
            {count !== undefined && (
              <div className="header-count">
                <span className="count-number">{count}</span>
                <span className="count-label">
                  {count === 1 ? singular : countLabel}
                </span>
              </div>
            )}
            {extraCounts?.map((badge, i) => (
              <div key={i} className={`header-count ${badge.className || ''}`}>
                <span className="count-number">{badge.value}</span>
                <span className="count-label">
                  {badge.value === 1
                    ? (badge.labelSingular || badge.label.replace(/s$/, ''))
                    : badge.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
