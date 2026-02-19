-- 1. LIMPIEZA DE TABLAS VIEJAS (Opcional, para no confundir)
DROP TABLE IF EXISTS sales_items CASCADE;
DROP TABLE IF EXISTS sales_periods CASCADE;
DROP TABLE IF EXISTS sales_items_v2 CASCADE;
DROP TABLE IF EXISTS sales_periods_v2 CASCADE;
-- 2. CREAMOS V2 (Para engañar a la caché)
create table sales_periods_v2 (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    start_date date not null,
    end_date date not null,
    name text not null
);
create table sales_items_v2 (
    id uuid default gen_random_uuid() primary key,
    period_id uuid references sales_periods_v2(id) on delete cascade not null,
    recipe_id uuid references recipes(id) not null,
    quantity_sold integer not null default 0,
    revenue_total numeric not null default 0,
    cost_per_unit_snapshot numeric,
    price_per_unit_snapshot numeric
);
-- 3. RLS
alter table sales_periods_v2 enable row level security;
alter table sales_items_v2 enable row level security;
-- 4. POLICIES
create policy "Manage own sales periods v2" on sales_periods_v2 for all using (
    restaurant_id in (
        select id
        from restaurants
        where owner_id = auth.uid()
    )
);
create policy "Manage own sales items v2" on sales_items_v2 for all using (
    period_id in (
        select id
        from sales_periods_v2
        where restaurant_id in (
                select id
                from restaurants
                where owner_id = auth.uid()
            )
    )
);
-- 5. RECARGA FINAL
NOTIFY pgrst,
'reload';