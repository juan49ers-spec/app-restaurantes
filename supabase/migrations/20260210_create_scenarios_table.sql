create table if not exists scenarios (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    base_revenue numeric not null,
    base_expenses numeric not null,
    adjustments jsonb not null default '{}'::jsonb,
    created_at timestamptz default now()
);
-- RLS
alter table scenarios enable row level security;
create policy "Users can view their own scenarios" on scenarios for
select using (auth.uid() = user_id);
create policy "Users can insert their own scenarios" on scenarios for
insert with check (auth.uid() = user_id);
create policy "Users can update their own scenarios" on scenarios for
update using (auth.uid() = user_id);
create policy "Users can delete their own scenarios" on scenarios for delete using (auth.uid() = user_id);