import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BecomingStates } from './BecomingStates'
import { becomingSteps } from '../../data/home'

describe('BecomingStates', () => {
  it('renders the section heading and all three becoming steps in order', () => {
    render(<BecomingStates />)

    expect(screen.getByRole('heading', { name: 'Thấy trước khi quyết định' })).toBeInTheDocument()

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(becomingSteps.map((s) => s.title))
  })

  it('shows a real Room Planner capture for every step', () => {
    render(<BecomingStates />)

    const captures = screen.getAllByRole('img')
    expect(captures).toHaveLength(becomingSteps.length)
    captures.forEach((capture, index) => {
      expect(capture).toHaveAttribute('src', becomingSteps[index].image)
      expect(capture).toHaveAccessibleName(becomingSteps[index].imageAlt)
    })
  })
})
