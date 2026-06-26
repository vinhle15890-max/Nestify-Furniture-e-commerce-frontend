import { apiClient } from '../../../lib/apiClient'

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

export function updateVariant(id, payload) {
  return apiClient.patch(`/admin/variants/${id}`, payload)
}

export function uploadMedia(productId, formData) {
  return apiClient.post(`/admin/products/${productId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function reorderMedia(productId, ids) {
  return apiClient.patch(`/admin/products/${productId}/media/reorder`, { ids })
}

export function deleteMedia(productId, mediaId) {
  return apiClient.delete(`/admin/products/${productId}/media/${mediaId}`)
}
