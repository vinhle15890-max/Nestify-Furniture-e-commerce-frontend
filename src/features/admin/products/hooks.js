import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../../lib/pagination'
import * as productsApi from './api'

export function useAdminProducts(page) {
  return useOffsetQuery({
    queryKey: ['admin', 'products'],
    queryFn: productsApi.getProducts,
    page,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => productsApi.createProduct(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => productsApi.updateProduct(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useArchiveProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => productsApi.archiveProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useCreateVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, ...payload }) => productsApi.createVariant(productId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useUpdateVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => productsApi.updateVariant(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useUploadMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, formData }) => productsApi.uploadMedia(productId, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useReorderMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, ids }) => productsApi.reorderMedia(productId, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, mediaId }) => productsApi.deleteMedia(productId, mediaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}
