import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoomSummary } from './RoomSummary'

const item = (localId, id, name, price) => ({ localId, variant: { id, name, price } })

describe('RoomSummary', () => {
  it('renders grouped lines and a running total', () => {
    render(<RoomSummary items={[item(1, 10, 'Sofa', 5000000), item(2, 10, 'Sofa', 5000000)]} />)
    expect(screen.getByText('Sofa')).toBeInTheDocument()
    expect(screen.getByText('×2')).toBeInTheDocument()
    // Line total and grand total both 10.000.000 ₫.
    expect(screen.getAllByText('10.000.000 ₫').length).toBeGreaterThanOrEqual(2)
  })

  it('shows a dash for an unpriced line and notes the total is incomplete', () => {
    render(<RoomSummary items={[item(1, 10, 'Sofa', 5000000), item(2, 30, 'Đèn', null)]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText(/tạm tính chưa gồm/i)).toBeInTheDocument()
  })

  it('renders nothing when the room is empty', () => {
    const { container } = render(<RoomSummary items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
