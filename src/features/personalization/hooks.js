import { useMutation, useQuery } from '@tanstack/react-query'
import * as personalizationApi from './api'

export function useRecordProductView() {
  return useMutation({
    mutationFn: (slug) => personalizationApi.recordProductView(slug),
  })
}

export function useRecentlyViewed({ enabled = true, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['recently-viewed', limit],
    queryFn: () => personalizationApi.getRecentlyViewed(limit),
    enabled,
  })
}
