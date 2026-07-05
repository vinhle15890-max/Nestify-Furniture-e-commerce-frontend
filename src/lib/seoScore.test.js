import { describe, it, expect } from 'vitest'
import { computeSeoScore } from './seoScore'

const idealDescription =
  '<p>Sofa da bò Ý sang trọng cho phòng khách.</p><h2>Đặc điểm</h2><ul><li>Khung gỗ sồi</li></ul>'

function statusOf(result, id) {
  return result.checks.find((c) => c.id === id)?.status
}

describe('computeSeoScore', () => {
  it('gives a perfect score when every signal is ideal', () => {
    const result = computeSeoScore({
      metaTitle: 'Sofa da bò Ý cao cấp chính hãng '.padEnd(55, 'x'), // 55 chars, has keyword
      metaDescription: 'Mua sofa da bò Ý chính hãng, bảo hành 5 năm. '.padEnd(150, 'x'), // 150 chars, has keyword
      description: idealDescription,
      focusKeyword: 'sofa da',
    })

    expect(result.score).toBe(100)
    expect(result.checks.every((c) => c.status === 'pass')).toBe(true)
  })

  it('warns (not fails) on keyword checks when no focus keyword is set', () => {
    const result = computeSeoScore({
      metaTitle: 'Sofa da bò Ý cao cấp chính hãng '.padEnd(55, 'x'),
      metaDescription: 'Mua sofa da bò Ý chính hãng, bảo hành 5 năm. '.padEnd(150, 'x'),
      description: idealDescription,
      focusKeyword: '',
    })

    expect(statusOf(result, 'keyword_in_title')).toBe('warn')
    expect(statusOf(result, 'keyword_in_meta')).toBe('warn')
    expect(statusOf(result, 'keyword_in_intro')).toBe('warn')
    expect(result.score).toBeLessThan(100)
  })

  it('fails keyword checks when the keyword is set but absent from the fields', () => {
    const result = computeSeoScore({
      metaTitle: 'Kệ tivi gỗ sồi Bắc Âu tối giản '.padEnd(55, 'x'),
      metaDescription: 'Kệ tivi gỗ sồi tự nhiên bền đẹp cho phòng khách. '.padEnd(150, 'x'),
      description: '<p>Kệ tivi gỗ sồi.</p><h2>x</h2><ul><li>y</li></ul>',
      focusKeyword: 'sofa da',
    })

    expect(statusOf(result, 'keyword_in_title')).toBe('fail')
    expect(statusOf(result, 'keyword_in_meta')).toBe('fail')
    expect(statusOf(result, 'keyword_in_intro')).toBe('fail')
  })

  it('flags out-of-range lengths and missing structure', () => {
    const result = computeSeoScore({
      metaTitle: 'Ngắn',
      metaDescription: 'Quá ngắn',
      description: '<p>Chỉ một đoạn.</p>',
      focusKeyword: 'sofa',
    })

    expect(statusOf(result, 'title_length')).toBe('fail')
    expect(statusOf(result, 'meta_length')).toBe('fail')
    expect(statusOf(result, 'structure')).toBe('fail')
  })

  it('gives partial credit (warn) for near-ideal lengths and partial structure', () => {
    const result = computeSeoScore({
      metaTitle: 'Sofa da bò'.padEnd(40, 'x'), // 40 → warn band 30–70
      metaDescription: 'Sofa da bò Ý'.padEnd(120, 'x'), // 120 → warn band 100–180
      description: '<p>Sofa da bò Ý.</p><h2>Đặc điểm</h2>', // h2 only → warn
      focusKeyword: 'sofa da',
    })

    expect(statusOf(result, 'title_length')).toBe('warn')
    expect(statusOf(result, 'meta_length')).toBe('warn')
    expect(statusOf(result, 'structure')).toBe('warn')
  })

  it('handles empty input without throwing', () => {
    const result = computeSeoScore()
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.checks).toHaveLength(6)
  })
})
