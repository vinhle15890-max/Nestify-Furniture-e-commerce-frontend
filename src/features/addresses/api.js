import { apiClient } from '../../lib/apiClient'

export function getAddresses() {
  return apiClient.get('/addresses')
}

export function createAddress(payload) {
  return apiClient.post('/addresses', payload)
}

export function updateAddress(id, payload) {
  return apiClient.patch(`/addresses/${id}`, payload)
}

export function deleteAddress(id) {
  return apiClient.delete(`/addresses/${id}`)
}

export function setDefaultAddress(id) {
  return apiClient.patch(`/addresses/${id}/default`)
}
