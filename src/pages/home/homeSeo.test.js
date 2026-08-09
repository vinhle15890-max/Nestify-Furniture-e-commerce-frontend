import { describe, expect, it } from 'vitest'
import { createHomeJsonLd, HOME_SEO } from './homeSeo'

describe('home SEO', () => {
  it('publishes a descriptive Vietnamese search title and summary', () => {
    expect(HOME_SEO.title).toBe('Nestify — Mua nội thất và thiết kế phòng 3D trực tuyến')
    expect(HOME_SEO.description).toContain('nội thất')
    expect(HOME_SEO.description).toContain('phòng 3D')
  })

  it('describes the website and brand with absolute production URLs', () => {
    const jsonLd = createHomeJsonLd('https://www.nestify.asia')

    expect(jsonLd['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'Organization', url: 'https://www.nestify.asia/' }),
      expect.objectContaining({ '@type': 'WebSite', url: 'https://www.nestify.asia/' }),
    ]))
  })
})
