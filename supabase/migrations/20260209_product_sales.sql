-- Create product_sales table for Item-Level Analysis (Module 0/1)
create table if not exists product_sales (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    date date not null,
    -- Item Details
    product_name text not null,
    -- Name from POS
    recipe_id uuid references recipes(id) on delete
    set null,
        -- Link to Costing. Null = Ghost Product
        -- Metrics
        quantity_sold integer not null default 0,
        revenue_total numeric(10, 2) not null default 0,
        unit_price numeric(10, 2) generated always as (
            case
                when quantity_sold > 0 then revenue_total / quantity_sold
                else 0
            end
        ) stored,
        created_at timestamptz default now()
);
-- Index for fast querying by date range
create index idx_product_sales_date on product_sales(restaurant_id, date);
create index idx_product_sales_recipe on product_sales(recipe_id);
-- RLS
alter table product_sales enable row level security;
create policy "Users can view product sales" on product_sales for
select using (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = product_sales.restaurant_id
        )
    );
create policy "Users can insert product sales" on product_sales for
insert with check (
        auth.uid() in (
            select owner_id
            from restaurants
            where id = product_sales.restaurant_id
        )
    );