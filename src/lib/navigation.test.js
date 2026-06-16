import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { redirectToExternal } from './navigation'

describe('redirectToExternal', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('sets window.location.href to the given URL', () => {
    redirectToExternal('https://payment.example.com/session/123')
    expect(window.location.href).toBe('https://payment.example.com/session/123')
  })
})
