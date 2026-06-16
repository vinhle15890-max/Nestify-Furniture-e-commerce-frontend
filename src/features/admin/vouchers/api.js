import { apiClient } from '../../../lib/apiClient'

export function getVouchers(page) {
  return apiClient.get('/admin/vouchers', { params: { page } })
}

export function createVoucher(payload) {
  return apiClient.post('/admin/vouchers', payload)
}

export function updateVoucher(id, payload) {
  return apiClient.patch(`/admin/vouchers/${id}`, payload)
}

export function deleteVoucher(id) {
  return apiClient.delete(`/admin/vouchers/${id}`)
}
