import { useQuery } from '@tanstack/react-query'
import * as api from './api'

export const useVoucherCampaigns = () => useQuery({ queryKey: ['voucher-campaigns'], queryFn: api.getVoucherCampaigns })
export const useVoucherWallet = () => useQuery({ queryKey: ['voucher-wallet'], queryFn: api.getVoucherWallet })
