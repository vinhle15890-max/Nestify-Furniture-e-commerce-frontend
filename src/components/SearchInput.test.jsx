import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchInput } from './SearchInput'

describe('SearchInput debounce semantics', () => {
  beforeEach(() => vi.useFakeTimers())

  it('does not restart debounce when callback identity changes and invokes the latest callback', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const { rerender } = render(<SearchInput onDebouncedChange={first} delay={300} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sofa' } })
    act(() => vi.advanceTimersByTime(200))
    rerender(<SearchInput onDebouncedChange={latest} delay={300} />)
    act(() => vi.advanceTimersByTime(100))

    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
    expect(latest).toHaveBeenCalledWith('sofa')
  })

  it('restarts debounce when the value changes', () => {
    const callback = vi.fn()
    render(<SearchInput onDebouncedChange={callback} delay={300} />)
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: 'so' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(input, { target: { value: 'sofa' } })
    act(() => vi.advanceTimersByTime(299))
    expect(callback).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(callback).toHaveBeenCalledWith('sofa')
  })
})
