import { apiClient } from '../../lib/apiClient'

export function listScenes(page = 1) {
  return apiClient.get('/room-scenes', { params: { page } })
}

export function getScene(id) {
  return apiClient.get(`/room-scenes/${id}`)
}

export function deleteScene(id) {
  return apiClient.delete(`/room-scenes/${id}`)
}

export function getSharedScene(token) {
  return apiClient.get(`/room-scenes/share/${token}`)
}

export function shareScene(id) {
  return apiClient.post(`/room-scenes/${id}/share`)
}

export function createScene(payload) {
  return apiClient.post('/room-scenes', payload)
}

export function updateScene(id, payload) {
  return apiClient.patch(`/room-scenes/${id}`, payload)
}

export function addSceneToCart(id) {
  return apiClient.post(`/room-scenes/${id}/add-to-cart`)
}
