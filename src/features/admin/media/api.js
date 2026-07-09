import { apiClient } from '../../../lib/apiClient'

export function listMedia(params) {
  return apiClient.get('/admin/media', { params })
}

export function uploadMedia(formData) {
  return apiClient.post('/admin/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function updateMediaAlt(id, alt_text) {
  return apiClient.patch(`/admin/media/${id}`, { alt_text })
}

export function deleteMedia(id) {
  return apiClient.delete(`/admin/media/${id}`)
}
