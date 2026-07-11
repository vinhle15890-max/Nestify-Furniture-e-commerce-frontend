import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

function installMatchMedia(initialMatches) {
  const listeners = new Set()
  const mediaQuery = {
    matches: initialMatches,
    media: '(min-width: 64rem)',
    addEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.delete(listener)
    }),
    emit(matches) {
      this.matches = matches
      listeners.forEach((listener) => listener({ matches, media: this.media }))
    },
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQuery),
  })

  return mediaQuery
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  })
})

describe('useMediaQuery', () => {
  it('returns the synchronous initial match', () => {
    installMatchMedia(true)

    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'))

    expect(result.current).toBe(true)
  })

  it('updates when the media query changes', () => {
    const mediaQuery = installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'))

    act(() => mediaQuery.emit(true))

    expect(result.current).toBe(true)
  })

  it('removes its change listener on unmount', () => {
    const mediaQuery = installMatchMedia(true)
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 64rem)'))

    unmount()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('fails closed when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'))

    expect(result.current).toBe(false)
  })
})
