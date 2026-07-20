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
    // FeaturedCategories pulls real categories; give every case a default.
    catalogApi.getCategories.mockResolvedValue({
      data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', image_url: null }],
    })
  })

  it('renders the hero headline and key editorial sections', async () => {
    catalogApi.getBestSellers.mockResolvedValue({
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
    })

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Điều gì có thể bắt đầu ở đây?', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Một trường sản phẩm được chọn lọc' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bắt đầu từ căn phòng bạn đang nghĩ tới' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
    // Threshold permits one exploratory route alongside scrolling. The old
    // Lookbook-specific CTA remains absent.
    expect(screen.queryByRole('link', { name: 'Xem Lookbook' })).not.toBeInTheDocument()
    expect(await screen.findByText('Ghế sofa da')).toBeInTheDocument()
  })

  it('shows an empty state in best sellers when there are no products', async () => {
    catalogApi.getBestSellers.mockResolvedValue({ data: [] })

    renderPage()

    expect(await screen.findByText('Chưa có sản phẩm.')).toBeInTheDocument()
  })
})
