import { useCallback } from 'react';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import { StatisticsService, type ProductScanStat } from '../../../services/statistics.service';

export function useProductScanStats() {
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) => StatisticsService.getProductScanStatsPage(params),
    [],
  );

  return usePaginatedList<ProductScanStat>({ fetchFn, itemsPerPage: 20 });
}
