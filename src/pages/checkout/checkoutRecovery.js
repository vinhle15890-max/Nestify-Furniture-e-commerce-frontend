const CHECKOUT_RECOVERY_STORAGE = 'nestify.checkout.created-order'

export function readCheckoutRecovery() {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_RECOVERY_STORAGE)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const orderId = Number(parsed?.orderId)
    if (!Number.isInteger(orderId) || orderId <= 0) return null

    return { orderId }
  } catch {
    return null
  }
}

export function saveCheckoutRecovery(orderId) {
  const normalizedOrderId = Number(orderId)
  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) return null

  const recovery = { orderId: normalizedOrderId }
  try {
    window.sessionStorage.setItem(CHECKOUT_RECOVERY_STORAGE, JSON.stringify(recovery))
  } catch {
    // The in-memory created-order state still protects the active page. A
    // hardened browser may prevent refresh-safe recovery; report this honestly.
  }
  return recovery
}

export function clearCheckoutRecovery() {
  try {
    window.sessionStorage.removeItem(CHECKOUT_RECOVERY_STORAGE)
  } catch {
    // Nothing else to clear when session storage is unavailable.
  }
}

export const checkoutRecoveryStorageKey = CHECKOUT_RECOVERY_STORAGE
