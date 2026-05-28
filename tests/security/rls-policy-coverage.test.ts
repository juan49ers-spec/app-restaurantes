import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

function migrationSql() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .map(file => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    .join('\n')
    .toLowerCase()
}

describe('RLS policy coverage for critical tenant tables', () => {
  it.each([
    'professional_report_drafts',
    'portal_meeting_requests',
    'menu_reports',
    'menu_report_items',
    'consultant_restaurants',
  ])('documents row-level security policies for %s', tableName => {
    const sql = migrationSql()

    expect(sql).toContain(`alter table public.${tableName} enable row level security`)
    expect(sql).toContain(`on public.${tableName}`)
    expect(sql).toMatch(new RegExp(`create policy[\\s\\S]+on public\\.${tableName}`))
  })

  it('keeps the consultant portfolio table scoped by authenticated user or restaurant owner', () => {
    const sql = migrationSql()

    expect(sql).toContain('consultant_user_id = auth.uid()')
    expect(sql).toContain('select id from public.restaurants where owner_id = auth.uid()')
    expect(sql).toContain('grant select on public.consultant_restaurants to authenticated')
    expect(sql).toContain('super admins can manage consultant client links')
    expect(sql).toContain('with check (public.is_super_admin())')
  })

  it('keeps super admin checks backed by a database allowlist', () => {
    const sql = migrationSql()

    expect(sql).toContain('create table if not exists public.super_admins')
    expect(sql).toContain('create or replace function public.is_super_admin()')
    expect(sql).toContain('join public.super_admins')
    expect(sql).toContain('grant execute on function public.is_super_admin() to authenticated')
  })
})
