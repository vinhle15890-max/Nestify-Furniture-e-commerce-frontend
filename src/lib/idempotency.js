import { useUiStore } from '../store/uiStore'

const CHECKOUT_KEY_STORAGE = 'nestify.checkout.idempotency-key'

function readSessionKey() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(CHECKOUT_KEY_STORAGE)
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. The in-memory
    // store still preserves duplicate-submit protection for the current page.
    return null
  }
}

function writeSessionKey(key) {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(CHECKOUT_KEY_STORAGE, key)
  } catch {
    // Deliberately degrade to the in-memory store.
  }
}

function removeSessionKey() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(CHECKOUT_KEY_STORAGE)
  } catch {
    // Deliberately degrade to the in-memory store.
  }
}

export function getCheckoutIdempotencyKey() {
  const { checkoutIdempotencyKey, setCheckoutIdempotencyKey } = useUiStore.getState()
  if (checkoutIdempotencyKey) {
    writeSessionKey(checkoutIdempotencyKey)
    return checkoutIdempotencyKey
  }

  const restoredKey = readSessionKey()
  if (restoredKey) {
    setCheckoutIdempotencyKey(restoredKey)
    return restoredKey
  }

  const key = crypto.randomUUID()
  setCheckoutIdempotencyKey(key)
  writeSessionKey(key)
  return key
}

export function resetCheckoutIdempotencyKey() {
  useUiStore.getState().resetCheckoutIdempotencyKey()
  removeSessionKey()
}
