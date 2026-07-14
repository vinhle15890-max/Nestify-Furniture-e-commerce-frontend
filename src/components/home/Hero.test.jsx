import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Hero } from './Hero'
import { hero } from '../../data/home'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )
}

describe('Hero (Threshold)', () => {
  it('renders the approved open proposition and value-proposition subtitle', () => {
    renderHero()
    expect(screen.getByRole('heading', { name: hero.title, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(hero.subtitle)).toBeInTheDocument()
  })

  it('renders one static editorial spatial study with no interactive mechanic', () => {
    renderHero()
    const study = screen.getByTestId('entered-edge-study')
    expect(study).toHaveAttribute('aria-hidden', 'true')
    expect(study.querySelectorAll('button, a, input')).toHaveLength(0)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers one exploratory CTA that invites exploration, not the Planner', () => {
    renderHero()
    const cta = screen.getByRole('link', { name: new RegExp(hero.cta.label) })
    expect(cta).toHaveAttribute('href', hero.cta.to)
    // Threshold rule: the Hero must not launch or demonstrate the Room Planner.
    expect(cta.getAttribute('href')).not.toContain('room-planner')
  })
})
