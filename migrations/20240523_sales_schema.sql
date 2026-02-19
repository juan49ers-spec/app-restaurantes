-- Sales Periods (e.g., "May 2024", "Q1 2024")
create table if not exists sales_periods (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    start_date date not null,
    end_date date not null,
    name text not null
);
-- Sales Items (The actual TPV data linked to recipes)
create table if not exists sales_items (
    id uuid default gen_random_uuid() primary key,
    period_id uuid references sales_periods(id) on delete cascade not null,
    recipe_id uuid references recipes(id) not null,
    quantity_sold integer not null default 0,
    revenue_total numeric not null default 0,
    -- Calculated Fields snapshot (optional, can be useful for historical accuracy)
    cost_per_unit_snapshot numeric,
    price_per_unit_snapshot numeric
);
-- RLS
alter table sales_periods enable row level security;
alter table sales_items enable row level security;
-- Policies for Periods
create policy "Users can view their own sales periods" on sales_periods for
select using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can insert their own sales periods" on sales_periods for
insert with check (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can update their own sales periods" on sales_periods for
update using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
-- Policies for Items (using the period link)
create policy "Users can view their own sales items" on sales_items for
select using (
        period_id in (
            select id
            from sales_periods
            where restaurant_id in (
                    select id
                    from restaurants
                    where owner_id = auth.uid()
                )
        )
    );
create policy "Users can insert their own sales items" on sales_items for
insert with check (
        period_id in (
            select id
            from sales_periods
            where restaurant_id in (
                    select id
                    from restaurants
                    where owner_id = auth.uid()
                )
        )
    );