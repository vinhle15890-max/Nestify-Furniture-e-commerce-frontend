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
    const heading = screen.getByRole('heading', { name: hero.title, level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('[text-wrap:balance]', '[overflow-wrap:anywhere]')
    expect(heading.className).toContain('text-[clamp(2.4rem,8vw,2.7rem)]')
    expect(heading.className).toContain('sm:text-[clamp(3rem,4.8vw,4.75rem)]')
    expect(screen.getByText(hero.subtitle)).toBeInTheDocument()
  })

  it('renders the approved decorative interior without the old SVG field or runtime 3D', () => {
    renderHero()

    const picture = screen.getByTestId('hero-interior')
    const image = picture.querySelector('img')

    expect(picture).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('src', '/images/home/hero-interior.png')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('width', '1536')
    expect(image).toHaveAttribute('height', '1024')
    expect(screen.queryByTestId('entered-edge-study')).not.toBeInTheDocument()
    expect(document.querySelector('[data-light-gesture]')).not.toBeInTheDocument()
    expect(document.querySelector('canvas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps the proposition before the spatial image in DOM order', () => {
    renderHero()

    const heading = screen.getByRole('heading', { name: hero.title, level: 1 })
    const picture = screen.getByTestId('hero-interior')
    expect(heading.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('offers one exploratory CTA that invites exploration, not the Planner', () => {
    renderHero()
    const cta = screen.getByRole('link', { name: new RegExp(hero.cta.label) })
    expect(cta).toHaveAttribute('href', hero.cta.to)
    // Threshold rule: the Hero must not launch or demonstrate the Room Planner.
    expect(cta.getAttribute('href')).not.toContain('room-planner')
  })
})
