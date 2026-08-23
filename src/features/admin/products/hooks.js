import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../../lib/pagination'
import * as productsApi from './api'

function invalidateProductMedia(queryClient, productId) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
  queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] })
}

export function useAdminProducts(page) {
  return useOffsetQuery({
    queryKey: ['admin', 'products'],
    queryFn: productsApi.getProducts,
    page,
  })
}

export function useAdminProduct(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => productsApi.getProduct(id),
    enabled: enabled && Number.isFinite(id),
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

export function useGenerateDescription() {
  return useMutation({
    mutationFn: (payload) => productsApi.generateProductDescription(payload),
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

export function useBulkCreateVariants() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, variants }) => productsApi.bulkCreateVariants(productId, variants),
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

export function useAdjustVariantStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => productsApi.adjustVariantStock(id, payload),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant', id, 'stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useLowStockVariants({ threshold = 5, page = 1 } = {}) {
  return useQuery({
    queryKey: ['admin', 'inventory', 'low-stock', { threshold, page }],
    queryFn: () => productsApi.getLowStockVariants({ threshold, page }),
  })
}

export function useInventoryVariants({ q = '', threshold = 5, lowStockOnly = false, page = 1 } = {}) {
  return useQuery({
    queryKey: ['admin', 'inventory', 'variants', { q, threshold, lowStockOnly, page }],
    queryFn: () => productsApi.getInventoryVariants({ q, threshold, low_stock_only: lowStockOnly ? 1 : 0, page }),
  })
}

export function useVariantStockMovements(id, filters = {}) {
  return useQuery({
    queryKey: ['admin', 'variant', id, 'stock-movements', filters],
    queryFn: () => productsApi.getVariantStockMovements(id, filters),
    enabled: Number.isFinite(id),
  })
}

export function useExportVariantStockMovements() {
  return useMutation({ mutationFn: ({ id, filters }) => productsApi.exportVariantStockMovements(id, filters) })
}

export function usePresignVariantModel() {
  return useMutation({ mutationFn: productsApi.presignVariantModel })
}

export function useMeasureVariantModel() {
  return useMutation({
    mutationFn: ({ variantId, stagingToken }) => productsApi.measureVariantModel(variantId, stagingToken),
  })
}

export function useConfirmVariantModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ variantId, ...payload }) => productsApi.confirmVariantModel(variantId, payload),
    onSuccess: (response) => {
      if (response.data?.variant) queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
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
    onSuccess: (_response, { productId }) => invalidateProductMedia(queryClient, productId),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, mediaId }) => productsApi.deleteMedia(productId, mediaId),
    onSuccess: (_response, { productId }) => invalidateProductMedia(queryClient, productId),
  })
}

export function useUpdateMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, mediaId, ...payload }) => productsApi.updateMedia(productId, mediaId, payload),
    onSuccess: (_response, { productId }) => invalidateProductMedia(queryClient, productId),
  })
}

// Attach media-library assets (from the media feature) to a product/variant.
export function useAttachMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, mediaAssetIds, variantId = null }) =>
      productsApi.attachMedia(productId, { media_asset_ids: mediaAssetIds, variant_id: variantId }),
    onSuccess: (_response, { productId }) => invalidateProductMedia(queryClient, productId),
  })
}
