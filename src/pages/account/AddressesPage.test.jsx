import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AddressesPage } from './AddressesPage'
import { ApiError } from '../../lib/errors'
import * as addressesApi from '../../features/addresses/api'

vi.mock('../../features/addresses/api')

const sampleAddresses = [
  {
    id: 1,
    recipient_name: 'Bao Le',
    phone: '0900000000',
    address_line1: '123 Đường A',
    address_line2: null,
    city: 'Phường Ba Đình',
    province: 'Thành phố Hà Nội',
    postal_code: '700000',
    is_default: true,
  },
  {
    id: 2,
    recipient_name: 'Mai Nguyen',
    phone: '0911111111',
    address_line1: '456 Đường B',
    address_line2: null,
    city: 'Hà Nội',
    province: 'Hà Nội',
    postal_code: '100000',
    is_default: false,
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddressesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function chooseRegion(label, search, option) {
  const combobox = screen.getByRole('combobox', { name: label })
  await userEvent.click(combobox)
  await userEvent.clear(combobox)
  await userEvent.type(combobox, search)
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('AddressesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addressesApi.getAddresses.mockResolvedValue({ data: sampleAddresses })
  })

  it('renders the address list with a "Mặc định" badge on the default address', async () => {
    renderPage()

    expect(await screen.findByText('Bao Le · 0900000000')).toBeInTheDocument()
    expect(screen.getByText('Mai Nguyen · 0911111111')).toBeInTheDocument()
    expect(screen.getByText('Mặc định')).toBeInTheDocument()
  })

  it('shows a retryable failure instead of claiming there are no addresses', async () => {
    addressesApi.getAddresses
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: sampleAddresses })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể tải sổ địa chỉ')
    expect(screen.queryByText('Bạn chưa có địa chỉ nào.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Bao Le · 0900000000')).toBeInTheDocument()
    expect(addressesApi.getAddresses).toHaveBeenCalledTimes(2)
  })

  it('creates a new address from the modal form', async () => {
    addressesApi.createAddress.mockResolvedValue({ data: { ...sampleAddresses[0], id: 3 } })
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))

    await userEvent.type(screen.getByLabelText('Tên người nhận'), 'Tan Pham')
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0922222222')
    await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '789 Đường C')

    // VN address (post Nghị quyết 202/2025): two-tier cascading dropdowns
    // (Tỉnh/Thành phố → Phường/Xã), populated from the bundled 34-province dataset
    // that loads when the modal opens.
    await chooseRegion('Tỉnh/Thành phố', 'ha noi', 'Thành phố Hà Nội')
    await chooseRegion('Phường/Xã/Thị trấn', 'ba dinh', 'Phường Ba Đình')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))

    await waitFor(() =>
      expect(addressesApi.createAddress).toHaveBeenCalledWith({
        recipient_name: 'Tan Pham',
        phone: '0922222222',
        address_line1: '789 Đường C',
        address_line2: '',
        city: 'Phường Ba Đình',
        province: 'Thành phố Hà Nội',
        postal_code: '',
      }),
    )
  })

  it('edits an existing address pre-filled with its current values', async () => {
    addressesApi.updateAddress.mockResolvedValue({ data: sampleAddresses[0] })
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0])

    const nameInput = await screen.findByLabelText('Tên người nhận')
    await waitFor(() => expect(nameInput).toHaveValue('Bao Le'))

    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Bao Le Updated')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(addressesApi.updateAddress).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ recipient_name: 'Bao Le Updated' }),
      ),
    )
  })

  it('searches without accents and selects an administrative unit with the keyboard', async () => {
    renderPage()
    await screen.findByText('Bao Le · 0900000000')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))

    const province = screen.getByRole('combobox', { name: 'Tỉnh/Thành phố' })
    await userEvent.type(province, 'ha noi')
    expect(await screen.findByRole('option', { name: 'Thành phố Hà Nội' })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')

    expect(province).toHaveValue('Thành phố Hà Nội')
    const ward = screen.getByRole('combobox', { name: 'Phường/Xã/Thị trấn' })
    expect(ward).toBeEnabled()

    await userEvent.type(ward, 'p')
    expect(screen.getByText('Nhập ít nhất 2 ký tự của tên địa phương.')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()

    await userEvent.clear(ward)
    await userEvent.type(ward, 'ba dinh')
    expect(await screen.findByRole('option', { name: 'Phường Ba Đình' })).toBeInTheDocument()
  })

  it('deletes an address after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    addressesApi.deleteAddress.mockResolvedValue({})
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa' })[0])

    await waitFor(() => expect(addressesApi.deleteAddress).toHaveBeenCalledWith(1))
  })

  it('sets a non-default address as the default', async () => {
    addressesApi.setDefaultAddress.mockResolvedValue({ data: { ...sampleAddresses[1], is_default: true } })
    renderPage()
    await screen.findByText('Mai Nguyen · 0911111111')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt làm mặc định' }))

    await waitFor(() => expect(addressesApi.setDefaultAddress).toHaveBeenCalledWith(2))
  })

  it('keeps the address modal open with a friendly form-level message + retained values on a network error', async () => {
    addressesApi.createAddress.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))
    await userEvent.type(screen.getByLabelText('Tên người nhận'), 'Tan Pham')
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0922222222')
    await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '789 Đường C')
    await chooseRegion('Tỉnh/Thành phố', 'ha noi', 'Thành phố Hà Nội')
    await chooseRegion('Phường/Xã/Thị trấn', 'ba dinh', 'Phường Ba Đình')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Đã có lỗi kết nối mạng. Vui lòng thử lại.')
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tên người nhận')).toHaveValue('Tan Pham')
    expect(screen.getByLabelText('Số nhà, tên đường')).toHaveValue('789 Đường C')
  })

  it('maps a 422 validation error to the offending field within the modal', async () => {
    addressesApi.createAddress.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { phone: ['Số điện thoại không hợp lệ.'] } }, 422),
    )
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))
    await userEvent.type(screen.getByLabelText('Tên người nhận'), 'Tan Pham')
    await userEvent.type(screen.getByLabelText('Số điện thoại'), 'abc')
    await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '789 Đường C')
    await chooseRegion('Tỉnh/Thành phố', 'ha noi', 'Thành phố Hà Nội')
    await chooseRegion('Phường/Xã/Thị trấn', 'ba dinh', 'Phường Ba Đình')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))

    expect(await screen.findByText('Số điện thoại không hợp lệ.')).toBeInTheDocument()
    expect(screen.getByLabelText('Số điện thoại')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows pending copy and blocks a duplicate submit while creating an address', async () => {
    let resolveCreate
    addressesApi.createAddress.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))
    await userEvent.type(screen.getByLabelText('Tên người nhận'), 'Tan Pham')
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0922222222')
    await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '789 Đường C')
    await chooseRegion('Tỉnh/Thành phố', 'ha noi', 'Thành phố Hà Nội')
    await chooseRegion('Phường/Xã/Thị trấn', 'ba dinh', 'Phường Ba Đình')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))

    const pendingButton = await screen.findByRole('button', { name: 'Đang thêm…' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(addressesApi.createAddress).toHaveBeenCalledTimes(1)

    resolveCreate({ data: { ...sampleAddresses[0], id: 3 } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
