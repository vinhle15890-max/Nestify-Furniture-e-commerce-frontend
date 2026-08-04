import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('reveals and hides the password with an accessible toggle', async () => {
    const user = userEvent.setup()
    render(<PasswordInput id="password" label="Mật khẩu" guidance="Ít nhất 10 ký tự." />)
    const input = screen.getByLabelText('Mật khẩu')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAccessibleDescription('Ít nhất 10 ký tự.')

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('replaces guidance with an error and reserves one stable message slot', () => {
    const { container } = render(
      <PasswordInput id="password" label="Mật khẩu" guidance="Ít nhất 10 ký tự." error="Mật khẩu chưa hợp lệ." reserveMessageSpace />,
    )

    expect(screen.queryByText('Ít nhất 10 ký tự.')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu chưa hợp lệ.')
    expect(container.querySelectorAll('[data-message-slot="true"]')).toHaveLength(1)
  })
})
