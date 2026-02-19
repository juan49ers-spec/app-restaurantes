-- Migration: support_restaurants
-- Description: Create restaurants table and policies.
create table if not exists restaurants (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    owner_id uuid references auth.users(id) not null
);
-- RLS for restaurants
alter table restaurants enable row level security;
create policy "Users can insert their own restaurant" on restaurants for
insert with check (auth.uid() = owner_id);
create policy "Users can view their own restaurant" on restaurants for
select using (auth.uid() = owner_id);
create policy "Users can update their own restaurant" on restaurants for
update using (auth.uid() = owner_id);
-- Add active_restaurant_id to profiles?
-- For MVP, we will query restaurants where owner_id = auth.uid() directly.