import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedbackState } from './FeedbackState'

describe('FeedbackState', () => {
  it('distinguishes empty information from an error', () => {
    const { rerender } = render(<FeedbackState title="Chưa có dữ liệu" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(<FeedbackState kind="error" title="Chưa thể tải" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
