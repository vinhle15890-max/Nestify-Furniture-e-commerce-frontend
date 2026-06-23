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

// Generic kind-driven uploader. formData must carry `kind` + `file`.
// Returns { data: { url, public_id } }.
export function uploadImage(formData) {
  return apiClient.post('/admin/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
