import { useCallback } from 'react';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import { StatisticsService, type ProductScanStat, type StatsDateRange } from '../../../services/statistics.service';

export function useProductScanStats(dateRange?: StatsDateRange | null) {
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) => StatisticsService.getProductScanStatsPage(params, dateRange),
    [dateRange],
  );

  return usePaginatedList<ProductScanStat>({ fetchFn, itemsPerPage: 20 });
}
