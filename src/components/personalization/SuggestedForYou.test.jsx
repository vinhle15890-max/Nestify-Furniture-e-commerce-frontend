import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuggestedForYou } from './SuggestedForYou'
import * as personalizationHooks from '../../features/personalization/hooks'
import * as catalogHooks from '../../features/catalog/hooks'

vi.mock('../../features/personalization/hooks')
vi.mock('../../features/catalog/hooks')

function renderSuggest() {
  return render(
    <MemoryRouter>
      <SuggestedForYou />
    </MemoryRouter>,
  )
}

describe('SuggestedForYou', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when there is no view history', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    catalogHooks.useInfiniteProducts.mockReturnValue({ data: undefined })
    const { container } = renderSuggest()
    expect(container).toBeEmptyDOMElement()
  })

  it('suggests products from the top category, excluding already-viewed', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', category: { slug: 'ghe' } }] },
    })
    catalogHooks.useInfiniteProducts.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 },
              { id: 2, slug: 'ghe-b', name: 'Ghế B', base_price: 2000000 },
            ],
          },
        ],
      },
    })
    renderSuggest()
    expect(screen.getByText('Ghế B')).toBeInTheDocument()
    expect(screen.queryByText('Ghế A')).not.toBeInTheDocument()
  })

  it('returns null when no suggestions remain after exclusion', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', category: { slug: 'ghe' } }] },
    })
    catalogHooks.useInfiniteProducts.mockReturnValue({
      data: { pages: [{ data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 }] }] },
    })
    const { container } = renderSuggest()
    expect(container).toBeEmptyDOMElement()
  })
})
