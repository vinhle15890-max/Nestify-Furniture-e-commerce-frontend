import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DiscoverProductUnit } from './DiscoverProductUnit'

const products = [
  {
    id: 1,
    slug: 'ghe-lounge',
    name: 'Ghế lounge',
    base_price: 3200000,
    thumbnail: 'https://example.com/lounge.jpg',
  },
  {
    id: 2,
    slug: 'ghe-banh',
    name: 'Ghế bành',
    base_price: 2800000,
    thumbnail: 'https://example.com/armchair.jpg',
  },
]

function Harness() {
  const [heldId, setHeldId] = useState(null)

  return (
    <div>
      {products.map((product) => (
        <DiscoverProductUnit
          key={product.id}
          product={product}
          held={heldId === product.id}
          fieldHasHeld={heldId != null}
          onHold={() => setHeldId(product.id)}
          onRelease={() => setHeldId((current) => (current === product.id ? null : current))}
          onToggle={() => setHeldId((current) => (current === product.id ? null : product.id))}
        />
      ))}
    </div>
  )
}

function renderHarness() {
  return render(<Harness />, { wrapper: MemoryRouter })
}

describe('DiscoverProductUnit', () => {
  it('does not privilege a product at rest and exposes one Product Detail link', () => {
    renderHarness()

    const units = screen.getAllByTestId('discover-product-unit')
    units.forEach((unit) => expect(unit).toHaveAttribute('data-held', 'false'))
    expect(within(units[0]).getAllByRole('link')).toHaveLength(1)
    expect(within(units[0]).getByRole('link', { name: 'Ghế lounge' })).toHaveAttribute(
      'href',
      '/p/ghe-lounge',
    )
    expect(within(units[0]).getByRole('heading', { name: 'Ghế lounge' })).toHaveStyle({
      fontFamily: 'var(--font-sans)',
    })
    expect(within(units[0]).queryByText('3.200.000 ₫')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /xem chi tiết|thêm vào giỏ|planner/i })).not.toBeInTheDocument()
  })

  it('holds on pointer hover and keeps the neighbor perceptible', async () => {
    renderHarness()
    const user = userEvent.setup()
    const [first, second] = screen.getAllByTestId('discover-product-unit')

    await user.hover(first)

    expect(first).toHaveAttribute('data-held', 'true')
    expect(second).toHaveAttribute('data-neighbor', 'true')
    expect(within(first).getByRole('heading', { name: 'Ghế lounge' })).toHaveStyle({
      fontFamily: 'var(--font-display)',
    })
    expect(within(first).getByText('3.200.000 ₫')).toBeInTheDocument()
    expect(within(second).queryByText('2.800.000 ₫')).not.toBeInTheDocument()

    await user.unhover(first)
    expect(first).toHaveAttribute('data-held', 'false')
  })

  it('uses keyboard focus to create the same held state', () => {
    renderHarness()
    const first = screen.getAllByTestId('discover-product-unit')[0]
    const mediaControl = within(first).getByRole('button', { name: 'Giữ Ghế lounge trong tầm chú ý' })

    fireEvent.focus(mediaControl)

    expect(first).toHaveAttribute('data-held', 'true')
    expect(mediaControl).toHaveAttribute('aria-pressed', 'true')
  })

  it('uses first touch activation to hold without navigating', () => {
    renderHarness()
    const first = screen.getAllByTestId('discover-product-unit')[0]
    const mediaControl = within(first).getByRole('button', { name: 'Giữ Ghế lounge trong tầm chú ý' })

    fireEvent.pointerDown(mediaControl, { pointerType: 'touch' })
    fireEvent.focus(mediaControl)
    fireEvent.click(mediaControl)

    expect(first).toHaveAttribute('data-held', 'true')
    expect(within(first).getByRole('link', { name: 'Ghế lounge' })).toHaveAttribute(
      'href',
      '/p/ghe-lounge',
    )
  })
})
