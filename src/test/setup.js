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

beforeEach(() => {
  localStorage.clear()
})
