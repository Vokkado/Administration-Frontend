import { useCallback } from 'react';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import { StatisticsService, type LeaderboardEntry } from '../../../services/statistics.service';

export function useUserLeaderboard() {
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) => StatisticsService.getLeaderboardPage(params),
    [],
  );

  return usePaginatedList<LeaderboardEntry>({ fetchFn, itemsPerPage: 20 });
}
