import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../store/uiStore'
import { getCheckoutIdempotencyKey, resetCheckoutIdempotencyKey } from './idempotency'

describe('idempotency', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useUiStore.setState({ checkoutIdempotencyKey: null })
  })

  it('lazily creates and persists a key in uiStore', () => {
    const key = getCheckoutIdempotencyKey()
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(useUiStore.getState().checkoutIdempotencyKey).toBe(key)
  })

  it('returns the same key on subsequent calls', () => {
    const first = getCheckoutIdempotencyKey()
    const second = getCheckoutIdempotencyKey()
    expect(second).toBe(first)
  })

  it('restores the same key after the in-memory store is reset', () => {
    const first = getCheckoutIdempotencyKey()

    // Simulate a same-tab page reload: Zustand memory is recreated while
    // sessionStorage remains available for this checkout attempt.
    useUiStore.setState({ checkoutIdempotencyKey: null })

    expect(getCheckoutIdempotencyKey()).toBe(first)
  })

  it('reset clears the stored key', () => {
    getCheckoutIdempotencyKey()
    resetCheckoutIdempotencyKey()
    expect(useUiStore.getState().checkoutIdempotencyKey).toBeNull()

    // A later attempt must not restore the completed order's key.
    const next = getCheckoutIdempotencyKey()
    expect(next).toMatch(/^[0-9a-f-]{36}$/)
  })
})
