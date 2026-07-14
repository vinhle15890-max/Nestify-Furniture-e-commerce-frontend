import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkoutRecoveryStorageKey,
  clearCheckoutRecovery,
  readCheckoutRecovery,
  saveCheckoutRecovery,
} from './checkoutRecovery'

describe('checkoutRecovery', () => {
  beforeEach(() => sessionStorage.clear())

  it('persists only a valid created order identity', () => {
    expect(saveCheckoutRecovery(42)).toEqual({ orderId: 42 })
    expect(readCheckoutRecovery()).toEqual({ orderId: 42 })
    expect(JSON.parse(sessionStorage.getItem(checkoutRecoveryStorageKey))).toEqual({ orderId: 42 })
  })

  it('ignores malformed recovery records and can clear a valid record', () => {
    sessionStorage.setItem(checkoutRecoveryStorageKey, JSON.stringify({ orderId: 'not-an-order' }))
    expect(readCheckoutRecovery()).toBeNull()

    saveCheckoutRecovery(42)
    clearCheckoutRecovery()
    expect(readCheckoutRecovery()).toBeNull()
  })
})
