import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandPromise } from './BrandPromise'
import { brandPromise } from '../../data/home'

describe('BrandPromise', () => {
  it('states the manifesto promise (no product, no CTA)', () => {
    render(<BrandPromise />)
    expect(screen.getByText(brandPromise.lead)).toBeInTheDocument()
    expect(screen.getByText(brandPromise.body)).toBeInTheDocument()
    // A manifesto breath — it must not become a sales CTA.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
