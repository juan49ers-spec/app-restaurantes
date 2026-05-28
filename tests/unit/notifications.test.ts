import { describe, expect, it } from 'vitest'
import { normalizeNotificationsTab } from '@/lib/notifications'

describe('normalizeNotificationsTab', () => {
  it('returns settings only for the settings tab', () => {
    expect(normalizeNotificationsTab('settings')).toBe('settings')
  })

  it('falls back to history for missing or unknown tabs', () => {
    expect(normalizeNotificationsTab(undefined)).toBe('history')
    expect(normalizeNotificationsTab('other')).toBe('history')
  })

  it('uses the first value when search params contain an array', () => {
    expect(normalizeNotificationsTab(['settings', 'history'])).toBe('settings')
    expect(normalizeNotificationsTab(['other', 'settings'])).toBe('history')
  })
})
