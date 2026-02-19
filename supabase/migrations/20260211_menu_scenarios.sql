-- Tabla para persistir escenarios de ingeniería de menú
create table if not exists menu_scenarios (
    id uuid default gen_random_uuid() primary key,
    report_id uuid references menu_reports(id) on delete cascade not null,
    restaurant_id uuid references restaurants(id) on delete cascade not null,
    name text not null,
    adjustments jsonb not null default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
-- RLS
alter table menu_scenarios enable row level security;
create policy "Users can view scenarios for their restaurant" on menu_scenarios for
select using (
        exists (
            select 1
            from menu_reports
            where menu_reports.id = menu_scenarios.report_id
                and menu_reports.restaurant_id = menu_scenarios.restaurant_id
        )
    );
create policy "Users can insert scenarios for their restaurant" on menu_scenarios for
insert with check (
        exists (
            select 1
            from menu_reports
            where menu_reports.id = menu_scenarios.report_id
                and menu_reports.restaurant_id = menu_scenarios.restaurant_id
        )
    );
create policy "Users can update their own scenarios" on menu_scenarios for
update using (
        exists (
            select 1
            from menu_reports
            where menu_reports.id = menu_scenarios.report_id
                and menu_reports.restaurant_id = menu_scenarios.restaurant_id
        )
    );
create policy "Users can delete their own scenarios" on menu_scenarios for delete using (
    exists (
        select 1
        from menu_reports
        where menu_reports.id = menu_scenarios.report_id
            and menu_reports.restaurant_id = menu_scenarios.restaurant_id
    )
);