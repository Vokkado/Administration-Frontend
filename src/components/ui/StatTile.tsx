import './StatTile.css';

/** Tarjeta de métrica (ícono + valor + label), compartida entre las páginas con totales (Estadísticas, Usuarios). */
export function StatTile({
  icon, value, label, rate,
}: { icon: React.ReactNode; value: number; label: string; rate?: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon">{icon}</div>
      <span className="stat-tile-value">
        {value}
        {rate && <span className="stat-tile-rate">{rate}</span>}
      </span>
      <span className="stat-tile-label">{label}</span>
    </div>
  );
}
