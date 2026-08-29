import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  ContactPage,
  PrivacyPage,
  ReturnsPage,
  ShippingPage,
} from './SupportPages'

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )
}

describe('Support pages', () => {
  it.each([
    [ShippingPage, 'Giao hàng, rõ từ trước khi đặt'],
    [ReturnsPage, 'Hủy đơn và hỗ trợ sau bán'],
    [PrivacyPage, 'Quyền riêng tư của bạn'],
    [ContactPage, 'Liên hệ Nestify'],
  ])('renders a dedicated page with its primary heading', (Page, heading) => {
    renderPage(Page)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('does not invent a universal delivery fee or delivery window', () => {
    renderPage(ShippingPage)
    expect(screen.getByText(/thông tin giao hàng riêng của từng sản phẩm/i)).toBeInTheDocument()
    expect(screen.getByText(/chưa hiển thị phí giao hàng riêng/i)).toBeInTheDocument()
  })

  it('states the implemented order cancellation boundary', () => {
    renderPage(ReturnsPage)
    expect(screen.getByText(/Hệ thống không cho tự hủy đơn đã chuyển sang đang giao/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gọi 0945691309' })).toHaveAttribute('href', 'tel:0945691309')
  })

  it('offers direct, usable contact paths without a fake form', () => {
    renderPage(ContactPage)
    expect(screen.getByRole('link', { name: 'Gửi email cho Nestify' })).toHaveAttribute(
      'href',
      'mailto:support@nestify.vn',
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
