import { apiClient } from '../../lib/apiClient'

export const getVoucherCampaigns = () => apiClient.get('/voucher-campaigns')
export const getVoucherWallet = () => apiClient.get('/me/vouchers')
