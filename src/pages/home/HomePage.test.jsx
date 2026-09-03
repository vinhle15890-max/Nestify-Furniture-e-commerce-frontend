import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './HomePage'
import * as catalogApi from '../../features/catalog/api'
import { useAuthStore } from '../../store/authStore'

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
    useAuthStore.setState({ token: null, user: null })
    // FeaturedCategories pulls real categories; give every case a default.
    catalogApi.getCategories.mockResolvedValue({
      data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', image_url: null }],
    })
    catalogApi.getCollections.mockResolvedValue({ data: [] })
    catalogApi.getBestSellers.mockResolvedValue({ data: [] })
    catalogApi.getProductReviews.mockResolvedValue({ data: [] })
  })

  it('renders the hero headline and key editorial sections', async () => {
    catalogApi.getFeaturedProducts.mockResolvedValue({
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
      screen.getByRole('heading', { name: 'Điều gì phù hợp với căn phòng của bạn?', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Những thiết kế đáng để bắt đầu' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bắt đầu từ căn phòng bạn đang nghĩ tới' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
    // Threshold permits one exploratory route alongside scrolling. The old
    // Lookbook-specific CTA remains absent.
    expect(screen.queryByRole('link', { name: 'Xem Lookbook' })).not.toBeInTheDocument()
    expect(await screen.findByText('Ghế sofa da')).toBeInTheDocument()
    expect(catalogApi.getFeaturedProducts).toHaveBeenCalledWith({ limit: 8 })
    expect(catalogApi.getBestSellers).toHaveBeenCalledWith({ limit: 4 })
  })

  it('puts curated and best-selling products before the story payoff and planner invitation', async () => {
    catalogApi.getFeaturedProducts.mockResolvedValue({ data: [] })
    catalogApi.getBestSellers.mockResolvedValue({
      data: [{ id: 2, slug: 'ghe-an', name: 'Ghế ăn', base_price: 1490000, thumbnail: '/images/ghe-an.jpg' }],
    })

    const { container } = renderPage()
    await screen.findByRole('heading', { name: 'Được chọn nhiều cho tổ ấm' })

    await waitFor(() => {
      const sectionNames = [...container.querySelectorAll('section[data-home-section]')]
        .map((section) => section.getAttribute('data-home-section'))

      expect(sectionNames).toEqual([
        'hero',
        'categories',
        'products',
        'best-sellers',
        'clarity',
        'planner',
      ])
    })
  })

  it('hides best sellers when there are no delivered sales', async () => {
    catalogApi.getFeaturedProducts.mockResolvedValue({ data: [] })

    const { container } = renderPage()

    await waitFor(() => expect(catalogApi.getBestSellers).toHaveBeenCalledWith({ limit: 4 }))
    expect(container.querySelector('[data-home-section="best-sellers"]')).not.toBeInTheDocument()
  })

  it('shows verified review evidence for best-selling products', async () => {
    catalogApi.getFeaturedProducts.mockResolvedValue({ data: [] })
    catalogApi.getBestSellers.mockResolvedValue({
      data: [{ id: 2, slug: 'ghe-an', name: 'Ghế ăn', base_price: 1490000, thumbnail: '/images/ghe-an.jpg' }],
    })
    catalogApi.getProductReviews.mockResolvedValue({
      data: [{
        id: 21,
        verified_purchase: true,
        evidence: { color_accuracy: 'accurate', size_fit: 'as_expected', material_quality: 4 },
      }],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Điều người mua đã kiểm chứng' })).toBeInTheDocument()
    expect(screen.getByText('Màu sắc giống ảnh')).toBeInTheDocument()
    expect(screen.getByText('Kích thước đúng kỳ vọng')).toBeInTheDocument()
    expect(screen.getByText('Chất liệu 4/5')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Ghế ăn' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Ghế ăn/ }).some((link) => link.getAttribute('href') === '/p/ghe-an')).toBe(true)
    expect(catalogApi.getProductReviews).toHaveBeenCalledWith('ghe-an', { limit: 5 })
  })

  it('shows an empty state in best sellers when there are no products', async () => {
    catalogApi.getFeaturedProducts.mockResolvedValue({ data: [] })

    renderPage()

    expect(await screen.findByText('Chưa có sản phẩm để giới thiệu')).toBeInTheDocument()
  })
})
