import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../store/uiStore'
import { getCheckoutIdempotencyKey, resetCheckoutIdempotencyKey } from './idempotency'

describe('idempotency', () => {
  beforeEach(() => {
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

  it('reset clears the stored key', () => {
    getCheckoutIdempotencyKey()
    resetCheckoutIdempotencyKey()
    expect(useUiStore.getState().checkoutIdempotencyKey).toBeNull()
  })
})
