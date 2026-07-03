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
      screen.getByRole('heading', { name: 'Không gian sống mang hơi thở của bạn.', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sản phẩm bán chạy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Khám phá theo không gian' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem Lookbook' })).toBeInTheDocument()
    expect(await screen.findByText('Ghế sofa da')).toBeInTheDocument()
  })

  it('shows an empty state in best sellers when there are no products', async () => {
    catalogApi.getBestSellers.mockResolvedValue({ data: [] })

    renderPage()

    expect(await screen.findByText('Chưa có sản phẩm.')).toBeInTheDocument()
  })
})
