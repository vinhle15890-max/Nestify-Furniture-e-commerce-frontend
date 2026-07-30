import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Button, ButtonLink } from './Button'
import { Input } from './Input'
import { Card } from './Card'
import { Badge } from './Badge'
import { Spinner } from './Spinner'

describe('Button', () => {
  it('renders children and responds to clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Mua ngay</Button>)

    const button = screen.getByRole('button', { name: 'Mua ngay' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies the primary variant by default', () => {
    render(<Button>Mua ngay</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-12', 'bg-primary')
  })

  it('can be disabled', () => {
    render(<Button disabled>Mua ngay</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('gives links the same variants and geometry as buttons', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/c/all" variant="secondary">Xem sản phẩm</ButtonLink>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Xem sản phẩm' })).toHaveClass(
      'min-h-12',
      'rounded-control',
      'border',
    )
  })
})

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input id="email" label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows an error message and marks the field invalid', () => {
    render(<Input id="email" label="Email" error="Email không hợp lệ" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Email không hợp lệ')
  })
})

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Nội dung</Card>)
    expect(screen.getByText('Nội dung')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders the sale (in-progress) tone as an emerging outline', () => {
    render(<Badge tone="sale">Sale</Badge>)
    expect(screen.getByText('Sale')).toHaveClass('border-emerging')
  })

  it('renders the in-stock (done) tone as a solid ink fill', () => {
    render(<Badge tone="in-stock">Done</Badge>)
    expect(screen.getByText('Done')).toHaveClass('bg-foreground')
  })
})

describe('Spinner', () => {
  it('exposes a status role with an accessible label', () => {
    render(<Spinner label="Đang tải sản phẩm..." />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Đang tải sản phẩm...')).toBeInTheDocument()
  })
})
