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
    [ReturnsPage, 'Đổi trả và hủy đơn'],
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
    expect(screen.getByText(/trước khi đơn chuyển sang trạng thái đang giao/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem đơn hàng của tôi' })).toHaveAttribute('href', '/orders')
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
