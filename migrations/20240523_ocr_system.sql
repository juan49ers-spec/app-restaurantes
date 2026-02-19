-- Migration: ocr_system
-- Description: Tables for Invoice Processing and Entity Resolution.
-- 1. Invoices Table
create table if not exists invoices (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    supplier_id uuid references suppliers(id),
    -- Nullable initially
    invoice_number text,
    date date,
    total_amount numeric,
    currency text default 'EUR',
    status text check (
        status in (
            'uploading',
            'processing',
            'review_required',
            'completed',
            'error'
        )
    ) default 'uploading',
    image_url text,
    -- Path in Storage Bucket
    scanned_data jsonb,
    -- Raw AI Output
    processed_at timestamp with time zone
);
-- RLS for Invoices
alter table invoices enable row level security;
create policy "Users can view own invoices" on invoices for
select using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can insert own invoices" on invoices for
insert with check (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
create policy "Users can update own invoices" on invoices for
update using (
        restaurant_id in (
            select id
            from restaurants
            where owner_id = auth.uid()
        )
    );
-- 2. Supplier Aliases (Memory)
-- Used to remember that "Tomates Hnos" = "Tomate Pera"
create table if not exists supplier_aliases (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    alias_name text not null,
    -- content from OCR "Tomates H. Garcia"
    -- It can map to a Supplier OR a specific Master Ingredient
    supplier_id uuid references suppliers(id),
    master_ingredient_id uuid references master_ingredients(id),
    confidence_score numeric default 1.0,
    constraint unique_alias_per_restaurant unique (restaurant_id, alias_name)
);
-- RLS for Aliases
alter table supplier_aliases enable row level security;
create policy "Manage own aliases" on supplier_aliases for all using (
    restaurant_id in (
        select id
        from restaurants
        where owner_id = auth.uid()
    )
);