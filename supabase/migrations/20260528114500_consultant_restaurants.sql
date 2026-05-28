create table if not exists public.consultant_restaurants (
    id uuid primary key default gen_random_uuid(),
    consultant_user_id uuid not null references auth.users(id) on delete cascade,
    restaurant_id uuid not null references public.restaurants(id) on delete cascade,
    role text not null default 'CONSULTANT' check (role in ('OWNER', 'CONSULTANT', 'VIEWER')),
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'REVOKED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (consultant_user_id, restaurant_id)
);

create index if not exists idx_consultant_restaurants_consultant
    on public.consultant_restaurants (consultant_user_id, status);

create index if not exists idx_consultant_restaurants_restaurant
    on public.consultant_restaurants (restaurant_id, status);

alter table public.consultant_restaurants enable row level security;

drop policy if exists "consultants can read own client links" on public.consultant_restaurants;
create policy "consultants can read own client links"
    on public.consultant_restaurants for select
    to authenticated
    using (consultant_user_id = auth.uid());

drop policy if exists "restaurant owners can read client links" on public.consultant_restaurants;
create policy "restaurant owners can read client links"
    on public.consultant_restaurants for select
    to authenticated
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

grant select on public.consultant_restaurants to authenticated;
