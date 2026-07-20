import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { PAGINATION_CONFIG } from "@/lib/queryConfig";

interface PaginationOptions {
  pageSize?: number;
  queryKey: (string | number)[];
  queryFn: (page: number, pageSize: number) => Promise<any>;
  enabled?: boolean;
}

interface PaginationResult<T> {
  data: T[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  previousPage: () => void;
  nextPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  total: number;
}

/**
 * Hook para paginação server-side
 * 
 * Uso:
 * ```tsx
 * const { data, pageIndex, nextPage, previousPage, ... } = usePagination({
 *   queryKey: ['courses'],
 *   queryFn: async (page, pageSize) => {
 *     const from = page * pageSize;
 *     const to = from + pageSize - 1;
 *     const { data, count } = await supabase
 *       .from('courses')
 *       .select('*', { count: 'exact' })
 *       .range(from, to);
 *     return { data, total: count };
 *   },
 * });
 * ```
 */
export const usePagination = <T extends any>({
  pageSize = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  queryKey,
  queryFn,
  enabled = true,
}: PaginationOptions): PaginationResult<T> => {
  const [pageIndex, setPageIndex] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...queryKey, pageIndex, currentPageSize],
    queryFn: () => queryFn(pageIndex, currentPageSize),
    enabled,
  });

  const total = data?.total || 0;
  const pageCount = Math.ceil(total / currentPageSize);
  const items = Array.isArray(data?.data) ? data.data : [];

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  const previousPage = useCallback(() => {
    setPageIndex((old) => Math.max(old - 1, 0));
  }, []);

  const nextPage = useCallback(() => {
    setPageIndex((old) => (old < pageCount - 1 ? old + 1 : old));
  }, [pageCount]);

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < pageCount) {
      setPageIndex(page);
    }
  }, [pageCount]);

  const handleSetPageSize = useCallback((newPageSize: number) => {
    if (newPageSize > PAGINATION_CONFIG.MAX_PAGE_SIZE) {
      return; // Reject oversized pages
    }
    setCurrentPageSize(newPageSize);
    setPageIndex(0); // Reset to first page
  }, []);

  return {
    data: items,
    pageIndex,
    pageSize: currentPageSize,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    goToPage,
    setPageSize: handleSetPageSize,
    isLoading,
    isError,
    error: error as Error | null,
    total,
  };
};
