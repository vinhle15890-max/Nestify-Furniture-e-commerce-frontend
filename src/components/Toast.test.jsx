import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from './Toast'
import { useToastStore } from '../store/toastStore'

describe('Toaster', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('renders a toast added to the store', async () => {
    render(<Toaster />)

    act(() => {
      useToastStore.getState().addToast({ title: 'Đã thêm vào giỏ', description: 'Sản phẩm đã được thêm.' })
    })

    expect(await screen.findByText('Đã thêm vào giỏ')).toBeInTheDocument()
    expect(screen.getByText('Sản phẩm đã được thêm.')).toBeInTheDocument()
  })

  it('removes the toast from the store when the close button is clicked', async () => {
    render(<Toaster />)

    act(() => {
      useToastStore.getState().addToast({ title: 'Đã xóa khỏi giỏ' })
    })
    await screen.findByText('Đã xóa khỏi giỏ')

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(0))
  })
})
