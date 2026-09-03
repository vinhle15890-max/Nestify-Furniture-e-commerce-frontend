import { describe, expect, it } from 'vitest'
import { summarizeReviewEvidence } from './reviewEvidence'

describe('summarizeReviewEvidence', () => {
  it('keeps honest denominators and averages for verified review evidence', () => {
    const facts = summarizeReviewEvidence([
      { evidence: { color_accuracy: 'accurate', size_fit: 'as_expected', material_quality: 5 } },
      { evidence: { color_accuracy: 'slightly_different', size_fit: 'as_expected', material_quality: 4 } },
      { evidence: { color_accuracy: 'accurate', size_fit: 'larger', material_quality: 4 } },
    ])

    expect(facts).toEqual([
      { label: 'Màu sắc giống ảnh', value: '2/3 người đánh giá' },
      { label: 'Kích thước đúng kỳ vọng', value: '2/3 người đánh giá' },
      { label: 'Chất liệu 4.3/5', value: '3 đánh giá' },
    ])
  })

  it('omits facts that reviewers did not answer', () => {
    expect(summarizeReviewEvidence([{ evidence: { delivery_experience: 5 } }])).toEqual([])
  })
})
