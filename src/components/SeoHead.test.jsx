import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SeoHead } from './SeoHead'

it('publishes canonical, robots and social metadata', () => {
  const { unmount } = render(<SeoHead title="Sofa | Nestify" description="Mô tả" canonicalPath="/p/sofa" noindex />)
  expect(document.title).toBe('Sofa | Nestify')
  expect(new URL(document.querySelector('link[rel="canonical"]').href).pathname).toBe('/p/sofa')
  expect(document.querySelector('meta[name="robots"]')?.content).toBe('noindex,follow')
  expect(document.querySelector('meta[property="og:title"]')?.content).toBe('Sofa | Nestify')
  unmount()
  expect(document.querySelector('[data-nestify-head]')).toBeNull()
})
