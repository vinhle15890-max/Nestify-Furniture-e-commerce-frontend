import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SharedRoomItems } from './SharedRoomItems'

const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/room-planner/shared/tok' }),
}))

const mutateAsync = vi.fn(() => Promise.resolve())
vi.mock('../../features/cart/hooks', () => ({ useAddCartItem: () => ({ mutateAsync }) }))

let token = null
vi.mock('../../store/authStore', () => ({ useAuthStore: (sel) => sel({ token }) }))
const addToast = vi.fn()
vi.mock('../../store/toastStore', () => ({ useToastStore: (sel) => sel({ addToast }) }))

const items = [
  { variant: { id: 1, name: 'Đỏ', price: 100, product_slug: 'ghe', product_name: 'Ghế' } },
  { variant: { id: 2, name: 'Xanh', price: 200, product_slug: 'ban', product_name: 'Bàn' } },
]
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('SharedRoomItems', () => {
  beforeEach(() => {
    navigate.mockClear()
    mutateAsync.mockClear()
    addToast.mockClear()
    token = null
  })

  it('liệt kê SP có link /p/{slug}', () => {
    wrap(<SharedRoomItems items={items} />)
    expect(screen.getByRole('link', { name: /Ghế/ })).toHaveAttribute('href', '/p/ghe')
  })

  it('guest bấm thêm → điều hướng /login giữ from', async () => {
    wrap(<SharedRoomItems items={items} />)
    await userEvent.click(screen.getByRole('button', { name: /thêm cả phòng/i }))
    expect(navigate).toHaveBeenCalledWith('/login', { state: { from: { pathname: '/room-planner/shared/tok' } } })
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('đã đăng nhập → thêm từng dòng rồi hiện link giỏ', async () => {
    token = 'abc'
    wrap(<SharedRoomItems items={items} />)
    await userEvent.click(screen.getByRole('button', { name: /thêm cả phòng/i }))
    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('link', { name: /xem giỏ/i })).toHaveAttribute('href', '/cart')
  })
})
