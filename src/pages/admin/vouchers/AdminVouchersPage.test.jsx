import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminVouchersPage } from './AdminVouchersPage'
import * as vouchersApi from '../../../features/admin/vouchers/api'
import { ApiError } from '../../../lib/errors'
import { Toaster } from '../../../components/Toast'

vi.mock('../../../features/admin/vouchers/api')

const vouchersResponse = {
  data: [
    {
      id: 1,
      code: 'SALE10',
      type: 'percentage',
      value: 10,
      max_discount: 50000,
      min_order_value: 200000,
      max_usage_total: 100,
      current_usage: 5,
      max_usage_per_user: 1,
      starts_at: '2026-01-01T00:00:00+00:00',
      expires_at: '2026-12-31T00:00:00+00:00',
      status: 'active',
      created_at: '2026-01-01T00:00:00+00:00',
    },
    {
      id: 2,
      code: 'FREESHIP',
      type: 'fixed',
      value: 30000,
      max_discount: null,
      min_order_value: null,
      max_usage_total: 50,
      current_usage: 0,
      max_usage_per_user: 1,
      starts_at: null,
      expires_at: null,
      status: 'inactive',
      created_at: '2026-01-01T00:00:00+00:00',
    },
  ],
  // Laravel default resource-collection pagination meta (flat), as returned by VoucherController.
  meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminVouchersPage />
      <Toaster />
    </QueryClientProvider>,
  )
}

describe('AdminVouchersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vouchersApi.getVouchers.mockResolvedValue(vouchersResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the paginated voucher list', async () => {
    renderPage()

    expect(await screen.findByText('SALE10')).toBeInTheDocument()
    expect(screen.getByText('FREESHIP')).toBeInTheDocument()
    expect(screen.getByText('5/100')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Danh sách voucher' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa voucher SALE10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa voucher FREESHIP' })).toBeInTheDocument()
  })

  it('shows max_discount only when type is percentage', async () => {
    vouchersApi.createVoucher.mockResolvedValue({ data: { ...vouchersResponse.data[0], id: 3 } })
    renderPage()
    await screen.findByText('SALE10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))

    const dialog = screen.getByRole('dialog', { name: 'Thêm voucher mới' })
    expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-hidden')
    expect(dialog.querySelector('.overflow-y-auto')).not.toBeNull()
    expect(screen.getByText(/Nếu tắt, voucher chỉ dùng được sau khi admin tặng/)).toBeInTheDocument()

    expect(screen.queryByLabelText(/Giảm tối đa/)).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Loại'), 'percentage')
    expect(screen.getByLabelText(/Giảm tối đa/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Loại'), 'fixed')
    expect(screen.queryByLabelText(/Giảm tối đa/)).not.toBeInTheDocument()
  })

  it('creates a new voucher', async () => {
    vouchersApi.createVoucher.mockResolvedValue({ data: { ...vouchersResponse.data[0], id: 3, code: 'NEWCODE' } })
    renderPage()
    await screen.findByText('SALE10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))

    await userEvent.type(screen.getByLabelText('Mã voucher'), 'NEWCODE')
    await userEvent.selectOptions(screen.getByLabelText('Loại'), 'percentage')
    await userEvent.type(screen.getByLabelText('Giá trị'), '15')
    await userEvent.type(screen.getByLabelText(/Giảm tối đa/), '50000')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng tối đa$/), '100')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng \/ người/), '1')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher mới' }))

    await waitFor(() =>
      expect(vouchersApi.createVoucher).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NEWCODE',
          type: 'percentage',
          value: 15,
          max_discount: 50000,
          max_usage_total: 100,
          max_usage_per_user: 1,
          // Blank "min order value" must submit 0, not null — null hits a NOT NULL column (500).
          min_order_value: 0,
        }),
      ),
    )
  })

  it('accepts a multi-million fixed discount and rejects percentages over 100', async () => {
    vouchersApi.createVoucher.mockResolvedValue({ data: { ...vouchersResponse.data[0], id: 3 } })
    renderPage()
    await screen.findByText('SALE10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))
    await userEvent.type(screen.getByLabelText('Mã voucher'), 'SAVE2690K')
    await userEvent.type(screen.getByLabelText('Giá trị'), '2690000')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng tối đa$/), '100')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng \/ người/), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher mới' }))

    await waitFor(() => expect(vouchersApi.createVoucher).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fixed', value: 2690000 }),
    ))

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))
    await userEvent.selectOptions(screen.getByLabelText('Loại'), 'percentage')
    await userEvent.type(screen.getByLabelText('Giá trị'), '101')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher mới' }))

    expect(await screen.findByText('Voucher phần trăm không được vượt quá 100%.')).toBeInTheDocument()
    expect(vouchersApi.createVoucher).toHaveBeenCalledTimes(1)
  })

  it('generates a voucher code with the "Tạo mã" button', async () => {
    renderPage()
    await screen.findByText('SALE10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))
    const codeInput = screen.getByLabelText('Mã voucher')
    expect(codeInput).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã' }))

    expect(codeInput.value).toMatch(/^NES[A-Z2-9]{5}$/)
  })

  it('edits an existing voucher with values pre-filled', async () => {
    vouchersApi.updateVoucher.mockResolvedValue({ data: { ...vouchersResponse.data[0], value: 20 } })
    renderPage()
    await screen.findByText('SALE10')

    const rows = screen.getAllByRole('row')
    const saleRow = rows.find((row) => row.textContent.includes('SALE10'))
    await userEvent.click(within(saleRow).getByRole('button', { name: 'Sửa voucher SALE10' }))

    expect(screen.getByLabelText('Mã voucher')).toHaveValue('SALE10')
    expect(screen.getByLabelText('Giá trị')).toHaveValue(10)
    expect(screen.getByLabelText(/Giảm tối đa/)).toHaveValue(50000)

    await userEvent.clear(screen.getByLabelText('Giá trị'))
    await userEvent.type(screen.getByLabelText('Giá trị'), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(vouchersApi.updateVoucher).toHaveBeenCalledWith(1, expect.objectContaining({ value: 20 })),
    )
  })

  it('deletes a voucher after confirmation', async () => {
    vouchersApi.deleteVoucher.mockResolvedValue({})
    renderPage()
    await screen.findByText('SALE10')

    const rows = screen.getAllByRole('row')
    const freeshipRow = rows.find((row) => row.textContent.includes('FREESHIP'))
    await userEvent.click(within(freeshipRow).getByRole('button', { name: 'Xóa voucher FREESHIP' }))
    const dialog = screen.getByRole('dialog', { name: 'Xóa voucher' })
    expect(within(dialog).getByText(/FREESHIP/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xóa voucher' }))

    await waitFor(() => expect(vouchersApi.deleteVoucher).toHaveBeenCalledWith(2))
  })

  it('shows server validation errors on create', async () => {
    vouchersApi.createVoucher.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { code: ['Mã voucher đã tồn tại.'] } }, 422),
    )
    renderPage()
    await screen.findByText('SALE10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))

    await userEvent.type(screen.getByLabelText('Mã voucher'), 'SALE10')
    await userEvent.type(screen.getByLabelText('Giá trị'), '10')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng tối đa$/), '100')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng \/ người/), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher mới' }))

    expect(await screen.findByText('Mã voucher đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mã voucher')).toHaveFocus()
    expect(screen.getByLabelText('Mã voucher')).toHaveValue('SALE10')
  })

  it('shows pending submit copy and blocks a duplicate voucher create', async () => {
    let resolveCreate
    vouchersApi.createVoucher.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    renderPage()
    await screen.findByText('SALE10')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher' }))
    await userEvent.type(screen.getByLabelText('Mã voucher'), 'NEWCODE')
    await userEvent.type(screen.getByLabelText('Giá trị'), '10')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng tối đa$/), '100')
    await userEvent.type(screen.getByLabelText(/Lượt sử dụng \/ người/), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm voucher mới' }))

    const pendingButton = await screen.findByRole('button', { name: 'Đang lưu...' })
    expect(pendingButton).toBeDisabled()
    expect(vouchersApi.createVoucher).toHaveBeenCalledTimes(1)

    resolveCreate({ data: {} })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm voucher mới' })).toBeNull())
  })
})
