/**
 * Componente PageHeader
 * Header reutilizable para todas las páginas CRUD con breadcrumb,
 * título, descripción, contador y acciones
 */

import { useNavigate } from 'react-router-dom';
import './PageHeader.css';

export interface BreadcrumbItem {
  label: string;
  /** Ruta a la que navega. */
  to?: string;
  /** Alternativa a `to` para niveles que no son una ruta (por ejemplo, volver a una pestaña). */
  onClick?: () => void;
  // Sin `to` ni `onClick` el item es la página actual: se muestra como texto, no como link.
}

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
  /** Destino del primer item del breadcrumb. */
  backTo?: string;
  /** Ruta completa a mostrar. Por defecto: Dashboard / {title}. */
  breadcrumb?: BreadcrumbItem[];
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
  breadcrumb,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const singular = countLabelSingular || countLabel.replace(/s$/, '');
  const trail: BreadcrumbItem[] = breadcrumb ?? [{ label: 'Dashboard', to: backTo }, { label: title }];

  return (
    <div className="page-header">
      <div className="page-header-info">
        <nav className="page-breadcrumb" aria-label="Ruta de navegación">
          {trail.map((item, i) => (
            <span key={`${item.label}-${i}`} className="page-breadcrumb-item">
              {i > 0 && <span className="page-breadcrumb-sep" aria-hidden>/</span>}
              {item.to || item.onClick ? (
                <button
                  type="button"
                  className="page-breadcrumb-link"
                  onClick={() => (item.onClick ? item.onClick() : navigate(item.to!))}
                >
                  {item.label}
                </button>
              ) : (
                <span className="page-breadcrumb-current" aria-current="page">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
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
