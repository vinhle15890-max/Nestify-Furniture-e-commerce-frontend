import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../features/promotions/api'
import { useAuthStore } from '../../store/authStore'
import { VoucherCampaignsPage } from './VoucherCampaignsPage'

vi.mock('../../features/promotions/api')

describe('VoucherCampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'token', user: { id: 1, role: 'customer' } })
    api.getVoucherCampaigns.mockResolvedValue({ data: [{
      id: 8, code: 'ROOM10', type: 'percentage', value: 10, min_order_value: 500000,
      stack_with_sale: false, claim_required: true, expires_at: '2026-09-01T00:00:00Z',
    }] })
    api.claimVoucher.mockResolvedValue({ data: {} })
  })

  it('explains stacking and lets a customer save a public voucher', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><VoucherCampaignsPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('ROOM10')).toBeInTheDocument()
    expect(screen.getByText('Không')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào ví' }))
    await waitFor(() => expect(api.claimVoucher).toHaveBeenCalledWith(8))
  })
})
