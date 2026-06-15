import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CategoryNav } from './CategoryNav'
import * as catalogApi from '../../features/catalog/api'

vi.mock('../../features/catalog/api')

function renderNav() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CategoryNav />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CategoryNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing while there are no categories', async () => {
    catalogApi.getCategories.mockResolvedValue({ data: [] })

    renderNav()

    expect(screen.queryByRole('navigation', { name: 'Danh mục sản phẩm' })).not.toBeInTheDocument()
  })

  it('renders top-level categories and a dropdown for their children', async () => {
    catalogApi.getCategories.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Phòng khách',
          slug: 'phong-khach',
          children: [{ id: 2, name: 'Ghế sofa', slug: 'ghe-sofa', children: [] }],
        },
        { id: 3, name: 'Phòng ngủ', slug: 'phong-ngu', children: [] },
      ],
    })

    renderNav()

    expect(await screen.findByRole('link', { name: 'Phòng khách' })).toHaveAttribute('href', '/c/phong-khach')
    expect(screen.getByRole('link', { name: 'Ghế sofa' })).toHaveAttribute('href', '/c/ghe-sofa')
    expect(screen.getByRole('link', { name: 'Phòng ngủ' })).toHaveAttribute('href', '/c/phong-ngu')
  })
})
