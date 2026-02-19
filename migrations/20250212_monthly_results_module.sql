-- ==========================================
-- MÓDULO RESULTADOS - Schema Completo
-- ==========================================

-- 1. TABLA: Gastos Operativos (si no existe)
create table if not exists operating_expenses (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Identificación
    restaurant_id uuid references restaurants(id) not null,
    expense_date date not null,
    month_year text not null, -- formato: YYYY-MM para agrupación
    
    -- Categorías de gasto
    category text not null check (category in (
        'personal',           -- Sueldos, SS, IRPF
        'materia_prima',      -- Comida, bebida
        'suministros',        -- Luz, agua, gas, teléfono
        'mantenimiento',      -- Reparaciones, conservación
        'marketing',          -- Publicidad, promociones
        'gastos_varios',      -- Otros gastos operativos
        'inversiones',        -- CAPEX (equipamiento, mobiliario)
        'financiaciones'      -- Intereses, leasing
    )),
    
    -- Detalle
    description text,
    amount numeric not null default 0,
    provider text,
    invoice_number text,
    
    -- Sub-categorías específicas (JSONB para flexibilidad)
    details jsonb default '{}'::jsonb
);

-- Índices para operating_expenses
create index if not exists idx_expenses_restaurant on operating_expenses(restaurant_id);
create index if not exists idx_expenses_date on operating_expenses(expense_date);
create index if not exists idx_expenses_month on operating_expenses(month_year);
create index if not exists idx_expenses_category on operating_expenses(category);

-- 2. TABLA: Resultados Mensuales (snapshots calculados)
create table if not exists monthly_results (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Identificación
    restaurant_id uuid references restaurants(id) not null,
    month_year text not null, -- formato: YYYY-MM
    year integer not null,
    month integer not null, -- 1-12
    month_name text not null, -- 'Enero', 'Febrero', etc.
    
    -- Estado
    is_closed boolean default false, -- true cuando se "cierra el mes"
    closed_at timestamp with time zone,
    closed_by uuid references auth.users(id),
    
    -- INGRESOS
    ingresos_netos numeric not null default 0,
    ingresos_extra numeric not null default 0,
    total_ingresos numeric not null default 0,
    
    -- GASTOS: Personal (desglosado)
    personal_total numeric not null default 0,
    personal_sueldos_netos numeric not null default 0,
    personal_seguridad_social numeric not null default 0,
    personal_irpf numeric not null default 0,
    
    -- GASTOS: Materia Prima (desglosado)
    materia_prima_total numeric not null default 0,
    materia_prima_comida numeric not null default 0,
    materia_prima_bebida numeric not null default 0,
    materia_prima_variacion_existencias numeric not null default 0,
    
    -- GASTOS: Otros Operativos
    suministros numeric not null default 0,
    mantenimiento numeric not null default 0,
    marketing numeric not null default 0,
    gastos_extra numeric not null default 0,
    
    -- GASTOS: Inversiones y Financiaciones
    inversiones numeric not null default 0,
    financiaciones numeric not null default 0,
    
    -- RESULTADOS
    resultado_bruto numeric not null default 0,
    resultado_neto numeric not null default 0,
    margen_neto numeric not null default 0, -- porcentaje
    
    -- RATIOS Y BENCHMARKS
    ratio_personal numeric not null default 0, -- % sobre ventas
    ratio_materia_prima numeric not null default 0,
    ratio_gastos_fijos numeric not null default 0,
    
    -- BREAK-EVEN
    break_even_punto numeric not null default 0,
    break_even_dia integer,
    break_even_alcanzado boolean default false,
    
    -- COMPARATIVAS (para análisis)
    vs_mes_anterior_pct numeric, -- variación vs mes anterior
    vs_mismo_mes_anio_anterior_pct numeric, -- variación YoY
    
    -- DATOS BRUTOS (para debugging y recálculos)
    raw_data jsonb default '{}'::jsonb,
    
    -- Metadatos
    notes text,
    tags text[] default '{}'::text[]
);

-- Índices para monthly_results
create index if not exists idx_monthly_results_restaurant on monthly_results(restaurant_id);
create index if not exists idx_monthly_results_month on monthly_results(month_year);
create index if not exists idx_monthly_results_year_month on monthly_results(year, month);
create index if not exists idx_monthly_results_closed on monthly_results(is_closed);
create unique index if not exists idx_monthly_results_unique 
    on monthly_results(restaurant_id, month_year);

-- 3. TRIGGER: Actualizar updated_at automáticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_operating_expenses_updated_at on operating_expenses;
create trigger update_operating_expenses_updated_at
    before update on operating_expenses
    for each row
    execute function update_updated_at_column();

drop trigger if exists update_monthly_results_updated_at on monthly_results;
create trigger update_monthly_results_updated_at
    before update on monthly_results
    for each row
    execute function update_updated_at_column();

-- 4. RLS (Row Level Security)

-- Operating Expenses
alter table operating_expenses enable row level security;

create policy "Users can view their own expenses" on operating_expenses
    for select using (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

create policy "Users can insert their own expenses" on operating_expenses
    for insert with check (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

create policy "Users can update their own expenses" on operating_expenses
    for update using (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

create policy "Users can delete their own expenses" on operating_expenses
    for delete using (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

-- Monthly Results
alter table monthly_results enable row level security;

create policy "Users can view their own results" on monthly_results
    for select using (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

create policy "Users can insert their own results" on monthly_results
    for insert with check (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

create policy "Users can update their own results" on monthly_results
    for update using (
        restaurant_id in (
            select id from restaurants where owner_id = auth.uid()
        )
    );

-- 5. FUNCIÓN RPC: Calcular resultados de un mes
-- Esta función agrega datos de ventas y gastos para generar el snapshot

create or replace function calculate_monthly_results(
    p_restaurant_id uuid,
    p_year integer,
    p_month integer
)
returns monthly_results as $$
declare
    v_result monthly_results;
    v_month_year text;
    v_start_date date;
    v_end_date date;
    v_total_ingresos numeric;
    v_ingresos_netos numeric;
    v_ingresos_extra numeric;
    v_personal_total numeric;
    v_materia_total numeric;
    v_otros_gastos numeric;
    v_inversiones numeric;
    v_financiaciones numeric;
begin
    -- Formato del mes
    v_month_year := p_year || '-' || lpad(p_month::text, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;
    
    -- Calcular ingresos desde sales_periods/sales_items
    select 
        coalesce(sum(si.revenue_total), 0)
    into v_total_ingresos
    from sales_periods sp
    join sales_items si on si.period_id = sp.id
    where sp.restaurant_id = p_restaurant_id
    and sp.start_date >= v_start_date
    and sp.end_date <= v_end_date;
    
    -- Separar ingresos netos vs extras (lógica simplificada)
    v_ingresos_netos := v_total_ingresos * 0.95; -- 95% netos
    v_ingresos_extra := v_total_ingresos * 0.05; -- 5% extras
    
    -- Agregar gastos por categoría
    select 
        coalesce(sum(case when category = 'personal' then amount else 0 end), 0),
        coalesce(sum(case when category = 'materia_prima' then amount else 0 end), 0),
        coalesce(sum(case when category in ('suministros', 'mantenimiento', 'marketing', 'gastos_varios') then amount else 0 end), 0),
        coalesce(sum(case when category = 'inversiones' then amount else 0 end), 0),
        coalesce(sum(case when category = 'financiaciones' then amount else 0 end), 0)
    into v_personal_total, v_materia_total, v_otros_gastos, v_inversiones, v_financiaciones
    from operating_expenses
    where restaurant_id = p_restaurant_id
    and month_year = v_month_year;
    
    -- Calcular resultados
    v_result.resultado_bruto := v_total_ingresos - (v_personal_total + v_materia_total + v_otros_gastos);
    v_result.resultado_neto := v_result.resultado_bruto - v_inversiones - v_financiaciones;
    v_result.margen_neto := case 
        when v_total_ingresos > 0 then (v_result.resultado_neto / v_total_ingresos) * 100
        else 0 
    end;
    
    -- Calcular ratios
    v_result.ratio_personal := case when v_total_ingresos > 0 then (v_personal_total / v_total_ingresos) * 100 else 0 end;
    v_result.ratio_materia_prima := case when v_total_ingresos > 0 then (v_materia_total / v_total_ingresos) * 100 else 0 end;
    v_result.ratio_gastos_fijos := case when v_total_ingresos > 0 then ((v_otros_gastos + v_financiaciones) / v_total_ingresos) * 100 else 0 end;
    
    -- Break-even simple (aproximado)
    v_result.break_even_punto := v_personal_total + v_otros_gastos + v_financiaciones;
    
    -- Comparativas (si hay datos del mes anterior)
    select ((v_total_ingresos - total_ingresos) / total_ingresos) * 100
    into v_result.vs_mes_anterior_pct
    from monthly_results
    where restaurant_id = p_restaurant_id
    and month_year = to_char(v_start_date - interval '1 month', 'YYYY-MM')
    limit 1;
    
    -- Comparativa año anterior
    select ((v_total_ingresos - total_ingresos) / total_ingresos) * 100
    into v_result.vs_mismo_mes_anio_anterior_pct
    from monthly_results
    where restaurant_id = p_restaurant_id
    and year = p_year - 1
    and month = p_month
    limit 1;
    
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
    v_result.ingresos_netos := v_ingresos_netos;
    v_result.ingresos_extra := v_ingresos_extra;
    v_result.total_ingresos := v_total_ingresos;
    v_result.personal_total := v_personal_total;
    v_result.materia_prima_total := v_materia_total;
    v_result.suministros := v_otros_gastos * 0.4; -- aproximado
    v_result.mantenimiento := v_otros_gastos * 0.2;
    v_result.marketing := v_otros_gastos * 0.2;
    v_result.gastos_extra := v_otros_gastos * 0.2;
    v_result.inversiones := v_inversiones;
    v_result.financiaciones := v_financiaciones;
    v_result.is_closed := false;
    
    return v_result;
end;
$$ language plpgsql security definer;

-- 6. FUNCIÓN RPC: Cerrar mes (guardar snapshot)
create or replace function close_month(
    p_restaurant_id uuid,
    p_year integer,
    p_month integer
)
returns monthly_results as $$
declare
    v_result monthly_results;
    v_month_year text;
begin
    v_month_year := p_year || '-' || lpad(p_month::text, 2, '0');
    
    -- Calcular resultados actualizados
    v_result := calculate_monthly_results(p_restaurant_id, p_year, p_month);
    
    -- Marcar como cerrado
    v_result.is_closed := true;
    v_result.closed_at := timezone('utc'::text, now());
    v_result.closed_by := auth.uid();
    
    -- Insertar o actualizar
    insert into monthly_results (
        restaurant_id, month_year, year, month, month_name,
        is_closed, closed_at, closed_by,
        ingresos_netos, ingresos_extra, total_ingresos,
        personal_total, personal_sueldos_netos, personal_seguridad_social, personal_irpf,
        materia_prima_total, materia_prima_comida, materia_prima_bebida, materia_prima_variacion_existencias,
        suministros, mantenimiento, marketing, gastos_extra,
        inversiones, financiaciones,
        resultado_bruto, resultado_neto, margen_neto,
        ratio_personal, ratio_materia_prima, ratio_gastos_fijos,
        break_even_punto, vs_mes_anterior_pct, vs_mismo_mes_anio_anterior_pct
    ) values (
        v_result.restaurant_id, v_result.month_year, v_result.year, v_result.month, v_result.month_name,
        v_result.is_closed, v_result.closed_at, v_result.closed_by,
        v_result.ingresos_netos, v_result.ingresos_extra, v_result.total_ingresos,
        v_result.personal_total, v_result.personal_sueldos_netos, v_result.personal_seguridad_social, v_result.personal_irpf,
        v_result.materia_prima_total, v_result.materia_prima_comida, v_result.materia_prima_bebida, v_result.materia_prima_variacion_existencias,
        v_result.suministros, v_result.mantenimiento, v_result.marketing, v_result.gastos_extra,
        v_result.inversiones, v_result.financiaciones,
        v_result.resultado_bruto, v_result.resultado_neto, v_result.margen_neto,
        v_result.ratio_personal, v_result.ratio_materia_prima, v_result.ratio_gastos_fijos,
        v_result.break_even_punto, v_result.vs_mes_anterior_pct, v_result.vs_mismo_mes_anio_anterior_pct
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

-- 7. COMENTARIOS para documentación
comment on table monthly_results is 'Snapshots mensuales de resultados financieros calculados';
comment on table operating_expenses is 'Gastos operativos del restaurante por categoría';
comment on function calculate_monthly_results is 'Calcula resultados agregando ventas y gastos de un mes específico';
comment on function close_month is 'Cierra un mes guardando el snapshot de resultados';
