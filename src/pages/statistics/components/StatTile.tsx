/** Tarjeta de métrica (ícono + valor + label), compartida entre la página de estadísticas y el modal de detalle. */
export function StatTile({
  icon, value, label, rate,
}: { icon: React.ReactNode; value: number; label: string; rate?: string }) {
  return (
    <div className="statistics-detail-stat">
      <div className="statistics-detail-stat-icon">{icon}</div>
      <span className="statistics-detail-stat-value">
        {value}
        {rate && <span className="statistics-detail-stat-rate">{rate}</span>}
      </span>
      <span className="statistics-detail-stat-label">{label}</span>
    </div>
  );
}
