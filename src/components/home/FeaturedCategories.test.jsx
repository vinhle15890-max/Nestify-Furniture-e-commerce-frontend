import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FeaturedCategories } from './FeaturedCategories'
import { useCategories } from '../../features/catalog/hooks'

vi.mock('../../features/catalog/hooks')

function renderCats() {
  return render(
    <MemoryRouter>
      <FeaturedCategories />
    </MemoryRouter>,
  )
}

const cat = (id, name, slug, image_url = null) => ({ id, name, slug, image_url })

describe('FeaturedCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders real categories as links to /c/{slug}', () => {
    useCategories.mockReturnValue({
      data: { data: [cat(1, 'Sofa', 'sofa', 'https://img/sofa.jpg'), cat(2, 'Bàn ăn', 'ban-an')] },
    })
    renderCats()

    expect(screen.getByRole('heading', { name: 'Bắt đầu từ căn phòng bạn đang nghĩ tới' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sofa/ })).toHaveAttribute('href', '/c/sofa')
    expect(screen.getByRole('link', { name: /Bàn ăn/ })).toHaveAttribute('href', '/c/ban-an')
  })

  it('uses a placeholder (no <img>) when a category has no image', () => {
    useCategories.mockReturnValue({
      data: { data: [cat(1, 'Sofa', 'sofa', 'https://img/sofa.jpg'), cat(2, 'Bàn ăn', 'ban-an')] },
    })
    renderCats()

    // Sofa has an image; Bàn ăn falls back to the placeholder tile.
    expect(screen.getByRole('img', { name: 'Sofa' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Bàn ăn' })).not.toBeInTheDocument()
    expect(screen.getByText('Bàn ăn')).toBeInTheDocument()
  })

  it('shows no slider controls with 4 or fewer categories', () => {
    useCategories.mockReturnValue({
      data: { data: [cat(1, 'A', 'a'), cat(2, 'B', 'b'), cat(3, 'C', 'c'), cat(4, 'D', 'd')] },
    })
    renderCats()

    expect(screen.queryByRole('button', { name: /Xem danh mục/ })).not.toBeInTheDocument()
  })

  it('renders prev/next slider controls when there are more than 4 categories', async () => {
    const items = Array.from({ length: 6 }, (_, i) => cat(i + 1, `Danh mục ${i + 1}`, `dm-${i + 1}`))
    useCategories.mockReturnValue({ data: { data: items } })
    renderCats()

    expect(screen.getAllByRole('link')).toHaveLength(6)
    const next = screen.getByRole('button', { name: 'Xem danh mục tiếp theo' })
    expect(next).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem danh mục trước' })).toBeInTheDocument()

    // Clicking is safe even though jsdom has no real scrolling.
    await userEvent.click(next)
  })

  it('renders nothing on error (Failure Behavior — section drops out)', () => {
    useCategories.mockReturnValue({ isError: true })
    const { container } = renderCats()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the catalog is empty', () => {
    useCategories.mockReturnValue({ data: { data: [] } })
    const { container } = renderCats()
    expect(container).toBeEmptyDOMElement()
  })
})
