import { apiClient } from '../../../lib/apiClient'

export function getCategories() {
  return apiClient.get('/admin/categories')
}

export function createCategory(payload) {
  return apiClient.post('/admin/categories', payload)
}

export function updateCategory(id, payload) {
  return apiClient.patch(`/admin/categories/${id}`, payload)
}

export function deleteCategory(id) {
  return apiClient.delete(`/admin/categories/${id}`)
}
