import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// React Router emits the same two v7 migration notices from every isolated
// MemoryRouter test. Production opts into both flags; keep test output useful
// without muting any other warning.
const originalWarn = console.warn.bind(console)
console.warn = (...args) => {
  const message = args.map(String).join(' ')
  if (message.includes('React Router Future Flag Warning')) return
  originalWarn(...args)
}

// R3F host primitives (mesh, group, *Geometry, *Material) are valid only
// inside the custom renderer. A few wiring tests intentionally render them
// through jsdom, where React DOM reports casing/attribute noise. Suppress only
// those known messages when the component stack proves the source is a scene
// test; all other console errors remain visible.
const originalError = console.error.bind(console)
console.error = (...args) => {
  const message = args.map(String).join(' ')
  const fromSceneTest = message.includes('/roomPlanner/scene/')
  const knownR3fDomNoise = [
    'is using incorrect casing',
    'is unrecognized in this browser',
    'React does not recognize the',
    'non-boolean attribute',
  ].some((pattern) => message.includes(pattern))

  if (fromSceneTest && knownR3fDomNoise) return
  originalError(...args)
}

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
