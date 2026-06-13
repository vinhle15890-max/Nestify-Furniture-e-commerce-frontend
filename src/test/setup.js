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
