-- Create daily_sales table for Financial Diagnosis (Module 0)
create table if not exists daily_sales (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    date date not null,
    -- Financial Metrics
    revenue_total numeric(10, 2) not null default 0,
    cost_of_goods numeric(10, 2) not null default 0,
    labor_cost numeric(10, 2) default 0,
    net_stimated_profit numeric(10, 2) generated always as (revenue_total - cost_of_goods - labor_cost) stored,
    -- Metadata
    source text default 'manual',
    -- 'manual', 'pos_integration', 'seed'
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- Constraints
    unique(restaurant_id, date)
);
-- RLS Policies
alter table daily_sales enable row level security;
create policy "Users can view sales for their restaurant" on daily_sales for
select using (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = daily_sales.restaurant_id
        )
    );
create policy "Users can insert sales for their restaurant" on daily_sales for
insert with check (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = daily_sales.restaurant_id
        )
    );
create policy "Users can update sales for their restaurant" on daily_sales for
update using (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = daily_sales.restaurant_id
        )
    );