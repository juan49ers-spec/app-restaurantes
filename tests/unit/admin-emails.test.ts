import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAdminEmailList, isAdminEmail } from '@/lib/admin-emails'

describe('admin email helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads admin emails from ADMIN_EMAILS with trimming and lowercase normalization', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Admin@One.test, segundo@one.test ')

    expect(getAdminEmailList()).toEqual(['admin@one.test', 'segundo@one.test'])
    expect(isAdminEmail(' ADMIN@ONE.TEST ')).toBe(true)
    expect(isAdminEmail('otro@one.test')).toBe(false)
  })

  it('uses the built-in fallback when ADMIN_EMAILS is empty', () => {
    vi.stubEnv('ADMIN_EMAILS', '')

    expect(isAdminEmail('juan49ers@gmail.com')).toBe(true)
  })
})
