import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// Mock localStorage if not available
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

if (typeof global.localStorage === 'undefined' || !global.localStorage.clear) {
  global.localStorage = localStorageMock
}

// Node's native fetch (undici) rejects jsdom's AbortSignal instances with
// "RequestInit: Expected signal to be an instance of AbortSignal" because
// jsdom implements its own AbortController/AbortSignal classes that are not
// recognized by undici's internal brand check. React Router's data routers
// (createBrowserRouter/createMemoryRouter) always construct a `Request` with
// an AbortSignal when starting a navigation, even when no route defines a
// loader, so this throws on every navigation in the jsdom test environment.
// Wrap the global Request constructor to drop an incompatible `signal`
// option and retry, since these tests don't rely on request cancellation.
if (typeof globalThis.Request === 'function') {
  const NativeRequest = globalThis.Request
  function PatchedRequest(input, init) {
    try {
      return Reflect.construct(NativeRequest, [input, init], PatchedRequest)
    } catch (error) {
      if (init && 'signal' in init && error instanceof TypeError) {
        const rest = { ...init }
        delete rest.signal
        return Reflect.construct(NativeRequest, [input, rest], PatchedRequest)
      }
      throw error
    }
  }
  PatchedRequest.prototype = Object.create(NativeRequest.prototype)
  PatchedRequest.prototype.constructor = PatchedRequest
  globalThis.Request = PatchedRequest
  if (typeof window !== 'undefined') {
    window.Request = PatchedRequest
  }
}

// jsdom does not implement pointer capture APIs, which Radix UI primitives
// (Toast, Dialog, etc.) call when handling pointer/dismiss interactions.
if (typeof window !== 'undefined') {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {}
  }
}

beforeEach(() => {
  localStorage.clear()
})
