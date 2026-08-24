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
  meta: { current_page: 1, last_page: 2, total: 9 },
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
    productsApi.getInventoryVariants.mockResolvedValue(lowStockResponse)
    productsApi.getVariantStockMovements.mockResolvedValue({
      data: { data: [{
        id: 11,
        type: 'adjustment',
        quantity_delta: 1,
        stock_before: 5,
        stock_after: 6,
        reserved_before: 2,
        reserved_after: 2,
        reference: 'KK-T34-2026',
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

    expect(await screen.findByRole('heading', { name: 'Ghi phiếu kho' })).toBeInTheDocument()
    expect(screen.getByText('Có thể bán')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Nhập hàng' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hàng mới thực tế vào kho')).toBeInTheDocument()
    expect(await screen.findByText('Kiểm kê kho tuần 34')).toBeInTheDocument()
    expect(screen.getByText('Chứng từ: KK-T34-2026')).toBeInTheDocument()
    expect(screen.getByText('Khả dụng 3 → 4')).toBeInTheDocument()
  })

  it('requires a reason and sends an idempotent stock adjustment', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Sofa Nature/ }))
    fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Mã phiếu / chứng từ (không bắt buộc)'), { target: { value: 'PN-2026-034' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Nhập hàng tuần 34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi phiếu kho' }))

    await waitFor(() => expect(productsApi.adjustVariantStock).toHaveBeenCalledWith(7, expect.objectContaining({
      operation: 'stock_in',
      quantity_delta: 2,
      reference: 'PN-2026-034',
      reason: 'Nhập hàng tuần 34',
      idempotency_key: expect.stringContaining('admin-inventory:7:'),
    })))
  })

  it('converts an outbound quantity to a negative ledger delta', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Sofa Nature/ }))
    fireEvent.click(screen.getByRole('button', { name: '− Hao hụt / hư hỏng' }))
    fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Hư hỏng khi kiểm kê' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi phiếu kho' }))

    await waitFor(() => expect(productsApi.adjustVariantStock).toHaveBeenCalledWith(7, expect.objectContaining({
      operation: 'inventory_loss',
      quantity_delta: -2,
    })))
  })

  it('searches across all variants and can disable the low-stock-only scope', async () => {
    renderPage()
    await screen.findByText('Sofa Nature · Màu be')
    fireEvent.change(screen.getByLabelText('Tìm theo SKU, sản phẩm hoặc tên biến thể'), { target: { value: 'SOFA-NATURE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả tồn kho' }))

    await waitFor(() => expect(productsApi.getInventoryVariants).toHaveBeenCalledWith(expect.objectContaining({
      q: 'SOFA-NATURE',
      low_stock_only: 0,
    })))
  })

  it('shows the replenishment page count and requests the next server page', async () => {
    renderPage()

    expect(await screen.findByText('Trang 1/2 · 9 biến thể')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Biến thể tồn kho thấp' })).toHaveClass('flex-1', 'overflow-y-auto')
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))

    await waitFor(() => expect(productsApi.getInventoryVariants).toHaveBeenCalledWith(expect.objectContaining({
      low_stock_only: 1,
      page: 2,
    })))
  })

  it('warns before submitting a decrease below reserved stock', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Sofa Nature/ }))
    fireEvent.click(screen.getByRole('button', { name: '− Xuất kho' }))
    fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Xuất kho trưng bày' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi phiếu kho' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể giảm xuống 1 vì đang có 2 sản phẩm được giữ')
    expect(productsApi.adjustVariantStock).not.toHaveBeenCalled()
  })
})
