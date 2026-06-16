import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './HomePage'
import * as catalogApi from '../../features/catalog/api'

vi.mock('../../features/catalog/api')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hero and the featured/newest product sections', async () => {
    catalogApi.getProducts.mockResolvedValue({
      data: [
        {
          id: 1,
          slug: 'ghe-sofa-da',
          name: 'Ghế sofa da',
          base_price: 5990000,
          thumbnail: null,
          category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
        },
      ],
      meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sản phẩm nổi bật' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sản phẩm mới' })).toBeInTheDocument()
    expect(await screen.findAllByText('Ghế sofa da')).toHaveLength(2)
  })

  it('shows an empty state when there are no products', async () => {
    catalogApi.getProducts.mockResolvedValue({
      data: [],
      meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
    })

    renderPage()

    expect(await screen.findAllByText('Chưa có sản phẩm.')).toHaveLength(2)
  })
})
