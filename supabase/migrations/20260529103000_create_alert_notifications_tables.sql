create table if not exists public.alert_rules (
    id uuid primary key default gen_random_uuid(),
    restaurant_id uuid not null references public.restaurants(id) on delete cascade,
    name text not null,
    type text not null check (
        type in (
            'PRICE_CHANGE',
            'MARGIN_DROP',
            'WASTE_HIGH',
            'INGREDIENT_LOW_STOCK',
            'SUPPLIER_PRICE_INCREASE',
            'MENU_ITEM_UNPROFITABLE',
            'INVOICE_ANOMALY',
            'PRICE_DISCREPANCY',
            'REPORT_PUBLISHED',
            'CLIENT_MEETING_REQUEST'
        )
    ),
    enabled boolean not null default true,
    conditions jsonb not null default '{}'::jsonb,
    severity text not null default 'WARNING' check (severity in ('INFO', 'WARNING', 'CRITICAL')),
    channels jsonb not null default '{}'::jsonb,
    cooldown integer not null default 24 check (cooldown >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.alert_notifications (
    id uuid primary key default gen_random_uuid(),
    restaurant_id uuid not null references public.restaurants(id) on delete cascade,
    rule_id uuid references public.alert_rules(id) on delete set null,
    type text not null check (
        type in (
            'PRICE_CHANGE',
            'MARGIN_DROP',
            'WASTE_HIGH',
            'INGREDIENT_LOW_STOCK',
            'SUPPLIER_PRICE_INCREASE',
            'MENU_ITEM_UNPROFITABLE',
            'INVOICE_ANOMALY',
            'PRICE_DISCREPANCY',
            'REPORT_PUBLISHED',
            'CLIENT_MEETING_REQUEST'
        )
    ),
    severity text not null default 'INFO' check (severity in ('INFO', 'WARNING', 'CRITICAL')),
    title text not null,
    message text not null,
    entity_type text not null check (entity_type in ('INGREDIENT', 'RECIPE', 'SUPPLIER', 'INVOICE', 'MENU', 'REPORT')),
    entity_id text not null,
    entity_name text not null,
    metadata jsonb not null default '{}'::jsonb,
    read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_alert_rules_restaurant_type
    on public.alert_rules (restaurant_id, type, enabled);

create index if not exists idx_alert_notifications_restaurant_unread
    on public.alert_notifications (restaurant_id, read, created_at desc);

create index if not exists idx_alert_notifications_rule_entity
    on public.alert_notifications (rule_id, entity_id, created_at desc);

alter table public.alert_rules enable row level security;
alter table public.alert_notifications enable row level security;

drop policy if exists "restaurant owners can read alert rules" on public.alert_rules;
create policy "restaurant owners can read alert rules"
    on public.alert_rules for select
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can insert alert rules" on public.alert_rules;
create policy "restaurant owners can insert alert rules"
    on public.alert_rules for insert
    with check (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can update alert rules" on public.alert_rules;
create policy "restaurant owners can update alert rules"
    on public.alert_rules for update
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    )
    with check (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can delete alert rules" on public.alert_rules;
create policy "restaurant owners can delete alert rules"
    on public.alert_rules for delete
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can read alert notifications" on public.alert_notifications;
create policy "restaurant owners can read alert notifications"
    on public.alert_notifications for select
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can insert alert notifications" on public.alert_notifications;
create policy "restaurant owners can insert alert notifications"
    on public.alert_notifications for insert
    with check (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can update alert notifications" on public.alert_notifications;
create policy "restaurant owners can update alert notifications"
    on public.alert_notifications for update
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    )
    with check (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

drop policy if exists "restaurant owners can delete alert notifications" on public.alert_notifications;
create policy "restaurant owners can delete alert notifications"
    on public.alert_notifications for delete
    using (
        restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
    );

grant select, insert, update, delete on public.alert_rules to authenticated;
grant select, insert, update, delete on public.alert_notifications to authenticated;
