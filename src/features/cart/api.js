import { apiClient } from '../../lib/apiClient'

export function getCart() {
  return apiClient.get('/cart')
}

export function addItem({ variant_id, quantity }) {
  return apiClient.post('/cart/items', { variant_id, quantity })
}

export function updateItem(itemId, { quantity }) {
  return apiClient.patch(`/cart/items/${itemId}`, { quantity })
}

export function removeItem(itemId) {
  return apiClient.post(`/cart/items/${itemId}/removal`)
}

export function restoreRemovedItem(token) {
  return apiClient.post(`/cart/removals/${token}/restore`)
}

export function applyVoucher(code) {
  return apiClient.post('/cart/apply-voucher', { code })
}

export function getAvailableVouchers() {
  return apiClient.get('/cart/available-vouchers')
}
