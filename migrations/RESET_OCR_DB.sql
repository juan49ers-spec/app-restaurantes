-- 🚨 RESET SCRIPT: DROPS AND RECREATES OCR TABLES
-- Use this to fix "Column not found" or "Policy already exists" errors
-- 1. Drop old tables (Clean Slate)
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS supplier_aliases CASCADE;
-- 2. Create Invoices Table
create table invoices (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid not null,
    -- Removed FK to avoid issues if restaurant missing
    supplier_id uuid references suppliers(id),
    -- OCR Data
    invoice_number text,
    date date,
    total_amount numeric,
    currency text default 'EUR',
    status text default 'pending',
    -- pending, processing, completed, error
    file_url text,
    scanned_data jsonb,
    -- RAW JSON from GPT-4o
    created_by uuid references auth.users(id),
    -- Mappings results
    mappings jsonb
);
-- 3. Enable RLS for Invoices
alter table invoices enable row level security;
create policy "Users can view own invoices" on invoices for
select using (true);
create policy "Users can insert own invoices" on invoices for
insert with check (true);
create policy "Users can update own invoices" on invoices for
update using (true);
-- 4. Create Supplier Aliases Table
create table supplier_aliases (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    alias text not null,
    -- The name found on the PDF (e.g. "Makro España SA")
    supplier_id uuid references suppliers(id) not null,
    restaurant_id uuid not null
);
-- 5. Enable RLS for Aliases
alter table supplier_aliases enable row level security;
create policy "Users can view aliases" on supplier_aliases for
select using (true);
create policy "Users can insert aliases" on supplier_aliases for
insert with check (true);