import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonalizedGreeting } from './PersonalizedGreeting'

describe('PersonalizedGreeting', () => {
  it('greets the user by name', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory={false} />)
    expect(screen.getByText(/Chào mừng trở lại, Bảo/)).toBeInTheDocument()
  })

  it('shows the explore-more line when there is history', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory />)
    expect(screen.getByText(/Tiếp tục khám phá/)).toBeInTheDocument()
  })

  it('shows the get-started line when there is no history', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory={false} />)
    expect(screen.getByText(/Bắt đầu khám phá/)).toBeInTheDocument()
  })
})
