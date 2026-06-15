import { apiClient } from '../../lib/apiClient'

export function getWishlist() {
  return apiClient.get('/wishlist')
}

export function addItem({ variant_id, notify_on_restock }) {
  return apiClient.post('/wishlist/items', { variant_id, notify_on_restock })
}

export function removeItem(itemId) {
  return apiClient.delete(`/wishlist/items/${itemId}`)
}

export function updateItem(itemId, { notify_on_restock }) {
  return apiClient.patch(`/wishlist/items/${itemId}`, { notify_on_restock })
}

export function moveToCart(itemId) {
  return apiClient.post(`/wishlist/items/${itemId}/move-to-cart`)
}
