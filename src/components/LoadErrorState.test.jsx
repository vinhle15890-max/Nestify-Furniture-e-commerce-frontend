import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadErrorState } from './LoadErrorState'

describe('LoadErrorState', () => {
  it('announces the failure and retries once', async () => {
    const onRetry = vi.fn()

    render(
      <LoadErrorState
        title="Chưa thể tải giỏ hàng"
        description="Dữ liệu giỏ hàng chưa tải được."
        onRetry={onRetry}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Chưa thể tải giỏ hàng')
    expect(alert).toHaveTextContent('Dữ liệu giỏ hàng chưa tải được.')

    const retry = screen.getByRole('button', { name: 'Thử lại' })
    expect(retry).toHaveAttribute('type', 'button')
    await userEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables retry and exposes the pending label while retrying', () => {
    render(
      <LoadErrorState
        title="Chưa thể tải dữ liệu"
        description="Hãy thử lại."
        onRetry={() => {}}
        isRetrying
        compact
      />,
    )

    expect(screen.getByRole('button', { name: 'Đang thử lại...' })).toBeDisabled()
  })

  it('uses a polite status for a background refresh failure', () => {
    render(
      <LoadErrorState
        title="Chưa cập nhật được dữ liệu mới nhất"
        description="Đang hiển thị dữ liệu đã tải trước đó."
        background
        compact
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Đang hiển thị dữ liệu đã tải trước đó.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
