import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export function useCursorQuery({ queryKey, queryFn, enabled = true }) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.pagination?.has_more ? lastPage.meta.pagination.next_cursor : undefined,
    enabled,
  })
}

export function useOffsetQuery({ queryKey, queryFn, page, enabled = true }) {
  return useQuery({
    queryKey: [...queryKey, { page }],
    queryFn: () => queryFn(page),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}
