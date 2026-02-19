-- Module 2: Operations & HR Schema
-- 1. Employees Table
create table if not exists employees (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    role text not null check (
        role in (
            'manager',
            'chef',
            'waiter',
            'bartender',
            'kitchen_porter'
        )
    ),
    hourly_rate numeric(10, 2) not null default 0,
    -- Cost per hour for the business
    email text,
    -- Optional for login later
    is_active boolean default true,
    created_at timestamptz default now()
);
-- 2. Shifts Table (Turnos)
create table if not exists shifts (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    employee_id uuid not null references employees(id) on delete cascade,
    start_time timestamptz not null,
    end_time timestamptz not null,
    break_minutes int default 0,
    -- Calculated/Metadata
    total_hours numeric(5, 2) generated always as (
        extract(
            epoch
            from (end_time - start_time)
        ) / 3600.0 - (break_minutes / 60.0)
    ) stored,
    estimated_cost numeric(10, 2) default 0,
    -- Snapshotted cost at time of shift (rate * hours)
    status text default 'scheduled' check (
        status in ('scheduled', 'completed', 'cancelled')
    ),
    created_at timestamptz default now(),
    -- Constraints
    constraint check_times check (end_time > start_time)
);
-- RLS Policies
alter table employees enable row level security;
alter table shifts enable row level security;
-- Employees RLS
create policy "Users can view employees for their restaurant" on employees for
select using (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = employees.restaurant_id
        )
    );
create policy "Users can manage employees for their restaurant" on employees for all using (
    auth.uid() in (
        select owner_id
        from restaurants
        where id = employees.restaurant_id
    )
);
-- Shifts RLS
create policy "Users can view shifts for their restaurant" on shifts for
select using (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = shifts.restaurant_id
        )
    );
create policy "Users can manage shifts for their restaurant" on shifts for all using (
    auth.uid() in (
        select owner_id
        from restaurants
        where id = shifts.restaurant_id
    )
);