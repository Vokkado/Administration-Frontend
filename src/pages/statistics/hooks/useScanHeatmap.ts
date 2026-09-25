import { useEffect, useState } from 'react';
import {
  StatisticsService, type ScanHeatmapPoint, type GenderFilter, type AgeBucketFilter, type StatsDateRange,
} from '../../../services/statistics.service';

/** Trae los puntos del mapa de calor de escaneos, refetch cuando cambian los filtros de la página. */
export function useScanHeatmap(
  gender: GenderFilter | null, ageBucket: AgeBucketFilter | null, dateRange: StatsDateRange | null,
) {
  const [points, setPoints] = useState<ScanHeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    StatisticsService.getScanHeatmap({ gender, ageBucket, dateRange })
      .then((data) => { if (active) { setPoints(data); setError(null); } })
      .catch(() => { if (active) setError('No se pudo cargar el mapa de escaneos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gender, ageBucket, dateRange]);

  return { points, loading, error };
}
