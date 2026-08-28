import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SectionHeading } from './SectionHeading'
import { PlannerInvite } from './PlannerInvite'
import { plannerInvite } from '../../data/home'

vi.mock('../Reveal', () => ({
  Reveal: ({ children, className = '' }) => <div className={className}>{children}</div>,
}))

describe('home responsive headings', () => {
  it('balances shared section titles instead of leaving an orphaned final word', () => {
    render(<SectionHeading title="Những thiết kế đáng để bắt đầu" />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveClass(
      '[text-wrap:balance]',
      '[overflow-wrap:anywhere]',
    )
  })

  it('balances the planner invitation inside a shrink-safe column', () => {
    render(
      <MemoryRouter>
        <PlannerInvite />
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { name: plannerInvite.title, level: 2 })
    expect(heading).toHaveClass('[text-wrap:balance]', '[overflow-wrap:anywhere]')
    expect(heading.parentElement).toHaveClass('min-w-0', 'max-w-2xl')
    expect(heading.parentElement.parentElement).toHaveClass(
      'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
    )
  })
})
