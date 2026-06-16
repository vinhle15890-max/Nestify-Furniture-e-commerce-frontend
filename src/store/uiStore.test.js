import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      isCartOpen: false,
      isMobileNavOpen: false,
      checkoutIdempotencyKey: null,
    })
  })

  it('toggles the cart drawer', () => {
    useUiStore.getState().toggleCart()
    expect(useUiStore.getState().isCartOpen).toBe(true)

    useUiStore.getState().toggleCart()
    expect(useUiStore.getState().isCartOpen).toBe(false)
  })

  it('closes the cart drawer', () => {
    useUiStore.setState({ isCartOpen: true })
    useUiStore.getState().closeCart()
    expect(useUiStore.getState().isCartOpen).toBe(false)
  })

  it('opens the cart drawer', () => {
    useUiStore.getState().openCart()
    expect(useUiStore.getState().isCartOpen).toBe(true)
  })

  it('toggles the mobile nav', () => {
    useUiStore.getState().toggleMobileNav()
    expect(useUiStore.getState().isMobileNavOpen).toBe(true)

    useUiStore.getState().closeMobileNav()
    expect(useUiStore.getState().isMobileNavOpen).toBe(false)
  })

  it('sets and resets the checkout idempotency key', () => {
    useUiStore.getState().setCheckoutIdempotencyKey('key-1')
    expect(useUiStore.getState().checkoutIdempotencyKey).toBe('key-1')

    useUiStore.getState().resetCheckoutIdempotencyKey()
    expect(useUiStore.getState().checkoutIdempotencyKey).toBeNull()
  })
})
