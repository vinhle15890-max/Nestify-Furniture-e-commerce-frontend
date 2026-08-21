import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminInventoryPage } from './AdminInventoryPage'
import * as productsApi from '../../../features/admin/products/api'

vi.mock('../../../features/admin/products/api')

const lowStockResponse = {
  data: [{
    id: 7,
    sku: 'SOFA-NATURE-BE',
    name: 'Màu be',
    product_name: 'Sofa Nature',
    stock_quantity: 6,
    reserved_quantity: 2,
    available_stock: 4,
  }],
  meta: { current_page: 1, last_page: 1 },
  threshold: 5,
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><AdminInventoryPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminInventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    productsApi.getLowStockVariants.mockResolvedValue(lowStockResponse)
    productsApi.getVariantStockMovements.mockResolvedValue({
      data: { data: [{
        id: 11,
        type: 'adjustment',
        quantity_delta: 1,
        stock_before: 5,
        stock_after: 6,
        reason: 'Kiểm kê kho tuần 34',
        actor: { id: 1, name: 'Admin' },
        order: null,
        created_at: '2026-08-21T08:00:00Z',
      }] },
    })
    productsApi.adjustVariantStock.mockResolvedValue({ data: { ...lowStockResponse.data[0], stock_quantity: 8 } })
  })

  it('shows available, physical and reserved stock then loads the selected ledger', async () => {
    renderPage()

    expect(await screen.findByText('Sofa Nature · Màu be')).toBeInTheDocument()
    expect(screen.getByText(/thực tế 6 · đang giữ 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Sofa Nature/ }))

    expect(await screen.findByText('Điều chỉnh kiểm kê')).toBeInTheDocument()
    expect(await screen.findByText('Kiểm kê kho tuần 34')).toBeInTheDocument()
  })

  it('requires a reason and sends an idempotent stock adjustment', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Sofa Nature/ }))
    fireEvent.change(screen.getByLabelText('Số lượng tăng/giảm'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Lý do kiểm kê'), { target: { value: 'Nhập hàng tuần 34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận điều chỉnh' }))

    await waitFor(() => expect(productsApi.adjustVariantStock).toHaveBeenCalledWith(7, expect.objectContaining({
      quantity_delta: 2,
      reason: 'Nhập hàng tuần 34',
      idempotency_key: expect.stringContaining('admin-inventory:7:'),
    })))
  })
})
