import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlannerInvite } from './PlannerInvite'
import { plannerInvite } from '../../data/home'

describe('PlannerInvite', () => {
  it('names the Planner as the destination with a CTA that links to it', () => {
    render(
      <MemoryRouter>
        <PlannerInvite />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: plannerInvite.title })).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: new RegExp(plannerInvite.cta.label) })
    expect(cta).toHaveAttribute('href', '/room-planner')
  })
})
