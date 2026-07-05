import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as seoApi from './api'

export function useSeoDrafts({ status = 'pending', page = 1 } = {}) {
  return useQuery({
    queryKey: ['admin', 'seo-drafts', status, page],
    queryFn: () => seoApi.getSeoDrafts({ status, page }),
  })
}

export function useBulkGenerateSeo() {
  return useMutation({
    mutationFn: (payload) => seoApi.bulkGenerateSeo(payload),
  })
}

// Poll batch progress while a bulk run is in flight; stops once finished.
export function useSeoBatch(batchId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin', 'seo-batch', batchId],
    queryFn: () => seoApi.getSeoBatch(batchId),
    enabled: enabled && Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.data?.finished ? false : 3000),
  })
}

export function useApplyDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId) => seoApi.applySeoDraft(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useDismissDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId) => seoApi.dismissSeoDraft(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'seo-drafts'] }),
  })
}
