import { describe, expect, it } from 'vitest'
import { PRODUCTION_SITE_URL, resolveSeoSite } from './seo-site.mjs'

describe('resolveSeoSite', () => {
  it('never derives the public canonical origin from the production API origin', () => {
    expect(resolveSeoSite(undefined, 'https://api.nestify.asia/api')).toBe(PRODUCTION_SITE_URL)
  })

  it('uses the explicitly configured site origin and removes path fragments', () => {
    expect(resolveSeoSite('https://shop.example.com/path', 'https://api.example.com/api')).toBe('https://shop.example.com')
  })

  it('keeps local prerender builds local', () => {
    expect(resolveSeoSite(undefined, 'http://localhost:8000/api')).toBe('http://localhost:8000')
  })
})
