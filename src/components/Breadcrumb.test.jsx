import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'

function renderCrumb(items, props) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} {...props} />
    </MemoryRouter>,
  )
}

const short = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Phòng khách', to: '/c/phong-khach' },
  { label: 'Ghế Sofa Da' },
]

afterEach(cleanup)

describe('Breadcrumb', () => {
  it('không render khi chỉ có 1 mục', () => {
    const { container } = renderCrumb([{ label: 'Trang chủ', to: '/' }])
    expect(container.querySelector('nav')).toBeNull()
  })

  it('mục giữa là link, mục cuối là trang hiện tại (aria-current)', () => {
    renderCrumb(short)
    expect(screen.getByRole('link', { name: 'Phòng khách' })).toHaveAttribute('href', '/c/phong-khach')
    const current = screen.getByText('Ghế Sofa Da')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.closest('a')).toBeNull()
  })

  it('gập mục giữa khi vượt maxItems và mở lại khi bấm …', async () => {
    const long = [
      { label: 'Trang chủ', to: '/' },
      { label: 'Phòng khách', to: '/c/phong-khach' },
      { label: 'Sofa', to: '/c/sofa' },
      { label: 'Sofa góc', to: '/c/sofa-goc' },
      { label: 'Ghế Sofa Da' },
    ]
    renderCrumb(long, { maxItems: 4 })
    // bị gập: 'Sofa' (mục giữa) chưa hiển thị
    expect(screen.queryByRole('link', { name: 'Sofa' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Hiện đầy đủ đường dẫn' }))
    expect(screen.getByRole('link', { name: 'Sofa' })).toBeInTheDocument()
  })

  it('phát JSON-LD BreadcrumbList đầy đủ các mục', () => {
    renderCrumb(short)
    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script.textContent)
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement).toHaveLength(3)
    expect(data.itemListElement[0]).toMatchObject({ position: 1, name: 'Trang chủ' })
  })
})
