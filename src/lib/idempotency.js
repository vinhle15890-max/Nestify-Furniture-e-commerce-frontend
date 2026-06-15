import { useUiStore } from '../store/uiStore'

export function getCheckoutIdempotencyKey() {
  const { checkoutIdempotencyKey, setCheckoutIdempotencyKey } = useUiStore.getState()
  if (checkoutIdempotencyKey) return checkoutIdempotencyKey

  const key = crypto.randomUUID()
  setCheckoutIdempotencyKey(key)
  return key
}

export function resetCheckoutIdempotencyKey() {
  useUiStore.getState().resetCheckoutIdempotencyKey()
}
