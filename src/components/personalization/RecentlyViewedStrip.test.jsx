import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentlyViewedStrip } from './RecentlyViewedStrip'
import * as hooks from '../../features/personalization/hooks'

vi.mock('../../features/personalization/hooks')

function renderStrip(props) {
  return render(
    <MemoryRouter>
      <RecentlyViewedStrip {...props} />
    </MemoryRouter>,
  )
}

describe('RecentlyViewedStrip', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders viewed products', () => {
    hooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 }] },
    })
    renderStrip()
    expect(screen.getByText('Ghế A')).toBeInTheDocument()
  })

  it('returns null when there is no history', () => {
    hooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    const { container } = renderStrip()
    expect(container).toBeEmptyDOMElement()
  })

  it('excludes the current product by slug', () => {
    hooks.useRecentlyViewed.mockReturnValue({
      data: {
        data: [
          { id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 },
          { id: 2, slug: 'ghe-b', name: 'Ghế B', base_price: 2000000 },
        ],
      },
    })
    renderStrip({ excludeSlug: 'ghe-a' })
    expect(screen.queryByText('Ghế A')).not.toBeInTheDocument()
    expect(screen.getByText('Ghế B')).toBeInTheDocument()
  })
})
