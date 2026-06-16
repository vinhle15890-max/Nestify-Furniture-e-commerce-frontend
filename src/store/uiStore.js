import { create } from 'zustand'

export const useUiStore = create((set) => ({
  isCartOpen: false,
  isMobileNavOpen: false,
  checkoutIdempotencyKey: null,

  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),

  setCheckoutIdempotencyKey: (key) => set({ checkoutIdempotencyKey: key }),
  resetCheckoutIdempotencyKey: () => set({ checkoutIdempotencyKey: null }),
}))
