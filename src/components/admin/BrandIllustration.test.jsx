import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrandIllustration } from './BrandIllustration'

describe('BrandIllustration', () => {
  it('renders each motif as an svg', () => {
    for (const name of ['sofa', 'lamp', 'chair', 'package', 'search']) {
      const { container } = render(<BrandIllustration name={name} />)
      expect(container.querySelector('svg')).toBeTruthy()
    }
  })

  it('exposes role="img" and a label when standalone', () => {
    const { container } = render(<BrandIllustration name="sofa" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg.getAttribute('aria-label')).toBeTruthy()
  })

  it('is aria-hidden with no role when decorative', () => {
    const { container } = render(<BrandIllustration name="lamp" decorative />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
  })

  it('falls back safely for an unknown motif name', () => {
    const { container } = render(<BrandIllustration name="nope" />)
    expect(container.querySelector('svg path, svg rect, svg circle, svg line')).toBeTruthy()
  })

  it('passes through extra props to the svg', () => {
    const { container } = render(<BrandIllustration name="lamp" decorative data-brand-watermark />)
    expect(container.querySelector('svg')).toHaveAttribute('data-brand-watermark')
  })
})
