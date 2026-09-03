import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../../lib/pagination'
import * as mediaApi from './api'

export function useMediaLibrary({ page = 1, search = '', type, enabled = true } = {}) {
  return useOffsetQuery({
    queryKey: ['admin', 'media', { search, type }],
    queryFn: (p) => mediaApi.listMedia({ page: p, search: search || undefined, type }),
    page,
    enabled,
  })
}

export function useUploadMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData) => mediaApi.uploadMedia(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}

export function useUpdateMediaAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, alt_text }) => mediaApi.updateMediaAlt(id, alt_text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}

export function useDeleteMediaAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => mediaApi.deleteMedia(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}
