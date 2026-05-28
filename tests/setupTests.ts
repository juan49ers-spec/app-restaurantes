import '@testing-library/jest-dom'

const MIN_PROCESS_MAX_LISTENERS = 50

if (process.getMaxListeners() < MIN_PROCESS_MAX_LISTENERS) {
  process.setMaxListeners(MIN_PROCESS_MAX_LISTENERS)
}

// Extend Vitest's expect with jest-dom matchers
// Type definitions for jest-dom matchers are provided by @testing-library/jest-dom
// No additional type declarations needed as the package includes its own types
