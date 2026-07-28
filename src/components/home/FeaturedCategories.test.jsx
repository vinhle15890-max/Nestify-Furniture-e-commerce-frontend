import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

const cat = (id, name, slug, image_url = null, children = []) => ({
  id,
  name,
  slug,
  image_url,
  children,
})

describe('FeaturedCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders every parent and its preview child categories as catalog links', () => {
    useCategories.mockReturnValue({
      data: {
        data: [
          cat(1, 'Phòng khách', 'phong-khach', 'https://img/living.jpg', [
            cat(11, 'Sofa', 'sofa'),
            cat(12, 'Bàn trà', 'ban-tra'),
          ]),
          cat(2, 'Phòng ăn', 'phong-an', null, [cat(21, 'Bàn ăn', 'ban-an')]),
        ],
      },
    })
    renderCats()

    expect(
      screen.getByRole('heading', { name: 'Bắt đầu từ căn phòng bạn đang nghĩ tới' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Toàn bộ danh mục sản phẩm' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Phòng khách/ })).toHaveAttribute('href', '/c/phong-khach')
    expect(screen.getByRole('link', { name: 'Sofa' })).toHaveAttribute('href', '/c/sofa')
    expect(screen.getByRole('link', { name: 'Bàn trà' })).toHaveAttribute('href', '/c/ban-tra')
    expect(screen.getByRole('link', { name: /Phòng ăn/ })).toHaveAttribute('href', '/c/phong-an')
    expect(screen.getByRole('link', { name: 'Bàn ăn' })).toHaveAttribute('href', '/c/ban-an')

    const livingChildren = screen.getByRole('list', { name: 'Danh mục con của Phòng khách' })
    expect(within(livingChildren).getAllByRole('link')).toHaveLength(2)
  })

  it('keeps long child lists compact and lets customers reveal every category', async () => {
    const user = userEvent.setup()
    const children = Array.from({ length: 10 }, (_, index) =>
      cat(index + 10, `Danh mục con ${index + 1}`, `danh-muc-con-${index + 1}`),
    )
    useCategories.mockReturnValue({
      data: { data: [cat(1, 'Phòng khách', 'phong-khach', null, children)] },
    })
    renderCats()

    expect(screen.getByText('10 loại nội thất')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Danh mục con 4' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Danh mục con 5' })).not.toBeInTheDocument()

    const revealButton = screen.getByRole('button', { name: 'Xem thêm 6 danh mục' })
    expect(revealButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(revealButton)

    expect(screen.getByRole('link', { name: 'Danh mục con 10' })).toHaveAttribute(
      'href',
      '/c/danh-muc-con-10',
    )
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Thu gọn' }))
    expect(screen.queryByRole('link', { name: 'Danh mục con 10' })).not.toBeInTheDocument()
  })

  it('uses a placeholder (no <img>) when a parent category has no image', () => {
    useCategories.mockReturnValue({
      data: {
        data: [
          cat(1, 'Phòng khách', 'phong-khach', 'https://img/living.jpg'),
          cat(2, 'Phòng ăn', 'phong-an'),
        ],
      },
    })
    renderCats()

    expect(screen.getByRole('img', { name: 'Phòng khách' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Phòng ăn' })).not.toBeInTheDocument()
    expect(screen.getByText('Phòng ăn')).toBeInTheDocument()
  })

  it('keeps a parent with no children as a valid standalone category', () => {
    useCategories.mockReturnValue({ data: { data: [cat(1, 'Trang trí', 'trang-tri')] } })
    renderCats()

    expect(screen.getByRole('link', { name: /Trang trí/ })).toHaveAttribute('href', '/c/trang-tri')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('uses previous and next controls when there are more than three parent categories', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 5 }, (_, index) =>
      cat(index + 1, `Phòng ${index + 1}`, `phong-${index + 1}`),
    )
    useCategories.mockReturnValue({ data: { data: items } })
    renderCats()

    expect(screen.getByText('5 không gian để khám phá')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem danh mục trước' })).toBeDisabled()
    const nextButton = screen.getByRole('button', { name: 'Xem danh mục tiếp theo' })
    expect(nextButton).toBeInTheDocument()

    // jsdom has no layout or native scrolling, but the control remains safe to use.
    await user.click(nextButton)
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('keeps three parent categories in a static grid without slider controls', () => {
    useCategories.mockReturnValue({
      data: {
        data: [
          cat(1, 'Phòng khách', 'phong-khach'),
          cat(2, 'Phòng ngủ', 'phong-ngu'),
          cat(3, 'Phòng ăn', 'phong-an'),
        ],
      },
    })
    renderCats()

    expect(screen.queryByRole('button', { name: /Xem danh mục/ })).not.toBeInTheDocument()
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
