import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CartDrawer } from './CartDrawer'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import * as cartApi from '../../features/cart/api'

vi.mock('../../features/cart/api')

function renderDrawer() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartDrawer />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ isCartOpen: true })
  })

  it('shows a login prompt for guests', () => {
    useAuthStore.setState({ token: null, user: null })
    renderDrawer()

    expect(screen.getByText(/đăng nhập/)).toBeInTheDocument()
  })

  it('renders cart items and closes via the close button', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.getCart.mockResolvedValue({
      data: {
        id: 1,
        items: [
          {
            id: 10,
            variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu' },
            quantity: 2,
            unit_price_snapshot: 5000000,
            subtotal: 10000000,
          },
        ],
        total: 10000000,
      },
    })
    renderDrawer()

    expect(await screen.findByText('Nâu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(useUiStore.getState().isCartOpen).toBe(false)
  })

  it('shows an empty cart message when there are no items', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    renderDrawer()

    expect(await screen.findByText('Giỏ hàng trống.')).toBeInTheDocument()
  })
})
