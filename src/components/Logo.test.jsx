import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the Nestify brand image with accessible alt text', () => {
    render(<Logo />)
    const img = screen.getByRole('img', { name: 'Nestify' })
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toBeTruthy()
  })

  it('forwards a custom className', () => {
    render(<Logo className="h-12 w-auto" />)
    expect(screen.getByRole('img', { name: 'Nestify' })).toHaveClass('h-12', 'w-auto')
  })
})
