import { apiClient } from '../../lib/apiClient'

export function getScene(id) {
  return apiClient.get(`/room-scenes/${id}`)
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
