-- 1. FORCE CLEANUP (Para asegurarnos de que no hay basura)
DROP TABLE IF EXISTS sales_items CASCADE;
DROP TABLE IF EXISTS sales_periods CASCADE;
-- 2. RE-CREATE TABLES (Creación limpia)
create table sales_periods (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    start_date date not null,
    end_date date not null,
    name text not null
);
create table sales_items (
    id uuid default gen_random_uuid() primary key,
    period_id uuid references sales_periods(id) on delete cascade not null,
    recipe_id uuid references recipes(id) not null,
    quantity_sold integer not null default 0,
    revenue_total numeric not null default 0,
    cost_per_unit_snapshot numeric,
    price_per_unit_snapshot numeric
);
-- 3. ENABLE RLS
alter table sales_periods enable row level security;
alter table sales_items enable row level security;
-- 4. POLICIES (Simples y directas)
create policy "Manage own sales periods" on sales_periods for all using (
    restaurant_id in (
        select id
        from restaurants
        where owner_id = auth.uid()
    )
);
create policy "Manage own sales items" on sales_items for all using (
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
-- 5. MAGIC RELOAD (El truco para despertar a la API)
NOTIFY pgrst,
'reload';