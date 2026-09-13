import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ScanHeatmapMap.css';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

/** Uruguay como centro por defecto (la inmensa mayoría de los datos hoy son de ahí). */
const DEFAULT_CENTER: [number, number] = [-32.7, -56.0];
const DEFAULT_ZOOM = 7;

const MIN_RADIUS = 6;
const MAX_RADIUS = 26;

/** Escala de color "frío → caliente" según cuántos escaneos hay en el punto (0 a 1). */
function heatColor(t: number): string {
  // azul (pocos) → amarillo → rojo (muchos)
  const stops: Array<[number, [number, number, number]]> = [
    [0, [56, 135, 220]],
    [0.5, [245, 197, 24]],
    [1, [214, 40, 40]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const span = hi[0] - lo[0] || 1;
  const localT = (t - lo[0]) / span;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * localT);
  const [r, g, b] = [mix(lo[1][0], hi[1][0]), mix(lo[1][1], hi[1][1]), mix(lo[1][2], hi[1][2])];
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Mapa de calor de puntos exactos: cada escaneo geolocalizado es un círculo en su coordenada
 * real; cuantos más escaneos caen en la misma coordenada, más grande y más "caliente" (rojo)
 * se ve el punto. Componente autocontenido y sin conocimiento de la API — recibe los puntos
 * ya resueltos, así que es fácil de mover a otra página o reusar con otra fuente de datos.
 */
export function ScanHeatmapMap({
  points, loading, height = 420,
}: { points: HeatmapPoint[]; loading?: boolean; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Solo encuadramos automáticamente la PRIMERA vez que llegan datos — si lo hiciéramos en
  // cada cambio de filtro, el mapa saltaría de posición cada vez que el usuario ajusta algo,
  // perdiendo el zoom/pan que ya había elegido.
  const hasFitRef = useRef(false);

  // Rango real de la data actual, para la leyenda ("bajo" / "alto" con los conteos reales
  // de este filtro — la escala de color es relativa a lo que trajo el filtro, no absoluta).
  const minWeight = points.length ? Math.min(...points.map((p) => p.weight)) : 0;
  const maxWeight = points.length ? Math.max(...points.map((p) => p.weight)) : 0;

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  // Redibujar los puntos cuando cambian.
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (points.length === 0) return;

    for (const p of points) {
      const t = maxWeight > minWeight ? (p.weight - minWeight) / (maxWeight - minWeight) : 0;
      const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(t); // sqrt: área ~ proporcional al peso
      L.circleMarker([p.lat, p.lng], {
        radius,
        color: heatColor(t),
        fillColor: heatColor(t),
        fillOpacity: 0.55,
        weight: 1,
      })
        .bindTooltip(`${p.weight} escaneo${p.weight === 1 ? '' : 's'}`)
        .addTo(layer);
    }

    if (!hasFitRef.current) {
      hasFitRef.current = true;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    }
  }, [points, minWeight, maxWeight]);

  return (
    <div className="scan-heatmap" style={{ height }}>
      <div ref={containerRef} className="scan-heatmap-canvas" />
      {loading && <div className="scan-heatmap-overlay">Cargando mapa…</div>}
      {!loading && points.length === 0 && (
        <div className="scan-heatmap-overlay">Sin escaneos con ubicación en este rango.</div>
      )}
      {!loading && points.length > 0 && (
        <div className="scan-heatmap-legend">
          <span className="scan-heatmap-legend-label">Bajo ({minWeight})</span>
          <span className="scan-heatmap-legend-bar" />
          <span className="scan-heatmap-legend-label">Alto ({maxWeight})</span>
        </div>
      )}
    </div>
  );
}
