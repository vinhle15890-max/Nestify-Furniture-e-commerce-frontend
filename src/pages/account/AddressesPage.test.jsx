import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AddressesPage } from './AddressesPage'
import * as addressesApi from '../../features/addresses/api'

vi.mock('../../features/addresses/api')

const sampleAddresses = [
  {
    id: 1,
    recipient_name: 'Bao Le',
    phone: '0900000000',
    address_line1: '123 Đường A',
    address_line2: null,
    city: 'Hồ Chí Minh',
    province: 'Hồ Chí Minh',
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

  it('creates a new address from the modal form', async () => {
    addressesApi.createAddress.mockResolvedValue({ data: { ...sampleAddresses[0], id: 3 } })
    renderPage()
    await screen.findByText('Bao Le · 0900000000')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ mới' }))

    await userEvent.type(screen.getByLabelText('Tên người nhận'), 'Tan Pham')
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0922222222')
    await userEvent.type(screen.getByLabelText('Địa chỉ'), '789 Đường C')
    await userEvent.type(screen.getByLabelText('Thành phố'), 'Đà Nẵng')
    await userEvent.type(screen.getByLabelText('Tỉnh/Thành'), 'Đà Nẵng')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))

    await waitFor(() =>
      expect(addressesApi.createAddress).toHaveBeenCalledWith({
        recipient_name: 'Tan Pham',
        phone: '0922222222',
        address_line1: '789 Đường C',
        address_line2: '',
        city: 'Đà Nẵng',
        province: 'Đà Nẵng',
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

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
