import { apiClient } from '../../../lib/apiClient'
import axios from 'axios'

export function getProducts(page) {
  return apiClient.get('/admin/products', { params: { page } })
}

export function getProduct(id) {
  return apiClient.get(`/admin/products/${id}`)
}

export function createProduct(payload) {
  return apiClient.post('/admin/products', payload)
}

export function updateProduct(id, payload) {
  return apiClient.patch(`/admin/products/${id}`, payload)
}

export function archiveProduct(id) {
  return apiClient.delete(`/admin/products/${id}`)
}

export function generateProductDescription(payload) {
  return apiClient.post('/admin/products/ai/description', payload)
}

export function createVariant(productId, payload) {
  return apiClient.post(`/admin/products/${productId}/variants`, payload)
}

export function bulkCreateVariants(productId, variants) {
  return apiClient.post(`/admin/products/${productId}/variants/bulk`, { variants })
}

export function updateVariant(id, payload) {
  return apiClient.patch(`/admin/variants/${id}`, payload)
}

export function adjustVariantStock(id, payload) {
  return apiClient.post(`/admin/variants/${id}/stock-adjustments`, payload)
}

export function getVariantStockMovements(id) {
  return apiClient.get(`/admin/variants/${id}/stock-movements`)
}

export function getLowStockVariants({ threshold = 5, page = 1 } = {}) {
  return apiClient.get('/admin/inventory/low-stock', { params: { threshold, page } })
}

export function uploadMedia(productId, formData) {
  return apiClient.post(`/admin/products/${productId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function presignVariantModel(variantId) {
  return apiClient.post(`/admin/variants/${variantId}/model/presign`)
}

export function putPresignedModel({ url, headers, file, onProgress }) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
  return axios.put(url, file, {
    headers: { ...normalizedHeaders, 'Content-Type': 'model/gltf-binary' },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
}

export function measureVariantModel(variantId, stagingToken) {
  return apiClient.post(`/admin/variants/${variantId}/model/measure`, { staging_token: stagingToken })
}

export function confirmVariantModel(variantId, payload) {
  return apiClient.post(`/admin/variants/${variantId}/model/confirm`, payload)
}

export function reorderMedia(productId, ids) {
  return apiClient.patch(`/admin/products/${productId}/media/reorder`, { ids })
}

// Tag a media item to a variant (variantId) or back to agnostic (null).
export function updateMedia(productId, mediaId, payload) {
  return apiClient.patch(`/admin/products/${productId}/media/${mediaId}`, payload)
}

export function deleteMedia(productId, mediaId) {
  return apiClient.delete(`/admin/products/${productId}/media/${mediaId}`)
}

// Attach existing media-library assets to a product (optionally scoped to a variant).
export function attachMedia(productId, { media_asset_ids, variant_id = null }) {
  return apiClient.post(`/admin/products/${productId}/media/attach`, { media_asset_ids, variant_id })
}
