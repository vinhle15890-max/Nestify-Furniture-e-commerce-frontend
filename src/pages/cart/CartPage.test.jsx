import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CartPage } from './CartPage'
import * as cartApi from '../../features/cart/api'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/cart/api')

const sampleCart = {
  data: {
    id: 1,
    items: [
      {
        id: 10,
        variant: {
          id: 1,
          sku: 'SOFA-NAU',
          name: 'Nâu',
          product_name: 'Sofa Mây',
          product_slug: 'sofa-may',
          attributes: {},
          price: 5000000,
          available_stock: 5,
          model_3d_url: null,
          is_active: true,
        },
        quantity: 2,
        unit_price_snapshot: 5000000,
        subtotal: 10000000,
      },
    ],
    total: 10000000,
  },
}

const verifiedCustomer = {
  id: 1,
  name: 'Bao',
  email_verified_at: '2026-07-13T00:00:00.000000Z',
  roles: ['customer'],
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openVoucherDiscovery() {
  const disclosure = await screen.findByTestId('voucher-discovery')
  await userEvent.click(within(disclosure).getByText('Xem mã phù hợp'))
  return disclosure
}

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cartApi.getCart.mockResolvedValue(sampleCart)
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [] })
  })

  it('shows a login prompt for guests', () => {
    useAuthStore.setState({ token: null, user: null })
    renderPage()

    expect(screen.getByRole('link', { name: /đăng nhập để xem giỏ hàng/i })).toBeInTheDocument()
    expect(cartApi.getCart).not.toHaveBeenCalled()
  })

  it('renders cart items for authenticated users', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    renderPage()

    expect(await screen.findByText('Sofa Mây')).toBeInTheDocument()
    expect(screen.getByText(/SOFA-NAU/)).toBeInTheDocument()
    expect(screen.getAllByText('10.000.000 ₫')).toHaveLength(2)
  })

  it('shows a retryable load failure instead of an empty cart', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.getCart
      .mockRejectedValueOnce(new ApiError('SERVER_ERROR', 'Máy chủ chưa phản hồi.', {}, 500))
      .mockResolvedValueOnce(sampleCart)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể tải giỏ hàng')
    expect(screen.queryByText('Giỏ hàng của bạn còn trống.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Sofa Mây')).toBeInTheDocument()
    expect(cartApi.getCart).toHaveBeenCalledTimes(2)
  })

  it('shows room provenance without claiming verified fit', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.getCart.mockResolvedValue({
      data: {
        id: 1,
        items: [
          {
            id: 10,
            variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu', product_name: 'Sofa Mây', available_stock: 5, is_active: true },
            room: { id: 7, name: 'Phòng khách' },
            quantity: 1,
            unit_price_snapshot: 5000000,
            subtotal: 5000000,
          },
          {
            id: 11,
            variant: { id: 2, sku: 'BAN-GO', name: 'Gỗ', available_stock: 5, is_active: true },
            quantity: 1,
            unit_price_snapshot: 2000000,
            subtotal: 2000000,
          },
        ],
        total: 7000000,
      },
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phòng khách' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Phòng khách' })).toHaveAttribute('href', '/room-planner/7')
    expect(screen.getByRole('list', { name: 'Sản phẩm từ phòng Phòng khách' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sản phẩm chọn riêng' })).toBeInTheDocument()
    expect(screen.queryByText(/xác nhận vừa|vừa với phòng/i)).not.toBeInTheDocument()
  })

  it('increments quantity and removes an item', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.updateItem.mockResolvedValue({
      data: {
        ...sampleCart.data,
        items: [{ ...sampleCart.data.items[0], quantity: 3, subtotal: 15000000 }],
        total: 15000000,
      },
    })
    cartApi.removeItem.mockResolvedValue({ meta: { removal: { restore_token: 'restore-token', expires_at: '2026-08-26T10:05:00Z' } } })
    cartApi.restoreRemovedItem.mockResolvedValue(sampleCart)
    renderPage()

    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))
    expect(cartApi.updateItem).toHaveBeenCalledWith(10, { quantity: 3 })

    await userEvent.click(screen.getByRole('button', { name: 'Xóa Sofa Mây' }))
    expect(cartApi.removeItem).toHaveBeenCalledWith(10)
    expect(await screen.findByText('Đã xóa Sofa Mây khỏi giỏ.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(cartApi.restoreRemovedItem).toHaveBeenCalledWith('restore-token')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument())
  })

  it('shows an inline message and clamps quantity on insufficient stock', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.updateItem.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng trong kho', { variant_id: 1, requested: 3, available: 1 }, 409),
    )
    renderPage()

    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(await screen.findByText('Kho hiện có 1 sản phẩm. Số lượng trong giỏ chưa bị thay đổi.')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('2')
  })

  it('warns and blocks checkout when a saved line exceeds current stock', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.getCart.mockResolvedValue({
      data: {
        id: 1,
        items: [
          {
            id: 10,
            variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu', product_name: 'Sofa Mây', attributes: {}, price: 5000000, available_stock: 1, model_3d_url: null, is_active: true },
            quantity: 2,
            unit_price_snapshot: 5000000,
            subtotal: 10000000,
          },
        ],
        total: 10000000,
      },
    })
    renderPage()

    await screen.findByText('Sofa Mây')

    expect(screen.getByText(/Kho hiện có 1 sản phẩm. Hãy giảm số lượng trước khi tiếp tục/)).toBeInTheDocument()
    // The checkout affordance becomes a disabled button, not a link to /checkout.
    expect(screen.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Tiến hành thanh toán' })).not.toBeInTheDocument()
  })

  it('applies a voucher to the order summary without changing the cart total', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [{ code: 'GIAM10', discount_amount: 1000000, final_total: 9000000 }] })
    renderPage()

    await screen.findByText('Sofa Mây')
    await openVoucherDiscovery()

    await userEvent.click(await screen.findByRole('radio', { name: /GIAM10/ }))

    expect(cartApi.applyVoucher).toHaveBeenCalledWith('GIAM10')
    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('-1.000.000 ₫')).toBeInTheDocument()
    expect(screen.getAllByText('10.000.000 ₫')).toHaveLength(2)
  })

  it('keeps direct voucher entry visible while optional discovery is closed', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [{ code: 'GIAM10', discount_amount: 1000000, final_total: 9000000 }] })
    renderPage()

    const discovery = await screen.findByTestId('voucher-discovery')
    expect(discovery).not.toHaveAttribute('open')

    await userEvent.type(screen.getByRole('textbox', { name: 'Nhập mã giảm giá' }), ' GIAM10 ')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng mã' }))

    expect(cartApi.applyVoucher).toHaveBeenCalledWith('GIAM10')
    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()
    expect(discovery).not.toHaveAttribute('open')
  })

  it('explains the best voucher and lets the customer remove it before checkout', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    const voucher = { code: 'BEST50', discount_amount: 1500000, final_total: 8500000, is_best_value: true, remaining_usage: 4, expires_at: '2026-09-01T00:00:00Z' }
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [voucher] })
    cartApi.applyVoucher.mockResolvedValue({ data: voucher })
    renderPage()

    await openVoucherDiscovery()
    expect(await screen.findByText('Tiết kiệm nhất')).toBeInTheDocument()
    expect(screen.getByText(/còn trả 8.500.000 ₫/)).toBeInTheDocument()
    expect(screen.getByText(/còn 4 lượt/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /BEST50/ }))
    expect(await screen.findByRole('link', { name: 'Tiến hành thanh toán' })).toHaveAttribute('href', '/checkout?voucher=BEST50')

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ mã BEST50' }))
    expect(screen.getByRole('link', { name: 'Tiến hành thanh toán' })).toHaveAttribute('href', '/checkout')
    expect(screen.queryByText('Thành tiền dự kiến')).not.toBeInTheDocument()
  })

  it('derives the preview total when an older apply-voucher response omits final_total', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000 } })
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [{ code: 'GIAM10', discount_amount: 1000000, final_total: 9000000 }] })
    renderPage()

    await openVoucherDiscovery()
    await userEvent.click(await screen.findByRole('radio', { name: /GIAM10/ }))

    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()
    expect(screen.queryByText('0 ₫')).not.toBeInTheDocument()
  })

  it('keeps a large voucher list searchable without rendering every option', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    const vouchers = Array.from({ length: 105 }, (_, index) => ({
      code: `MA-${String(index + 1).padStart(3, '0')}`,
      discount_amount: (index + 1) * 1000,
      final_total: 10000000 - ((index + 1) * 1000),
    }))
    cartApi.getAvailableVouchers.mockResolvedValue({ data: vouchers })
    cartApi.applyVoucher.mockResolvedValue({ data: vouchers[104] })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Tóm tắt giỏ hàng' })).toBeInTheDocument()
    expect(screen.queryByText('Hệ quả hiện tại')).not.toBeInTheDocument()
    const discovery = await screen.findByTestId('voucher-discovery')
    expect(discovery).not.toHaveAttribute('open')
    expect(screen.getByRole('textbox', { name: 'Nhập mã giảm giá' })).toBeVisible()
    await userEvent.click(within(discovery).getByText('Xem mã phù hợp'))
    expect(discovery).toHaveAttribute('open')
    expect(await screen.findByText('MA-001')).toBeInTheDocument()
    expect(screen.getByText('MA-006')).toBeInTheDocument()
    expect(screen.queryByText('MA-007')).not.toBeInTheDocument()
    expect(screen.getByText('Hiển thị 1–6 trong 105 mã')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sau' }))
    expect(screen.queryByText('MA-001')).not.toBeInTheDocument()
    expect(screen.getByText('MA-007')).toBeInTheDocument()
    expect(screen.getByText('Trang 2/18')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm mã giảm giá' }), 'MA-105')
    await userEvent.click(screen.getByRole('radio', { name: /MA-105/ }))

    expect(cartApi.applyVoucher).toHaveBeenCalledWith('MA-105')
  })

  it('restores confirmed quantity and shows an item-local error after a generic update failure', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.updateItem.mockRejectedValue(new ApiError('SERVER_ERROR', 'Chưa cập nhật được số lượng.', {}, 500))
    renderPage()

    await screen.findByText('Sofa Mây')
    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa cập nhật được số lượng.')
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('2')
    expect(screen.getAllByText('10.000.000 ₫')).toHaveLength(2)
  })

  it('prevents competing quantity changes while that item mutation is pending', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    const update = deferred()
    cartApi.updateItem.mockReturnValue(update.promise)
    renderPage()

    await screen.findByText('Sofa Mây')
    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(screen.getByRole('status')).toHaveTextContent('Đang cập nhật số lượng')
    expect(screen.getByRole('button', { name: 'Tăng số lượng' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Giảm số lượng' })).toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toBeDisabled()

    update.resolve(sampleCart)
    await waitFor(() => expect(screen.queryByText('Đang cập nhật số lượng…')).not.toBeInTheDocument())
  })

  it('keeps the item and exposes an item-local removal failure', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.removeItem.mockRejectedValue(new ApiError('SERVER_ERROR', 'Chưa xóa được lựa chọn này.', {}, 500))
    renderPage()

    await screen.findByText('Sofa Mây')
    await userEvent.click(screen.getByRole('button', { name: 'Xóa Sofa Mây' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xóa được lựa chọn này.')
    expect(screen.getByText('Sofa Mây')).toBeInTheDocument()
  })

  it('clears a stale voucher preview after a successful quantity change', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [{ code: 'GIAM10', discount_amount: 1000000, final_total: 9000000 }] })
    cartApi.updateItem.mockResolvedValue({
      data: {
        ...sampleCart.data,
        items: [{ ...sampleCart.data.items[0], quantity: 3, subtotal: 15000000 }],
        total: 15000000,
      },
    })
    renderPage()

    await screen.findByText('Sofa Mây')
    await openVoucherDiscovery()
    await userEvent.click(await screen.findByRole('radio', { name: /GIAM10/ }))
    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(await screen.findAllByText('15.000.000 ₫')).toHaveLength(2)
    expect(screen.queryByText('9.000.000 ₫')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Giỏ hàng đã thay đổi')
  })

  it('clears a stale voucher preview after a successful removal', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    const secondItem = {
      id: 11,
      variant: { id: 2, sku: 'BAN-GO', name: 'Gỗ', product_name: 'Bàn Gỗ', product_slug: 'ban-go', available_stock: 4, is_active: true },
      quantity: 1,
      unit_price_snapshot: 2000000,
      subtotal: 2000000,
    }
    cartApi.getCart.mockResolvedValue({ data: { ...sampleCart.data, items: [...sampleCart.data.items, secondItem], total: 12000000 } })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 11000000 } })
    cartApi.getAvailableVouchers.mockResolvedValue({ data: [{ code: 'GIAM10', discount_amount: 1000000, final_total: 11000000 }] })
    cartApi.removeItem.mockResolvedValue({})
    renderPage()

    await screen.findByText('Bàn Gỗ')
    await openVoucherDiscovery()
    await userEvent.click(await screen.findByRole('radio', { name: /GIAM10/ }))
    expect(await screen.findByText('11.000.000 ₫')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Xóa Bàn Gỗ' }))

    await waitFor(() => expect(screen.queryByText('11.000.000 ₫')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Giỏ hàng đã thay đổi')
  })

  it('shows the real Checkout boundary for unverified and staff accounts', async () => {
    useAuthStore.setState({ token: 'abc', user: { ...verifiedCustomer, email_verified_at: null } })
    const { unmount } = renderPage()

    expect(screen.getByRole('heading', { name: 'Xác thực email' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /thanh toán/i })).not.toBeInTheDocument()

    unmount()
    useAuthStore.setState({ token: 'staff', user: { ...verifiedCustomer, roles: ['admin'] } })
    renderPage()

    expect(screen.getByText(/Tài khoản quản trị không thể mua hàng/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /thanh toán/i })).not.toBeInTheDocument()
  })

  it('keeps all transaction facts present without interaction', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    renderPage()

    const item = await screen.findByRole('listitem')
    expect(within(item).getByText('Sofa Mây')).toBeInTheDocument()
    expect(within(item).getByText(/Nâu · SOFA-NAU/)).toBeInTheDocument()
    expect(within(item).getByText('Đơn giá')).toBeInTheDocument()
    expect(within(item).getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('2')
    expect(within(item).getByText('Thành tiền dòng')).toBeInTheDocument()
    expect(within(item).getByRole('button', { name: 'Xóa Sofa Mây' })).toBeInTheDocument()
    expect(within(item).getByRole('button', { name: 'Xóa Sofa Mây' }).parentElement).toContainElement(within(item).getByText('Sofa Mây'))
  })

  it('keeps the checkout action clear of the floating chat safe area', async () => {
    useAuthStore.setState({ token: 'abc', user: verifiedCustomer })
    renderPage()

    const action = await screen.findByRole('complementary', { name: 'Tiếp tục thanh toán' })
    expect(action).toHaveClass('pr-20', 'lg:right-24')
  })
})
