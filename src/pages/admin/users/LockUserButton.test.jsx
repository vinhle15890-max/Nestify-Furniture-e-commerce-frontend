import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LockUserButton } from './LockUserButton'

const mutateAsync = vi.fn(() => Promise.resolve())
vi.mock('../../../features/admin/users/hooks', () => ({
  useUpdateUserStatus: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('../../../store/toastStore', () => ({
  useToastStore: (selector) => selector({ addToast: vi.fn() }),
}))
let currentUserId = 1
vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: currentUserId } }),
}))

describe('LockUserButton', () => {
  beforeEach(() => {
    mutateAsync.mockClear()
    currentUserId = 1
  })

  it('shows "Khóa" for an active user', () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'active' }} />)
    expect(screen.getByRole('button', { name: 'Khóa tài khoản A' })).toBeInTheDocument()
  })

  it('shows "Mở khóa" for an archived user', () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'archived' }} />)
    expect(screen.getByRole('button', { name: 'Mở khóa tài khoản A' })).toBeInTheDocument()
  })

  it('renders nothing on the current user\'s own row', () => {
    const { container } = render(
      <LockUserButton user={{ id: 1, name: 'Me', email: 'me@x.vn', status: 'active' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('confirming a lock calls the mutation with archived', async () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'active' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản A' }))
    // Wrap the confirm click in act(): handleConfirm awaits the mutation, then
    // setState (close modal / toast) settles asynchronously — flush it to keep output pristine.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khóa' }))
    })
    expect(mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'archived' })
  })

  it('calls onSuccess after a successful status change', async () => {
    const onSuccess = vi.fn()
    render(
      <LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'active' }} onSuccess={onSuccess} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản A' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khóa' }))
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
