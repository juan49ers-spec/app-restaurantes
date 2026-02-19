-- Create daily_sales table
create table if not exists daily_sales (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    date date not null,
    -- Broken down revenue
    revenue_dine_in numeric default 0,
    revenue_takeout numeric default 0,
    revenue_delivery numeric default 0,
    revenue_total numeric generated always as (
        revenue_dine_in + revenue_takeout + revenue_delivery
    ) stored,
    -- Operational stats
    total_covers integer default 0,
    labor_hours numeric default 0,
    -- Costs (snapshot or manual entry for reference)
    cost_of_goods numeric default 0,
    -- Can be used to store theoretical COGS for the day
    labor_cost numeric default 0,
    -- Can be used to store estimated labor cost
    day_status text check (day_status in ('OPEN', 'CLOSED', 'LOCKED')) default 'OPEN',
    source text default 'system',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(restaurant_id, date)
);
-- Create operating_expenses table
create table if not exists operating_expenses (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    date date not null,
    category text not null,
    -- Enum enforcement in application layer or check constraint
    amount numeric not null check (amount >= 0),
    description text,
    payment_method text default 'bank',
    recurrence text default 'NONE',
    -- DAILY, WEEKLY, MONTHLY, YEARLY
    is_paid boolean default true,
    created_at timestamptz default now()
);
-- Add indexes for performance
create index if not exists idx_daily_sales_date on daily_sales(restaurant_id, date);
create index if not exists idx_operating_expenses_date on operating_expenses(restaurant_id, date);
-- Enable RLS
alter table daily_sales enable row level security;
alter table operating_expenses enable row level security;
-- Policies (Simple: Users can see/edit their restaurant's data)
-- Assuming auth.uid() checks or similar existing logic. 
-- For now, referencing typical simple policy:
create policy "Users can view their restaurant daily sales" on daily_sales for
select using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can insert their restaurant daily sales" on daily_sales for
insert with check (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can update their restaurant daily sales" on daily_sales for
update using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can delete their restaurant daily sales" on daily_sales for delete using (
    restaurant_id in (
        select id
        from restaurants
        where owner_id = auth.uid()
    )
);
-- Operating Expenses Policies
create policy "Users can view their restaurant expenses" on operating_expenses for
select using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can insert their restaurant expenses" on operating_expenses for
insert with check (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can update their restaurant expenses" on operating_expenses for
update using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can delete their restaurant expenses" on operating_expenses for delete using (
    restaurant_id in (
        select id
        from restaurants
        where owner_id = auth.uid()
    )
);