import { apiClient } from '../../lib/apiClient'

export const getVoucherCampaigns = () => apiClient.get('/voucher-campaigns')
export const claimVoucher = (id) => apiClient.post(`/voucher-campaigns/${id}/claim`)
export const getVoucherWallet = () => apiClient.get('/me/vouchers')
