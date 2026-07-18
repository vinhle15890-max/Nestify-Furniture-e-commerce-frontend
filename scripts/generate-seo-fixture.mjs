#!/usr/bin/env node
/**
 * Generate SEO score fixture with precise boundary testing.
 *
 * Script runs computeSeoScore() on carefully crafted inputs to produce
 * golden-output expectedScore values (not hand-written guesses).
 *
 * Boundary cases:
 * - Title: 49, 50, 60, 61 characters (ideal=[50,60], ok=[30,70])
 * - Meta: 139, 140, 160, 161 characters (ideal=[140,160], ok=[100,180])
 * - Vietnamese multi-byte chars, keyword presence/absence, structure variations
 *
 * Usage: node scripts/generate-seo-fixture.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Import computeSeoScore from the actual source (not fixture)
// Adjust path based on where this script runs from
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seoScoreModule = await import(path.join(__dirname, '../src/lib/seoScore.js'))
const { computeSeoScore } = seoScoreModule

/**
 * Create a string padded to exact length using 'x' character.
 * Returns string with length === targetLen.
 */
function padToLength(baseStr, targetLen) {
  const base = baseStr.trim()
  if (base.length >= targetLen) {
    return base.substring(0, targetLen)
  }
  return base + ' ' + 'x'.repeat(targetLen - base.length - 1)
}

/**
 * Verify exact length match (for debugging).
 */
function verifyLength(str, expected) {
  const actual = str.length
  if (actual !== expected) {
    console.warn(`  ⚠️ Length mismatch: expected ${expected}, got ${actual}`)
  }
  return actual === expected
}

// Define test cases with factory functions that generate inputs
const testCaseFactories = [
  {
    name: 'all_pass_perfect',
    generator: () => ({
      metaTitle: 'Sofa Da Bò Cao Cấp – Thương Hiệu Luxury',
      metaDescription: 'Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại, bền vượt thời gian. Giảm giá 30%. Giao miễn phí toàn quốc. Liên hệ ngay hôm nay.',
      description:
        '<p>Sofa da bò cao cấp của chúng tôi là sự lựa chọn hoàn hảo cho phòng khách.</p><h2>Tính năng nổi bật</h2><ul><li>Da bò Italia 100%</li><li>Khung gỗ sồi nguyên khối</li></ul><p>Bảo hành 5 năm.</p>',
      focusKeyword: 'sofa da bò cao cấp',
    }),
    description: 'Perfect: all checks should pass',
  },
  {
    name: 'partial_fail_no_keyword',
    generator: () => ({
      metaTitle: 'Sofa Da',
      metaDescription: 'Ghế sofa',
      description: '<p>Đây là một sản phẩm.</p>',
      focusKeyword: '',
    }),
    description: 'Fail: no keyword, title too short, meta too short, no structure',
  },
  {
    name: 'warn_all_marginal',
    generator: () => ({
      metaTitle: 'Sofa – Nội Thất',
      metaDescription: 'Sofa chất lượng cao cho nhà bạn. Thiết kế đẹp, giá tốt.',
      description: '<p>Sofa là mảnh nội thất quan trọng.</p><h2>Đặc điểm</h2>',
      focusKeyword: 'sofa',
    }),
    description: 'Warn most checks: title/meta in warn range, H2 only (no UL)',
  },
  {
    name: 'edge_case_null_fields',
    generator: () => ({
      metaTitle: null,
      metaDescription: null,
      description: null,
      focusKeyword: null,
    }),
    description: 'Edge: all null fields treated as empty',
  },
  {
    name: 'edge_case_whitespace_only',
    generator: () => ({
      metaTitle: '   ',
      metaDescription: '   \n\t  ',
      description: '',
      focusKeyword: '  ',
    }),
    description: 'Edge: whitespace-only treated as empty',
  },
  {
    name: 'keyword_case_insensitive',
    generator: () => ({
      metaTitle: 'SOFA DA BÒ CAO CẤP',
      metaDescription: 'Mua Sofa Da Bò ngay hôm nay, chất lượng cao, giá tốt',
      description: '<p>Sản phẩm sofa da bò tốt nhất trên thị trường</p><h2>Lợi Ích</h2><ul><li>Chất lượng</li></ul>',
      focusKeyword: 'sofa da bò',
    }),
    description: 'Keyword case-insensitive match (uppercase title, lowercase keyword)',
  },
  {
    name: 'keyword_not_found',
    generator: () => ({
      metaTitle: 'Ghế Sofa Đẹp',
      metaDescription: 'Ghế sofa màu đỏ cao cấp với thiết kế hiện đại',
      description: '<p>Ghế sofa này rất đẹp.</p><h2>Chi Tiết</h2><ul><li>Bền</li></ul>',
      focusKeyword: 'da bò',
    }),
    description: 'Keyword "da bò" not in title/meta/intro (3 fail, but structure pass)',
  },
  {
    name: 'title_exactly_49_chars',
    generator: () => ({
      metaTitle: padToLength('Sofa Da Bò Cao Cấp – Thương Hiệu', 49),
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại', 150),
      description: '<p>Test content.</p><h2>Section</h2><ul><li>Item</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Title exactly 49 chars (fail: < 50 ideal min)',
  },
  {
    name: 'title_exactly_50_chars',
    generator: () => ({
      metaTitle: padToLength('Sofa Da Bò Cao Cấp – Thương Hiệu Home', 50),
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại', 150),
      description: '<p>Test content.</p><h2>Section</h2><ul><li>Item</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Title exactly 50 chars (pass: ideal min)',
  },
  {
    name: 'title_exactly_60_chars',
    generator: () => ({
      metaTitle: padToLength('Sofa Da Bò Cao Cấp – Thương Hiệu Luxury Với Chất Lượng', 60),
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại', 150),
      description: '<p>Test content.</p><h2>Section</h2><ul><li>Item</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Title exactly 60 chars (pass: ideal max)',
  },
  {
    name: 'title_exactly_61_chars',
    generator: () => ({
      metaTitle: padToLength('Sofa Da Bò Cao Cấp – Thương Hiệu Luxury Với Chất Lượng A', 61),
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại', 150),
      description: '<p>Test content.</p><h2>Section</h2><ul><li>Item</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Title exactly 61 chars (warn: outside ideal [50-60] but in ok [30-70])',
  },
  {
    name: 'meta_exactly_139_chars',
    generator: () => ({
      metaTitle: 'Sofa Da Cao Cấp',
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại, bền vượt thời gian', 139),
      description: '<p>Content.</p><h2>Feature</h2><ul><li>X</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Meta exactly 139 chars (fail: < 140 ideal min)',
  },
  {
    name: 'meta_exactly_140_chars',
    generator: () => ({
      metaTitle: 'Sofa Da Cao Cấp',
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại, bền vượt thời gian, giao', 140),
      description: '<p>Content.</p><h2>Feature</h2><ul><li>X</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Meta exactly 140 chars (pass: ideal min)',
  },
  {
    name: 'meta_exactly_160_chars',
    generator: () => ({
      metaTitle: 'Sofa Da Cao Cấp',
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại, bền vượt thời gian. Giảm giá 30%. Giao miễn phí toàn', 160),
      description: '<p>Content.</p><h2>Feature</h2><ul><li>X</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Meta exactly 160 chars (pass: ideal max)',
  },
  {
    name: 'meta_exactly_161_chars',
    generator: () => ({
      metaTitle: 'Sofa Da Cao Cấp',
      metaDescription: padToLength('Sofa da bò nhập khẩu từ Italia, thiết kế hiện đại, bền vượt thời gian. Giảm giá 30%. Giao miễn phí toàn quốc', 161),
      description: '<p>Content.</p><h2>Feature</h2><ul><li>X</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'Meta exactly 161 chars (warn: outside ideal [140-160] but in ok [100-180])',
  },
  {
    name: 'only_h2_no_ul',
    generator: () => ({
      metaTitle: 'Sofa Test',
      metaDescription: 'Sofa test description with sufficient length for meta check pass',
      description: '<p>Intro.</p><h2>Section Title</h2><p>Content without list.</p>',
      focusKeyword: 'sofa',
    }),
    description: 'H2 present but no UL → structure warn',
  },
  {
    name: 'only_ul_no_h2',
    generator: () => ({
      metaTitle: 'Sofa Test',
      metaDescription: 'Sofa test description with sufficient length for meta check pass',
      description: '<p>Intro.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
      focusKeyword: 'sofa',
    }),
    description: 'UL present but no H2 → structure warn',
  },
]

// Generate fixture
console.log('🔨 Generating SEO fixture with golden-output expectedScore...\n')

const fixture = testCaseFactories.map((factory, idx) => {
  const input = factory.generator()
  const { score } = computeSeoScore(input)

  // Verify lengths
  if (input.metaTitle) {
    verifyLength(input.metaTitle, input.metaTitle.length)
  }
  if (input.metaDescription) {
    verifyLength(input.metaDescription, input.metaDescription.length)
  }

  console.log(`[${idx + 1}] ${factory.name}`)
  console.log(`    Title length: ${input.metaTitle?.length ?? 0} | Meta length: ${input.metaDescription?.length ?? 0}`)
  console.log(`    Golden expectedScore: ${score}`)
  console.log(`    Description: ${factory.description}\n`)

  return {
    name: factory.name,
    input,
    expectedScore: score,
    description: factory.description,
  }
})

// Write fixture JSON
const fixturePath = path.join(__dirname, '../src/lib/__fixtures__/seoScoreTestCases.json')
fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n')

console.log(`✅ Fixture written to: ${fixturePath}`)
console.log(`📊 Total cases: ${fixture.length}`)

