import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../features/promotions/api'
import { VoucherCampaignsPage } from './VoucherCampaignsPage'

vi.mock('../../features/promotions/api')

describe('VoucherCampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getVoucherCampaigns.mockResolvedValue({ data: [{
      id: 8, code: 'ROOM10', type: 'percentage', value: 10, min_order_value: 500000,
      stack_with_sale: false, claim_required: true, expires_at: '2026-09-01T00:00:00Z',
    }] })
  })

  it('explains stacking without a public claim action', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><VoucherCampaignsPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('ROOM10')).toBeInTheDocument()
    expect(screen.getByText('Không')).toBeInTheDocument()
    expect(screen.getByText('Voucher đang mở')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu vào ví' })).not.toBeInTheDocument()
  })
})
