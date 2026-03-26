import { z } from 'zod';

// 1. Master Ingredients
export const MasterIngredientSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    base_unit: z.enum(['kg', 'l', 'u']),
    category: z.string().optional(),
    standard_waste_pct: z.number().min(0).max(1).default(0),
    current_avg_price: z.number().min(0).default(0),
    last_updated_at: z.date().optional(),
    // Advanced Inventory - Soft Delete
    is_active: z.boolean().default(true),
    archived_at: z.date().optional(),
    allergens: z.array(z.string()).optional()
});

export type MasterIngredient = z.infer<typeof MasterIngredientSchema>;

export const CreateIngredientSchema = MasterIngredientSchema.omit({
    id: true,
    restaurant_id: true,
    last_updated_at: true
});

export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>;

// ... (omitted)

// ... (omitted)

export interface ScannedItem {
    line_text?: string;
    qty?: number;
    unit?: string;
    price?: number;
    total?: number;
    description?: string;
    category?: string; // New field
}

// Scenarios
export const ScenarioSchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    name: z.string().min(1, "Name is required"),
    base_revenue: z.number(),
    base_expenses: z.number(),
    // Adjustments (Matching FinancialSimulator.tsx UI state)
    adjustments: z.object({
        priceIncrease: z.number().default(0),
        volumeChange: z.number().default(0),
        cogsReduction: z.number().default(0),
        laborSavings: z.number().default(0),
        fixedCostAdj: z.number().default(0)
    }),
    created_at: z.date().optional()
})

export type Scenario = z.infer<typeof ScenarioSchema>

// 0. Restaurants
export const RestaurantSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    owner_id: z.string().uuid(),
    created_at: z.date().optional(),
    modules: z.object({
        financial_control: z.enum(['none', 'basic', 'premium']).default('basic'),
        operativa: z.enum(['none', 'basic', 'premium']).default('basic')
    }).optional()
});

export const RestaurantModulesSchema = z.object({
    financial_control: z.enum(['none', 'basic', 'premium']).default('premium'),
    operativa: z.enum(['none', 'basic', 'premium']).default('none'),
    proveedores: z.enum(['none', 'basic', 'premium']).default('none'),
    personal: z.enum(['none', 'basic', 'premium']).default('none')
});

export type RestaurantModules = z.infer<typeof RestaurantModulesSchema>;

export type Restaurant = z.infer<typeof RestaurantSchema>;

// 2. Recipes
export const RecipeSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    name: z.string().min(1),
    selling_price: z.number().min(0).optional(),
    current_cost: z.number().min(0).default(0),
    target_margin_pct: z.number().optional(),
    hourly_rate: z.number().min(0).default(0), // Persist labor rate per hour (e.g., 15€/h)
    prep_time_minutes: z.number().min(0).default(0), // Labor Cost
    yields: z.number().min(1).default(1), // Base servings/units
    allergens: z.array(z.string()).optional(), // Auto-aggregated
    updated_at: z.date().optional()
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const CreateRecipeSchema = RecipeSchema.omit({
    id: true,
    restaurant_id: true,
    updated_at: true,
    current_cost: true // Calculated on server
});

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;

// 3. Recipe Ingredients
export const RecipeIngredientSchema = z.object({
    id: z.string().uuid().optional(),
    recipe_id: z.string().uuid(),
    master_ingredient_id: z.string().uuid().optional().nullable(),
    sub_recipe_id: z.string().uuid().optional().nullable(),
    quantity_gross: z.number().positive(),
    quantity_net: z.number().positive(),
    yield_factor: z.number().min(0).max(1),
    cost_at_time: z.number().optional()
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

// 4. Invoices
export const InvoiceStatusSchema = z.enum(['uploading', 'processing', 'review_required', 'completed', 'error']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;



export const InvoiceSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    supplier_id: z.string().uuid().optional(),
    file_url: z.string().optional(),
    status: InvoiceStatusSchema,
    invoice_number: z.string().optional(),
    total_amount: z.number().optional(),
    date: z.string().optional(), // ISO Date
    scanned_data: z.any().optional(), // JSONB
    // Campos añadidos para trazabilidad de Drive:
    drive_file_id: z.string().optional(),
    drive_file_name: z.string().optional(),
    extracted_data: z.any().optional(), // JSONB del LLM
    confidence_score: z.number().min(0).max(1).default(0).optional(),
    processing_error: z.string().optional(),
    created_at: z.string().optional()
})

export type Invoice = z.infer<typeof InvoiceSchema>;

// 5. Supplier Aliases
export const SupplierAliasSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    alias_name: z.string().min(1),
    supplier_id: z.string().uuid().optional(),
    master_ingredient_id: z.string().uuid().optional(),
    confidence_score: z.number().default(1.0)
})

export type SupplierAlias = z.infer<typeof SupplierAliasSchema>;

// 6. Suppliers
export const SupplierSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    tax_id: z.string().optional(),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().optional(),
    payment_terms: z.string().optional(),
    created_at: z.date().optional(),
    // Scorecard fields (Phase 4)
    reliability_score: z.number().min(0).max(100).default(100).optional(),
    trend_direction: z.enum(['improving', 'stable', 'declining']).default('stable').optional(),
    total_orders: z.number().default(0).optional(),
    avg_price_variance: z.number().default(0).optional(),
    // Contract fields
    contract_renewal_date: z.string().optional(), // ISO date
    last_price_audit: z.string().optional(),
})

export type Supplier = z.infer<typeof SupplierSchema>;

// 7. Price Alert Rules (Phase 4)
export const PriceAlertRuleSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    ingredient_id: z.string().uuid().optional(), // Optional if category level
    category: z.string().optional(),
    max_variance_pct: z.number().min(1).max(100),
    is_active: z.boolean().default(true),
    created_at: z.date().optional()
})

export type PriceAlertRule = z.infer<typeof PriceAlertRuleSchema>;

// 8. Price History
export const PriceHistorySchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    entity_id: z.string().uuid(), // Ingredient or Recipe ID
    entity_type: z.enum(['INGREDIENT', 'RECIPE']),
    price: z.number(), // The new price/cost
    previous_price: z.number().optional(),
    change_pct: z.number().optional(),
    created_at: z.date().optional() // Default to now() in DB
});

export type PriceHistory = z.infer<typeof PriceHistorySchema>;

// 9. Menu Engineering Reports
export const MenuReportStatusSchema = z.enum(['DRAFT', 'ANALYZED']);
export type MenuReportStatus = z.infer<typeof MenuReportStatusSchema>;

export const MenuReportSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    date_from: z.string().optional(), // ISO Date
    date_to: z.string().optional(),   // ISO Date
    status: MenuReportStatusSchema.default('DRAFT'),
    avg_popularity: z.number().optional(), // Calculated (100% / Items * 0.7)
    avg_margin: z.number().optional(),     // Calculated (Weighted)
    created_at: z.date().optional()
});

export type MenuReport = z.infer<typeof MenuReportSchema>;

export const MenuReportItemSchema = z.object({
    id: z.string().uuid().optional(),
    report_id: z.string().uuid(),
    recipe_id: z.string().uuid(),
    quantity_sold: z.number().min(0).default(0),
    // Snapshots at time of report creation
    cost_per_unit: z.number().min(0),
    price_per_unit: z.number().min(0),
    // Calculated fields
    contribution_margin: z.number().optional(), // (Price - Cost)
    total_sales: z.number().optional(),         // (Price * Qty)
    total_cost: z.number().optional(),          // (Cost * Qty)
    total_profit: z.number().optional(),        // (Margin * Qty)
    popularity_pct: z.number().optional(),      // (Qty / Total Qty)
    classification: z.enum(['STAR', 'PLOWHORSE', 'PUZZLE', 'DOG']).optional()
});


export type MenuReportItem = z.infer<typeof MenuReportItemSchema>;

// 10. Financial Control (Phase 3)

export const DailySalesSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    date: z.string(), // ISO Date YYYY-MM-DD
    revenue_total: z.number().default(0),
    // Multi-IVA Breakdown
    base_10: z.number().default(0),    // Base Imponible 10%
    tax_10: z.number().default(0),     // Cuota IVA 10%
    base_21: z.number().default(0),    // Base Imponible 21%
    tax_21: z.number().default(0),     // Cuota IVA 21%
    // Optional details
    revenue_dine_in: z.number().default(0),
    revenue_takeout: z.number().default(0),
    revenue_delivery: z.number().default(0),
    // Delivery por plataforma
    delivery_uber_eats: z.number().default(0).optional(),
    delivery_just_eat: z.number().default(0).optional(),
    delivery_al_punto: z.number().default(0).optional(),
    delivery_glovo: z.number().default(0).optional(),
    // Método de pago
    cash_amount: z.number().default(0).optional(),
    card_amount: z.number().default(0).optional(),
    // Aggregated tax for backward compatibility
    iva_collected: z.number().default(0),
    total_covers: z.number().int().default(0),
    labor_hours: z.number().default(0),
    day_status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).default('OPEN'),
    cost_of_goods: z.number().default(0),
    labor_cost: z.number().default(0),
    source: z.string().optional(),
    created_at: z.string().optional()
});

export type DailySales = z.infer<typeof DailySalesSchema>;

// NEW: Monthly Targets (Goals)
export const MonthlyTargetSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    month_year: z.string(), // YYYY-MM
    revenue_target: z.number().default(0),
    cogs_target_pct: z.number().default(0), // % of revenue
    labor_target_pct: z.number().default(0), // % of revenue
    updated_at: z.string().optional()
});

export type MonthlyTarget = z.infer<typeof MonthlyTargetSchema>;

// EXPENSE CATEGORIES - STRICT ENUM v2.0
// Grupo A: Personal
// Grupo B: Coste de Producto (COGS)
// Grupo C: Estructura y Operaciones
// Grupo D: Financiero y Otros

export const OperatingExpenseCategorySchema = z.enum([
    // GRUPO A: PERSONAL (Staff)
    'NOMINAS_LIQUIDAS',
    'SEGURIDAD_SOCIAL',
    'EN_MANO_PERSONAL',
    // GRUPO B: COSTE DE PRODUCTO (COGS)
    'PROVEEDORES_COMIDA',
    'PROVEEDORES_BEBIDA',
    'VARIACION_EXISTENCIAS',
    // GRUPO C: ESTRUCTURA Y OPERACIONES
    'ALQUILER',
    'SUMINISTROS',
    'RECIBOS_SEGUROS',
    'MANTENIMIENTO',
    'PUBLICIDAD',
    'GASTOS_EN_MANO',
    // GRUPO D: FINANCIERO Y OTROS
    'FINANCIACION',
    'INVERSIONES',
    'OTROS'
]);

export type OperatingExpenseCategory = z.infer<typeof OperatingExpenseCategorySchema>;

// Category groups for UI organization
export const EXPENSE_GROUPS = {
    PERSONAL: ['NOMINAS_LIQUIDAS', 'SEGURIDAD_SOCIAL', 'EN_MANO_PERSONAL'] as const,
    COGS: ['PROVEEDORES_COMIDA', 'PROVEEDORES_BEBIDA', 'VARIACION_EXISTENCIAS'] as const,
    OPERATIONS: ['ALQUILER', 'SUMINISTROS', 'RECIBOS_SEGUROS', 'MANTENIMIENTO', 'PUBLICIDAD', 'GASTOS_EN_MANO'] as const,
    FINANCIAL: ['FINANCIACION', 'INVERSIONES', 'OTROS'] as const
};

// Human-readable labels
export const EXPENSE_CATEGORY_LABELS: Record<OperatingExpenseCategory, string> = {
    'NOMINAS_LIQUIDAS': 'Nóminas Líquidas',
    'SEGURIDAD_SOCIAL': 'Seguridad Social',
    'EN_MANO_PERSONAL': 'Pagos en Mano (Adelantos)',
    'PROVEEDORES_COMIDA': 'Proveedores Comida',
    'PROVEEDORES_BEBIDA': 'Proveedores Bebida',
    'VARIACION_EXISTENCIAS': 'Variación Existencias',
    'ALQUILER': 'Alquiler Local',
    'SUMINISTROS': 'Suministros (Luz/Agua/Gas)',
    'RECIBOS_SEGUROS': 'Seguros y Recibos',
    'MANTENIMIENTO': 'Mantenimiento y Reparaciones',
    'PUBLICIDAD': 'Publicidad y Marketing',
    'GASTOS_EN_MANO': 'Gastos Caja Menuda',
    'FINANCIACION': 'Gastos Financieros',
    'INVERSIONES': 'Inversiones (CAPEX)',
    'OTROS': 'Otros Gastos'
};

// Icons for categories
export const EXPENSE_CATEGORY_ICONS: Record<OperatingExpenseCategory, string> = {
    'NOMINAS_LIQUIDAS': 'Users',
    'SEGURIDAD_SOCIAL': 'Shield',
    'EN_MANO_PERSONAL': 'Banknote',
    'PROVEEDORES_COMIDA': 'Beef',
    'PROVEEDORES_BEBIDA': 'Wine',
    'VARIACION_EXISTENCIAS': 'Package',
    'ALQUILER': 'Building',
    'SUMINISTROS': 'Zap',
    'RECIBOS_SEGUROS': 'ShieldCheck',
    'MANTENIMIENTO': 'Wrench',
    'PUBLICIDAD': 'Megaphone',
    'GASTOS_EN_MANO': 'Wallet',
    'FINANCIACION': 'TrendingDown',
    'INVERSIONES': 'Hammer',
    'OTROS': 'MoreHorizontal'
};

// Expense tags for COGS categories
export const EXPENSE_TAGS = {
    PROVEEDORES_COMIDA: ['Carne', 'Pescado', 'Fruta', 'Verdura', 'Lácteos', 'Congelados', 'Secos'] as const,
    PROVEEDORES_BEBIDA: ['Alcohol', 'Refrescos', 'Café', 'Agua', 'Vinos', 'Cervezas'] as const
};

export const OperatingExpenseSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    expense_date: z.string(), // ISO Date
    category: OperatingExpenseCategorySchema,
    amount: z.number(), // Allow negative for inventory variations
    description: z.string().optional(),
    provider_detail: z.string().optional(), // Provider/Detail secondary field
    tag: z.string().optional(), // Tag for COGS (e.g., Carne, Pescado, Alcohol, etc.)
    payment_method: z.enum(['bank', 'cash', 'card', 'transfer', 'other']).default('bank'),
    recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).default('NONE'),
    is_paid: z.boolean().default(true),
    // Tax Fields (Professional Mode)
    taxable_amount: z.number().optional(), // Base Imponible
    tax_rate: z.number().optional(), // 0, 4, 10, 21
    tax_amount: z.number().optional(), // Cuota IVA
    withholding_rate: z.number().optional(), // Retención IRPF % (e.g. 15, 19)
    withholding_amount: z.number().optional(), // Cuota IRPF
    is_professional_invoice: z.boolean().default(false), // Toggle for UI
    created_at: z.string().optional()
});

export type OperatingExpense = z.infer<typeof OperatingExpenseSchema>;

// 11. Employees (Structure Module - Professional Overhaul)


// 11. Employees (Structure Module - Professional Overhaul)
export const StaffRoleSchema = z.enum([
    'MANAGEMENT',
    'KITCHEN_HEAD',
    'KITCHEN_STAFF',
    'FLOOR_MANAGER',
    'FLOOR_STAFF',
    'BAR_STAFF',
    'CLEANING',
    'ADMIN',
    'OTHER'
]);

export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const ContractTypeSchema = z.enum([
    'INDEFINIDO',
    'TEMPORAL',
    'PRACTICAS',
    'AUTONOMO',
    'OTRO'
]);

export type ContractType = z.infer<typeof ContractTypeSchema>;

export const EmployeeSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),

    // HR Details
    role: StaffRoleSchema,
    system_access_level: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'NONE']).default('NONE'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    is_active: z.boolean().default(true).optional(),

    // Contact & Identifiers
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    social_security_number: z.string().optional(), // Sensitive data
    emergency_contact: z.string().optional(),

    // Contract & Compensation
    contract_type: ContractTypeSchema.default('INDEFINIDO'),
    contract_hours_weekly: z.number().min(0).default(40),
    wage_type: z.enum(['HOURLY', 'SALARIED', 'MIXED']).default('HOURLY'),
    hourly_rate: z.number().min(0).default(0),
    monthly_base_salary: z.number().min(0).default(0),

    // UI Helpers
    color_code: z.string().default("#3b82f6"),

    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export type Employee = z.infer<typeof EmployeeSchema>;

// 12. Shifts (Structure Module)
export const ShiftStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ShiftTypeSchema = z.enum(['DESAYUNO', 'ALMUERZO', 'CENA', 'EVENTO', 'OTRO']);
export type ShiftType = z.infer<typeof ShiftTypeSchema>;

export const ShiftSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    employee_id: z.string().uuid(),

    // Scheduling
    date: z.string(), // ISO Date YYYY-MM-DD
    start_time: z.string(), // HH:mm
    end_time: z.string(),   // HH:mm

    // Actuals (for time tracking & variance)
    actual_start_time: z.string().optional(), // HH:mm
    actual_end_time: z.string().optional(),   // HH:mm

    break_minutes: z.number().default(0),
    shift_type: ShiftTypeSchema.optional(),
    status: ShiftStatusSchema.default('scheduled'),

    // Estimated/Actual Cost tracking
    estimated_cost: z.number().default(0).optional(),
    actual_cost: z.number().default(0).optional(),

    notes: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export type Shift = z.infer<typeof ShiftSchema>;

// 13. Policies (Structure Module)
export const PolicyCategorySchema = z.enum([
    'OPERATIONS',
    'HR',
    'SAFETY',
    'HYGIENE',
    'SERVICE_STANDARDS',
    'OTHER'
]);

export type PolicyCategory = z.infer<typeof PolicyCategorySchema>;

export const PolicySchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    is_required: z.boolean().default(true),
    created_at: z.string().optional()
});

export type Policy = z.infer<typeof PolicySchema>;

// 14. Inventory Stock (Control de Stock)
export const InventoryStockSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    current_qty: z.number().min(0).default(0),
    min_qty: z.number().min(0).default(0), // Umbral de alerta
    last_updated: z.string().optional() // ISO timestamp
});

export type InventoryStock = z.infer<typeof InventoryStockSchema>;

// 15. Stock Movements (Historial de movimientos)
export const StockMovementTypeSchema = z.enum(['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT']);
export type StockMovementType = z.infer<typeof StockMovementTypeSchema>;

export const StockMovementSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    type: StockMovementTypeSchema,
    quantity: z.number(), // Positivo = entrada, Negativo = salida
    reference_id: z.string().optional(), // ID de la factura, receta, o log de desperdicios
    notes: z.string().optional(),
    date: z.string(), // ISO Date YYYY-MM-DD
    created_at: z.string().optional()
});

export type StockMovement = z.infer<typeof StockMovementSchema>;

// 16. Daily Recipe Sales (Ventas diarias por receta)
export const DailyRecipeSalesSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    date: z.string(), // ISO Date YYYY-MM-DD
    recipe_id: z.string().uuid(),
    quantity_sold: z.number().int().min(0).default(0),
    created_at: z.string().optional()
});

export type DailyRecipeSales = z.infer<typeof DailyRecipeSalesSchema>;

// 17. Waste Logs (Desperdicios / Mermas)
export const WasteReasonSchema = z.enum([
    'CADUCADO',      // Ingrediente caducado
    'DAÑADO',        // Dañado o en mal estado
    'SOBRANTE',      // Sobrante del día
    'PREPARACION',   // Merma de preparación
    'OTRO'
]);
export type WasteReason = z.infer<typeof WasteReasonSchema>;

export const WasteLogSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    date: z.string(), // ISO Date YYYY-MM-DD
    quantity: z.number().positive(), // Siempre positivo (cantidad perdida)
    unit_cost_snapshot: z.number().min(0).default(0),
    reason: WasteReasonSchema.default('OTRO'),
    employee_name: z.string().optional().nullable(),
    notes: z.string().optional(),
    created_at: z.string().optional()
});

export type WasteLog = z.infer<typeof WasteLogSchema>;

// 18. AI Period Reports (Indicaciones transversales)
export const PeriodReportSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    module_name: z.string(), // e.g. 'BILLING', 'TAXES'
    period_key: z.string(), // e.g. '2026-03', '2026-Q1'
    context_notes: z.string().optional(),
    ai_draft: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export type PeriodReport = z.infer<typeof PeriodReportSchema>;

// 19. Google Drive Sync Config
export const DriveSyncConfigSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    inbox_folder_id: z.string().min(1, "Inbox folder ID is required"),
    processed_folder_id: z.string().min(1, "Processed folder ID is required"),
    review_folder_id: z.string().min(1, "Review folder ID is required"),
    is_active: z.boolean().default(true),
    last_sync_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export type DriveSyncConfig = z.infer<typeof DriveSyncConfigSchema>;

// 20. Inventory Sessions & Counts (Pilar 1: Control de Inventario)
export const InventorySessionStatusSchema = z.enum(['draft', 'completed']);
export type InventorySessionStatus = z.infer<typeof InventorySessionStatusSchema>;

export const InventorySessionSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    date: z.string(), // ISO Date YYYY-MM-DD
    status: InventorySessionStatusSchema.default('draft'),
    notes: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().optional()
});

export type InventorySession = z.infer<typeof InventorySessionSchema>;

export const InventoryCountSchema = z.object({
    id: z.string().uuid().optional(),
    session_id: z.string().uuid(),
    ingredient_id: z.string().uuid(),
    quantity: z.number().min(0).default(0),
    unit_price_snapshot: z.number().min(0).default(0),
    category: z.string().optional(), // Denormalized for rapid filtering
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export type InventoryCount = z.infer<typeof InventoryCountSchema>;


