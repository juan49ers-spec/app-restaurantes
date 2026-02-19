-- PASO 3: Insertar SEED DATA
-- Ejecutar DESPUÉS del PASO 1 y 2
-- Restaurant ID: 84ca777a-f800-4546-805d-733c845f599d

-- 1. MASTER INGREDIENTES
INSERT INTO master_ingredients (id, restaurant_id, name, base_unit, standard_waste_pct, current_avg_price)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '84ca777a-f800-4546-805d-733c845f599d', 'Tomate Pera', 'kg', 0.10, 2.50),
    ('22222222-2222-2222-2222-222222222222', '84ca777a-f800-4546-805d-733c845f599d', 'Piña Natural', 'u', 0.35, 3.00),
    ('33333333-3333-3333-3333-333333333333', '84ca777a-f800-4546-805d-733c845f599d', 'Cebolla Blanca', 'kg', 0.15, 1.20),
    ('44444444-4444-4444-4444-444444444444', '84ca777a-f800-4546-805d-733c845f599d', 'Macarrones', 'kg', 0.00, 1.80),
    ('55555555-5555-5555-5555-555555555555', '84ca777a-f800-4546-805d-733c845f599d', 'Aceite de Oliva', 'l', 0.00, 8.50);

-- 2. SUPPLIER ITEMS
INSERT INTO supplier_items (restaurant_id, supplier_id, name_on_invoice, sku_on_invoice, last_price, pack_size, master_ingredient_id)
VALUES
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-001', 'Tomate Pera Caja 5kg', 'TOM-5KG-CAJA', 12.50, 5.0, '11111111-1111-1111-1111-111111111111'),
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-002', 'Tomates Rústicos Bolsa 1kg', 'TOM-1KG-BOL', 2.60, 1.0, '11111111-1111-1111-1111-111111111111'),
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-001', 'Piña Golden', 'PIN-GOLD-UNI', 3.00, 1.0, '22222222-2222-2222-2222-222222222222'),
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-003', 'Cebolla Blanca Saco 25kg', 'CEB-25KG-SAC', 28.75, 25.0, '33333333-3333-3333-3333-333333333333'),
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-004', 'Macarrones No.7 Paquete 500g', 'PAST-MAC-500', 0.90, 0.5, '44444444-4444-4444-4444-444444444444'),
    ('84ca777a-f800-4546-805d-733c845f599d', 'SUPP-005', 'Aceite Oliva Virgen 1L', 'ACE-OLI-1L', 8.50, 1.0, '55555555-5555-5555-5555-555555555555');

-- 3. RECIPE
INSERT INTO recipes (id, restaurant_id, name, selling_price, target_margin_pct)
VALUES 
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '84ca777a-f800-4546-805d-733c845f599d', 'Macarrones con Tomate', 12.00, 75.00);

-- 4. RECIPE INGREDIENTS
INSERT INTO recipe_ingredients (recipe_id, master_ingredient_id, quantity_gross, quantity_net, yield_factor, cost_at_time)
VALUES
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '44444444-4444-4444-4444-444444444444', 0.100, 0.100, 1.000, 0.18),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '11111111-1111-1111-1111-111111111111', 0.150, 0.135, 0.900, 0.38),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '33333333-3333-3333-3333-333333333333', 0.050, 0.043, 0.850, 0.06),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '55555555-5555-5555-5555-555555555555', 0.020, 0.020, 1.000, 0.17);

-- Verificar datos insertados
SELECT 
    name,
    base_unit,
    (standard_waste_pct * 100)::text || '%' AS waste_pct,
    '€' || current_avg_price::text AS price
FROM master_ingredients
WHERE restaurant_id = '84ca777a-f800-4546-805d-733c845f599d'
ORDER BY name;
