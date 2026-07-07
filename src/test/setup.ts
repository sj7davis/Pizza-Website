import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom-only polyfills below are skipped when running under the node test
// environment (e.g. server/__tests__/* via `@vitest-environment node`),
// where `window` does not exist.

// jsdom lacks matchMedia; default to "no reduced motion".
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// jsdom lacks IntersectionObserver (Motion whileInView needs it).
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  // @ts-expect-error minimal stub
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
}

// jsdom lacks ResizeObserver (Embla carousel needs it).
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
