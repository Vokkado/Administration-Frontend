/**
 * Tabla de ranking de usuarios (gamificación): puntos, nivel y actividad.
 */
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { LeaderboardEntry } from '../../../services/statistics.service';

interface UserLeaderboardTableProps {
  users: LeaderboardEntry[];
  loading: boolean;
}

const columns: DataTableColumn<LeaderboardEntry>[] = [
  { key: 'name', header: 'Usuario', render: (u) => u.name || 'Sin nombre' },
  { key: 'email', header: 'Email', hideOnMobile: true, render: (u) => u.email || '—' },
  { key: 'points', header: 'Puntos', render: (u) => u.pointsBalance },
  { key: 'scans', header: 'Escaneos', render: (u) => u.totalScans },
  { key: 'uploaded', header: 'Productos cargados', hideOnMobile: true, render: (u) => u.productsUploaded },
  { key: 'approved', header: 'Productos aprobados', hideOnMobile: true, render: (u) => u.productsApproved },
  { key: 'cartsCreated', header: 'Carritos creados', hideOnMobile: true, render: (u) => u.cartsCreated },
  { key: 'cartsCompleted', header: 'Carritos completados', hideOnMobile: true, render: (u) => u.cartsCompleted },
  { key: 'reportsApproved', header: 'Reportes aprobados', hideOnMobile: true, render: (u) => u.reportsApproved },
];

export function UserLeaderboardTable({ users, loading }: UserLeaderboardTableProps) {
  return (
    <DataTable<LeaderboardEntry>
      columns={columns}
      data={users}
      loading={loading}
      loadingMessage="Cargando usuarios..."
      emptyMessage="No se encontraron usuarios"
      keyExtractor={(u) => u.userId}
      className="stats-leaderboard"
    />
  );
}
