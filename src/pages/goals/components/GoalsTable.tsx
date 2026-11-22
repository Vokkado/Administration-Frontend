/**
 * Tabla de metas: lo justo para encontrar una (nombre, grupo, uso, estado). El detalle —umbrales,
 * qué datos usa, historial, activar— está en el modal de edición.
 */
import { useMemo } from 'react';
import { ColumnFilter, DataTable, StatusBadge } from '../../../components/ui';
import type { ColumnFilterOption, DataTableColumn } from '../../../components/ui';
import type { AdminGoal } from '../../../services/goals.service';
import editIcon from '../../../../assets/icons/brownPencil.png';
import { GoalIcon } from '../goalIcons';
import { displayCode } from '../goalFormat';

interface GoalsTableProps {
  goals: AdminGoal[];
  loading: boolean;
  groupName: (code: string) => string;
  groupOptions: ColumnFilterOption[];
  filterGroup: string;
  onFilterGroupChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  onEdit: (goal: AdminGoal) => void;
}

const STATUS_OPTIONS: ColumnFilterOption[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'INACTIVE', label: 'Inactivas' },
];

export function GoalsTable({
  goals,
  loading,
  groupName,
  groupOptions,
  filterGroup,
  onFilterGroupChange,
  filterStatus,
  onFilterStatusChange,
  onEdit,
}: GoalsTableProps) {
  const columns = useMemo<DataTableColumn<AdminGoal>[]>(
    () => [
      {
        key: 'name',
        header: 'Meta',
        render: (goal) => (
          <div className="goal-name-cell">
            <span className="goal-name-icon">
              <GoalIcon name={goal.icon} size={18} />
            </span>
            <div className="goal-name-text">
              <span className="td-name">{goal.name}</span>
              <span className="goal-code-inline" title="Código interno (no se puede cambiar)">{displayCode(goal.code)}</span>
              {/* En celular la columna Grupo no entra: el grupo va acá. */}
              <span className="goal-group-inline">{groupName(goal.group)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'group',
        header: 'Grupo',
        align: 'center',
        width: '190px',
        hideOnMobile: true,
        headerAction: (
          <ColumnFilter value={filterGroup} options={groupOptions} onChange={onFilterGroupChange} title="Filtrar por grupo" />
        ),
        render: (goal) => <span className="badge badge-type">{groupName(goal.group)}</span>,
      },
      {
        key: 'users',
        header: 'Usuarios',
        align: 'center',
        width: '110px',
        hideOnMobile: true,
        render: (goal) => <span className="goal-users">{goal.usersCount}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        align: 'center',
        width: '140px',
        headerAction: (
          <ColumnFilter value={filterStatus} options={STATUS_OPTIONS} onChange={onFilterStatusChange} title="Filtrar por estado" />
        ),
        render: (goal) => (
          <StatusBadge variant={goal.isActive ? 'active' : 'inactive'}>{goal.isActive ? 'Activa' : 'Inactiva'}</StatusBadge>
        ),
      },
    ],
    [groupName, groupOptions, filterGroup, onFilterGroupChange, filterStatus, onFilterStatusChange],
  );

  const renderActions = useMemo(
    () => (goal: AdminGoal) => (
      <button className="action-btn edit-btn" onClick={() => onEdit(goal)} title="Editar">
        <img src={editIcon} alt="Editar" className="icon-img" />
      </button>
    ),
    [onEdit],
  );

  return (
    <DataTable<AdminGoal>
      columns={columns}
      data={goals}
      loading={loading}
      loadingMessage="Cargando metas..."
      emptyMessage="No se encontraron metas"
      keyExtractor={(goal) => goal.code}
      renderActions={renderActions}
      className="goal-table-container"
    />
  );
}
