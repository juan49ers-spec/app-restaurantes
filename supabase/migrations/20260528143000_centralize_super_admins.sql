create table if not exists public.super_admins (
    email text primary key check (email = lower(trim(email))),
    created_at timestamptz not null default now()
);

insert into public.super_admins (email)
values
    ('juan49ers@gmail.com'),
    ('admin@controlhub.com'),
    ('flyderapp@gmail.com')
on conflict (email) do nothing;

alter table public.super_admins enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
    select exists (
        select 1
        from auth.users u
        join public.super_admins sa
            on sa.email = lower(trim(u.email))
        where u.id = auth.uid()
    );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists "super admins can read super admin allowlist"
    on public.super_admins;

create policy "super admins can read super admin allowlist"
    on public.super_admins
    for select
    to authenticated
    using (public.is_super_admin());
