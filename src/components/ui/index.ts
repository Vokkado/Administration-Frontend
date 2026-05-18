/**
 * Barrel export para componentes UI compartidos
 * Permite importar todos los componentes desde un solo path:
 * import { Button, Input, Modal, ... } from '../../components/ui';
 */

export { Button } from './Button';
export { ConfirmDialog } from './ConfirmDialog';
export { DashboardCard } from './DashboardCard';
export { DataTable } from './DataTable';
export { EmptyState } from './EmptyState';
export { FilterButtonGroup } from './FilterButtonGroup';
export { Input } from './Input';
export { LoadingSpinner } from './LoadingSpinner';
export { Modal } from './Modal';
export { NotificationBanner } from './NotificationBanner';
export { PageHeader } from './PageHeader';
export { Pagination } from './Pagination';
export { SearchInput } from './SearchInput';
export { StatCard } from './StatCard';
export { StatusBadge } from './StatusBadge';

// Re-export types
export type { DataTableColumn } from './DataTable';
export type { FilterOption } from './FilterButtonGroup';
export type { CountBadge } from './PageHeader';
export type { DashboardCardProps } from './DashboardCard';
export type { StatCardProps } from './StatCard';
