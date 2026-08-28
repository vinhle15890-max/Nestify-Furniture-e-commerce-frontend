import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export const useVoucherCampaigns = () => useQuery({ queryKey: ['voucher-campaigns'], queryFn: api.getVoucherCampaigns })
export const useVoucherWallet = () => useQuery({ queryKey: ['voucher-wallet'], queryFn: api.getVoucherWallet })
export function useClaimVoucher() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.claimVoucher(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['voucher-wallet'] })
      client.invalidateQueries({ queryKey: ['cart', 'available-vouchers'] })
    },
  })
}
