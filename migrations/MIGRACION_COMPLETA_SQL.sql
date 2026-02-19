-- ==========================================
-- MÓDULO RESULTADOS - Migración + Datos de Prueba
-- Ejecutar en: Supabase SQL Editor
-- ==========================================

-- =====================================================
-- PARTE 1: SCHEMA (Tablas y Funciones)
-- =====================================================

-- 1. TABLA: Gastos Operativos
create table if not exists operating_expenses (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    expense_date date not null,
    month_year text not null,
    category text not null check (category in (
        'personal', 'materia_prima', 'suministros', 
        'mantenimiento', 'marketing', 'gastos_varios', 
        'inversiones', 'financiaciones'
    )),
    description text,
    amount numeric not null default 0,
    provider text,
    invoice_number text,
    details jsonb default '{}'::jsonb
);

-- 2. TABLA: Resultados Mensuales
create table if not exists monthly_results (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references restaurants(id) not null,
    month_year text not null,
    year integer not null,
    month integer not null,
    month_name text not null,
    is_closed boolean default false,
    closed_at timestamp with time zone,
    closed_by uuid references auth.users(id),
    -- Ingresos
    ingresos_netos numeric not null default 0,
    ingresos_extra numeric not null default 0,
    total_ingresos numeric not null default 0,
    -- Personal
    personal_total numeric not null default 0,
    personal_sueldos_netos numeric not null default 0,
    personal_seguridad_social numeric not null default 0,
    personal_irpf numeric not null default 0,
    -- Materia Prima
    materia_prima_total numeric not null default 0,
    materia_prima_comida numeric not null default 0,
    materia_prima_bebida numeric not null default 0,
    materia_prima_variacion_existencias numeric not null default 0,
    -- Otros gastos
    suministros numeric not null default 0,
    mantenimiento numeric not null default 0,
    marketing numeric not null default 0,
    gastos_extra numeric not null default 0,
    inversiones numeric not null default 0,
    financiaciones numeric not null default 0,
    -- Resultados
    resultado_bruto numeric not null default 0,
    resultado_neto numeric not null default 0,
    margen_neto numeric not null default 0,
    -- Ratios
    ratio_personal numeric not null default 0,
    ratio_materia_prima numeric not null default 0,
    ratio_gastos_fijos numeric not null default 0,
    -- Break-even
    break_even_punto numeric not null default 0,
    break_even_dia integer,
    break_even_alcanzado boolean default false,
    -- Comparativas
    vs_mes_anterior_pct numeric,
    vs_mismo_mes_anio_anterior_pct numeric,
    raw_data jsonb default '{}'::jsonb,
    notes text,
    tags text[] default '{}'::text[]
);

-- Índices
create index if not exists idx_expenses_restaurant on operating_expenses(restaurant_id);
create index if not exists idx_expenses_month on operating_expenses(month_year);
create index if not exists idx_monthly_results_restaurant on monthly_results(restaurant_id);
create index if not exists idx_monthly_results_month on monthly_results(month_year);
create unique index if not exists idx_monthly_results_unique on monthly_results(restaurant_id, month_year);

-- Triggers
create or replace function update_updated_at_column() returns trigger as $$
begin new.updated_at = timezone('utc'::text, now()); return new; end;
$$ language plpgsql;

drop trigger if exists update_expenses on operating_expenses;
create trigger update_expenses before update on operating_expenses 
for each row execute function update_updated_at_column();

drop trigger if exists update_results on monthly_results;
create trigger update_results before update on monthly_results 
for each row execute function update_updated_at_column();

-- RLS
alter table operating_expenses enable row level security;
alter table monthly_results enable row level security;

create policy "Users can CRUD their own expenses" on operating_expenses
for all using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

create policy "Users can CRUD their own results" on monthly_results
for all using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

-- =====================================================
-- PARTE 2: FUNCIONES RPC
-- =====================================================

create or replace function calculate_monthly_results(
    p_restaurant_id uuid,
    p_year integer,
    p_month integer
) returns monthly_results as $$
declare
    v_result monthly_results;
    v_month_year text;
    v_start_date date;
    v_total_ingresos numeric;
    v_personal_total numeric;
    v_materia_total numeric;
    v_otros_gastos numeric;
    v_inversiones numeric;
    v_financiaciones numeric;
begin
    v_month_year := p_year || '-' || lpad(p_month::text, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    
    -- Calcular ingresos desde sales_periods
    select coalesce(sum(si.revenue_total), 0) into v_total_ingresos
    from sales_periods sp
    join sales_items si on si.period_id = sp.id
    where sp.restaurant_id = p_restaurant_id
    and sp.start_date >= v_start_date
    and sp.start_date < v_start_date + interval '1 month';
    
    -- Agregar gastos por categoría
    select 
        coalesce(sum(case when category = 'personal' then amount else 0 end), 0),
        coalesce(sum(case when category = 'materia_prima' then amount else 0 end), 0),
        coalesce(sum(case when category in ('suministros', 'mantenimiento', 'marketing', 'gastos_varios') then amount else 0 end), 0),
        coalesce(sum(case when category = 'inversiones' then amount else 0 end), 0),
        coalesce(sum(case when category = 'financiaciones' then amount else 0 end), 0)
    into v_personal_total, v_materia_total, v_otros_gastos, v_inversiones, v_financiaciones
    from operating_expenses
    where restaurant_id = p_restaurant_id and month_year = v_month_year;
    
    -- Construir resultado
    v_result.restaurant_id := p_restaurant_id;
    v_result.month_year := v_month_year;
    v_result.year := p_year;
    v_result.month := p_month;
    v_result.month_name := case p_month
        when 1 then 'Enero' when 2 then 'Febrero' when 3 then 'Marzo'
        when 4 then 'Abril' when 5 then 'Mayo' when 6 then 'Junio'
        when 7 then 'Julio' when 8 then 'Agosto' when 9 then 'Septiembre'
        when 10 then 'Octubre' when 11 then 'Noviembre' when 12 then 'Diciembre'
    end;
    v_result.ingresos_netos := v_total_ingresos * 0.95;
    v_result.ingresos_extra := v_total_ingresos * 0.05;
    v_result.total_ingresos := v_total_ingresos;
    v_result.personal_total := v_personal_total;
    v_result.materia_prima_total := v_materia_total;
    v_result.suministros := v_otros_gastos * 0.4;
    v_result.mantenimiento := v_otros_gastos * 0.2;
    v_result.marketing := v_otros_gastos * 0.2;
    v_result.gastos_extra := v_otros_gastos * 0.2;
    v_result.inversiones := v_inversiones;
    v_result.financiaciones := v_financiaciones;
    v_result.resultado_bruto := v_total_ingresos - v_personal_total - v_materia_total - v_otros_gastos;
    v_result.resultado_neto := v_result.resultado_bruto - v_inversiones - v_financiaciones;
    v_result.margen_neto := case when v_total_ingresos > 0 then (v_result.resultado_neto / v_total_ingresos) * 100 else 0 end;
    v_result.ratio_personal := case when v_total_ingresos > 0 then (v_personal_total / v_total_ingresos) * 100 else 0 end;
    v_result.ratio_materia_prima := case when v_total_ingresos > 0 then (v_materia_total / v_total_ingresos) * 100 else 0 end;
    v_result.ratio_gastos_fijos := case when v_total_ingresos > 0 then ((v_otros_gastos + v_financiaciones) / v_total_ingresos) * 100 else 0 end;
    v_result.break_even_punto := v_personal_total + v_otros_gastos + v_financiaciones;
    v_result.break_even_alcanzado := v_total_ingresos > v_result.break_even_punto;
    v_result.is_closed := false;
    
    return v_result;
end;
$$ language plpgsql security definer;

create or replace function close_month(
    p_restaurant_id uuid,
    p_year integer,
    p_month integer
) returns monthly_results as $$
declare
    v_result monthly_results;
    v_month_year text;
begin
    v_month_year := p_year || '-' || lpad(p_month::text, 2, '0');
    v_result := calculate_monthly_results(p_restaurant_id, p_year, p_month);
    v_result.is_closed := true;
    v_result.closed_at := timezone('utc'::text, now());
    v_result.closed_by := auth.uid();
    
    insert into monthly_results (
        restaurant_id, month_year, year, month, month_name,
        is_closed, closed_at, closed_by,
        ingresos_netos, ingresos_extra, total_ingresos,
        personal_total, materia_prima_total,
        suministros, mantenimiento, marketing, gastos_extra,
        inversiones, financiaciones,
        resultado_bruto, resultado_neto, margen_neto,
        ratio_personal, ratio_materia_prima, ratio_gastos_fijos,
        break_even_punto, break_even_alcanzado
    ) values (
        v_result.restaurant_id, v_result.month_year, v_result.year, v_result.month, v_result.month_name,
        v_result.is_closed, v_result.closed_at, v_result.closed_by,
        v_result.ingresos_netos, v_result.ingresos_extra, v_result.total_ingresos,
        v_result.personal_total, v_result.materia_prima_total,
        v_result.suministros, v_result.mantenimiento, v_result.marketing, v_result.gastos_extra,
        v_result.inversiones, v_result.financiaciones,
        v_result.resultado_bruto, v_result.resultado_neto, v_result.margen_neto,
        v_result.ratio_personal, v_result.ratio_materia_prima, v_result.ratio_gastos_fijos,
        v_result.break_even_punto, v_result.break_even_alcanzado
    )
    on conflict (restaurant_id, month_year) 
    do update set
        is_closed = excluded.is_closed,
        closed_at = excluded.closed_at,
        closed_by = excluded.closed_by,
        resultado_bruto = excluded.resultado_bruto,
        resultado_neto = excluded.resultado_neto,
        margen_neto = excluded.margen_neto,
        updated_at = timezone('utc'::text, now());
    
    return v_result;
end;
$$ language plpgsql security definer;

-- =====================================================
-- PARTE 3: DATOS DE PRUEBA (Opcional)
-- =====================================================

-- Para insertar datos de prueba, necesitas:
-- 1. Reemplazar YOUR_RESTAURANT_ID con el ID real de tu restaurante
-- 2. Ejecutar estos INSERTs

/*
-- Ejemplo: Insertar gastos de prueba
INSERT INTO operating_expenses (restaurant_id, expense_date, month_year, category, amount, description) VALUES
('YOUR_RESTAURANT_ID', '2026-01-15', '2026-01', 'personal', 12000, 'Sueldos enero'),
('YOUR_RESTAURANT_ID', '2026-01-10', '2026-01', 'materia_prima', 9500, 'Compra proveedor A'),
('YOUR_RESTAURANT_ID', '2026-01-05', '2026-01', 'materia_prima', 4200, 'Bebidas proveedor B'),
('YOUR_RESTAURANT_ID', '2026-01-20', '2026-01', 'suministros', 1800, 'Factura eléctrica');

-- Ejemplo: Cerrar mes de prueba (ejecutar después de insertar gastos)
SELECT close_month('YOUR_RESTAURANT_ID', 2026, 1);
*/

-- =====================================================
-- PARTE 4: VERIFICACIÓN
-- =====================================================

-- Verificar que todo se creó correctamente
select 'Tablas creadas:' as info;
select tablename from pg_tables where schemaname = 'public' and tablename in ('operating_expenses', 'monthly_results');

select 'Funciones creadas:' as info;
select proname from pg_proc where proname in ('calculate_monthly_results', 'close_month', 'update_updated_at_column');

select 'Índices creados:' as info;
select indexname from pg_indexes where tablename in ('operating_expenses', 'monthly_results');

-- Listo! El schema está instalado.
-- Ahora puedes:
-- 1. Insertar gastos en operating_expenses
-- 2. Calcular resultados con calculate_monthly_results(uuid, año, mes)
-- 3. Cerrar mes con close_month(uuid, año, mes)
