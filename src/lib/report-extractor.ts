/**
 * Report Extractor — Extrae datos financieros de informes mensuales PDF (tipo Chamaca)
 *
 * Pipeline: PDF → pdftotext (local) → texto plano → LLM structuring → JSON tipado
 * Alternativa: si no hay LLM key, usa regex parsing como fallback.
 */

import { OperatingExpenseCategory } from "@/types/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyReportBilling {
    total_revenue: number;           // Facturación total bruta
    net_revenue: number;             // Ingresos netos (tras delivery)
    days_open: number;
    avg_daily_revenue: number;
    // Métodos de pago (%)
    card_pct: number;
    cash_pct: number;
    // Delivery breakdown
    delivery_total: number;
    delivery_uber_eats: number;
    delivery_just_eat: number;
    delivery_al_punto: number;
    delivery_glovo: number;
    // Día de la semana con facturación media
    weekday_averages?: Record<string, number>;
}

export interface MonthlyReportExpense {
    category: OperatingExpenseCategory;
    amount: number;
    subcategories?: Array<{
        name: string;
        provider?: string;
        amount: number;
    }>;
}

export interface MonthlyReportExpenses {
    total: number;
    breakdown: MonthlyReportExpense[];
    // Materia prima detallada
    food_suppliers?: Array<{ name: string; amount: number }>;
    beverage_suppliers?: Array<{ name: string; amount: number }>;
    inventory_value?: number;        // Valor inventario final
    inventory_variation?: number;    // Variación existencias
}

export interface MonthlyReportTaxes {
    // IVA trimestral
    iva_repercutido: number;         // IVA cobrado
    iva_soportado: number;           // IVA pagado
    iva_a_pagar: number;             // Diferencia
    iva_by_month?: Array<{
        month: string;
        repercutido: number;
        soportado: number;
        neto: number;
    }>;
    // IRPF
    irpf_modelo_111?: number;
    irpf_modelo_115?: number;
    irpf_total?: number;
}

export interface MonthlyReportPnL {
    net_revenue: number;
    total_expenses: number;
    profit_loss: number;             // Beneficio/Pérdida
    profit_margin_pct: number;       // Rentabilidad %
}

export interface ExtractedMonthlyReport {
    // Metadata
    month: string;                   // YYYY-MM
    month_name: string;              // "Diciembre 2025"
    restaurant_name?: string;

    // Secciones
    billing: MonthlyReportBilling;
    expenses: MonthlyReportExpenses;
    taxes: MonthlyReportTaxes;
    pnl: MonthlyReportPnL;

    // Ratios clave
    ratios: {
        personal_pct: number;        // Personal / Ingresos
        materia_prima_pct: number;   // MP / Ingresos
        suministros_pct: number;     // Suministros / Ingresos
        total_cost_pct: number;      // Total gastos / Ingresos
    };

    // Conclusiones del informe (texto)
    conclusions?: string;
    confidence: number;
}

export interface ReportExtractionResult {
    success: boolean;
    data?: ExtractedMonthlyReport;
    error?: string;
    raw_text?: string;
}

// ─── Mapeo de categorías del informe → schema OperatingExpenseCategory ──────

const CATEGORY_MAP: Record<string, OperatingExpenseCategory> = {
    "PERSONAL": "NOMINAS_LIQUIDAS",
    "SUELDOS": "NOMINAS_LIQUIDAS",
    "SEGUROS SOCIALES": "SEGURIDAD_SOCIAL",
    "DESPIDOS": "NOMINAS_LIQUIDAS",
    "REC MEDICO Y FORMACIÓN": "NOMINAS_LIQUIDAS",
    "REC MÉDICO Y FORM": "NOMINAS_LIQUIDAS",
    "MATERIA PRIMA": "PROVEEDORES_COMIDA",
    "PROVEEDORES COMIDAS": "PROVEEDORES_COMIDA",
    "PROVEEDORES BEBIDAS": "PROVEEDORES_BEBIDA",
    "VARIACIÓN DE EXISTENCIAS": "VARIACION_EXISTENCIAS",
    "SUMINISTROS": "SUMINISTROS",
    "SUMINISTROS FIJOS": "SUMINISTROS",
    "SUMINISTROS VARIABLES": "SUMINISTROS",
    "MANTENIMIENTO": "MANTENIMIENTO",
    "MARKETING": "PUBLICIDAD",
    "EXTRA": "GASTOS_EN_MANO",
    "INVERSIONES": "INVERSIONES",
    "FINANCIACIONES": "FINANCIACION",
    "FINANCIACIÓN": "FINANCIACION",
};

// ─── Regex Parser (Fallback sin LLM) ────────────────────────────────────────

function parseNumber(str: string): number {
    if (!str || str.trim() === "-" || str.trim() === "") return 0;
    // "25.487,90" → 25487.90 | "1.317,67 €" → 1317.67
    return parseFloat(
        str.replace(/[€%\s]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    ) || 0;
}

const MONTH_NAMES: Record<string, string> = {
    ENERO: "01", FEBRERO: "02", MARZO: "03", ABRIL: "04",
    MAYO: "05", JUNIO: "06", JULIO: "07", AGOSTO: "08",
    SEPTIEMBRE: "09", OCTUBRE: "10", NOVIEMBRE: "11", DICIEMBRE: "12",
};

function detectMonthYear(text: string): { month: string; monthName: string } {
    const match = text.match(/INFORME\s+DE\s+(\w+)\s+DE\s+(\d{4})/i);
    if (match) {
        const monthName = match[1].toUpperCase();
        const year = match[2];
        const monthNum = MONTH_NAMES[monthName] || "01";
        return {
            month: `${year}-${monthNum}`,
            monthName: `${match[1]} ${year}`,
        };
    }
    return { month: "2025-12", monthName: "Desconocido" };
}

function extractBilling(text: string): MonthlyReportBilling {
    const result: MonthlyReportBilling = {
        total_revenue: 0, net_revenue: 0, days_open: 0, avg_daily_revenue: 0,
        card_pct: 0, cash_pct: 0,
        delivery_total: 0, delivery_uber_eats: 0, delivery_just_eat: 0,
        delivery_al_punto: 0, delivery_glovo: 0,
    };

    // Facturación total
    const revMatch = text.match(/facturación total[^€\d]*(\d[\d.,]+)\s*euros/i);
    if (revMatch) result.total_revenue = parseNumber(revMatch[1]);

    // Días abiertos
    const daysMatch = text.match(/abrió\s+(\d+)\s+días/i);
    if (daysMatch) result.days_open = parseInt(daysMatch[1]);

    // Media diaria
    const avgMatch = text.match(/facturación media diaria[^€\d]*(\d[\d.,]+)\s*euros/i);
    if (avgMatch) result.avg_daily_revenue = parseNumber(avgMatch[1]);
    else if (result.total_revenue && result.days_open)
        result.avg_daily_revenue = Math.round(result.total_revenue / result.days_open);

    // Tarjeta vs efectivo
    const cardMatch = text.match(/tarjeta representó el\s*(\d+)%/i);
    if (cardMatch) {
        result.card_pct = parseInt(cardMatch[1]);
        result.cash_pct = 100 - result.card_pct;
    }

    // Delivery
    const uberMatch = text.match(/Uber\s*Eats[:\s]*(\d[\d.,]+)\s*€/i);
    if (uberMatch) result.delivery_uber_eats = parseNumber(uberMatch[1]);

    const justEatMatch = text.match(/Just\s*Eat[:\s]*(\d[\d.,]+)\s*€/i);
    if (justEatMatch) result.delivery_just_eat = parseNumber(justEatMatch[1]);

    const alPuntoMatch = text.match(/Al\s*Punto[:\s]*(\d[\d.,]+)\s*€/i);
    if (alPuntoMatch) result.delivery_al_punto = parseNumber(alPuntoMatch[1]);

    const glovoMatch = text.match(/Glovo[:\s]*(\d[\d.,]+)\s*€/i);
    if (glovoMatch) result.delivery_glovo = parseNumber(glovoMatch[1]);

    const deliveryTotalMatch = text.match(/plataformas alcanzaron\s*(\d[\d.,]+)\s*euros/i);
    if (deliveryTotalMatch) result.delivery_total = parseNumber(deliveryTotalMatch[1]);
    else result.delivery_total = result.delivery_uber_eats + result.delivery_just_eat + result.delivery_al_punto + result.delivery_glovo;

    result.net_revenue = result.total_revenue - result.delivery_total;

    // Facturación media por día de semana
    const weekdayPattern = /•\s*(Domingo|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado)[:\s]*(\d[\d.,]+)\s*€/gi;
    const weekdays: Record<string, number> = {};
    let wdMatch;
    while ((wdMatch = weekdayPattern.exec(text)) !== null) {
        weekdays[wdMatch[1]] = parseNumber(wdMatch[2]);
    }
    if (Object.keys(weekdays).length > 0) result.weekday_averages = weekdays;

    return result;
}

function extractExpenses(text: string): MonthlyReportExpenses {
    const breakdown: MonthlyReportExpense[] = [];

    // Tabla principal de gastos - buscar la sección con GASTO/DICIEMBRE
    // Patrón: PERSONAL 11.398,16 ... TOTAL 24.949,46
    const expensePatterns: Array<{ label: string; category: OperatingExpenseCategory; regex: RegExp }> = [
        { label: "Sueldos", category: "NOMINAS_LIQUIDAS", regex: /SUELDOS\s+([\d.,]+)/i },
        { label: "Seguros Sociales", category: "SEGURIDAD_SOCIAL", regex: /SEGUROS SOCIALES\s+([\d.,]+)/i },
        { label: "Despidos", category: "NOMINAS_LIQUIDAS", regex: /DESPIDOS\s+([\d.,]+)/i },
        { label: "Proveedores Comida", category: "PROVEEDORES_COMIDA", regex: /PROVEEDORES COMIDAS\s+([\d.,]+)/i },
        { label: "Proveedores Bebida", category: "PROVEEDORES_BEBIDA", regex: /PROVEEDORES BEBIDAS\s+([\d.,]+)/i },
        { label: "Variación Existencias", category: "VARIACION_EXISTENCIAS", regex: /VARIACIÓN DE EXISTENCIAS\s+([\d.,]+)/i },
        { label: "Suministros Fijos", category: "SUMINISTROS", regex: /SUMINISTROS FIJOS\s+([\d.,]+)/i },
        { label: "Suministros Variables", category: "SUMINISTROS", regex: /SUMINISTROS VARIABLES\s+([\d.,]+)/i },
        { label: "Mantenimiento", category: "MANTENIMIENTO", regex: /MANTENIMIENTO\s+([\d.,]+)/i },
        { label: "Marketing", category: "PUBLICIDAD", regex: /MARKETING\s+([\d.,]+)/i },
        { label: "Extra", category: "GASTOS_EN_MANO", regex: /EXTRA\s+([\d.,]+)/i },
        { label: "Inversiones", category: "INVERSIONES", regex: /INVERSIONES\s+([\d.,]+)/i },
        { label: "Financiaciones", category: "FINANCIACION", regex: /FINANCIACIONES\s+([\d.,]+)/i },
    ];

    // Aggregate by category
    const categoryAgg: Record<string, { amount: number; subs: Array<{ name: string; amount: number }> }> = {};

    for (const pat of expensePatterns) {
        const match = pat.regex.exec(text);
        if (match) {
            const amount = parseNumber(match[1]);
            if (amount > 0) {
                if (!categoryAgg[pat.category]) {
                    categoryAgg[pat.category] = { amount: 0, subs: [] };
                }
                categoryAgg[pat.category].amount += amount;
                categoryAgg[pat.category].subs.push({ name: pat.label, amount });
            }
        }
    }

    for (const [cat, data] of Object.entries(categoryAgg)) {
        breakdown.push({
            category: cat as OperatingExpenseCategory,
            amount: data.amount,
            subcategories: data.subs.map(s => ({ name: s.name, amount: s.amount })),
        });
    }

    // Total
    const totalMatch = text.match(/TOTAL\s+([\d.,]+)/);
    const total = totalMatch ? parseNumber(totalMatch[1]) : breakdown.reduce((s, b) => s + b.amount, 0);

    // Food suppliers detail
    const foodSuppliers: Array<{ name: string; amount: number }> = [];
    const foodPatterns = [
        /Del Río\s+([\d.,]+\s*€)/i,
        /Makro\s+([\d.,]+\s*€)/i,
        /Solalbe\s+([\d.,]+\s*€)/i,
        /Carlos Miguel\s+([\d.,]+\s*€)/i,
        /Antonio Molina\s+([\d.,]+\s*€)/i,
        /Salvador\s+([\d.,]+\s*€)/i,
        /Mercadona\s+([\d.,]+\s*€)/i,
    ];
    for (const fp of foodPatterns) {
        const m = fp.exec(text);
        if (m) foodSuppliers.push({ name: fp.source.split("\\s")[0], amount: parseNumber(m[1]) });
    }

    // Inventory
    let inventoryValue = 0;
    const invMatch = text.match(/inventario[^€\d]*(\d[\d.,]+)\s*euros/i);
    if (invMatch) inventoryValue = parseNumber(invMatch[1]);

    let inventoryVariation = 0;
    const varMatch = text.match(/VARIACIÓN DE EXISTENCIAS\s+([\d.,]+)/i);
    if (varMatch) inventoryVariation = parseNumber(varMatch[1]);

    return {
        total,
        breakdown,
        food_suppliers: foodSuppliers.length > 0 ? foodSuppliers : undefined,
        inventory_value: inventoryValue || undefined,
        inventory_variation: inventoryVariation || undefined,
    };
}

function extractTaxes(text: string): MonthlyReportTaxes {
    const result: MonthlyReportTaxes = {
        iva_repercutido: 0,
        iva_soportado: 0,
        iva_a_pagar: 0,
    };

    // IVA total trimestral
    const ivaRows = text.match(/IVA REPERCUTIDO[\s\S]*?IVA A PAGAR[\s\S]*?([\d.,]+\s*€)/i);

    // Buscar totales en la tabla IVA
    const repMatch = text.match(/TOTAL 4º T[\s\S]*?(\d[\d.,]+)\s*€[\s\S]*?(\d[\d.,]+)\s*€[\s\S]*?(\d[\d.,]+)\s*€/i);
    if (repMatch) {
        result.iva_repercutido = parseNumber(repMatch[1]);
        result.iva_soportado = parseNumber(repMatch[2]);
        result.iva_a_pagar = parseNumber(repMatch[3]);
    } else {
        // Fallback: buscar líneas individuales
        const repLine = text.match(/IVA REPERCUTIDO[\s\S]*?TOTAL[^€\d]*(\d[\d.,]+)/i);
        if (repLine) result.iva_repercutido = parseNumber(repLine[1]);
        const sopLine = text.match(/IVA SOPORTADO[\s\S]*?(\d[\d.,]+)\s*€?\s*$/im);
        if (sopLine) result.iva_soportado = parseNumber(sopLine[1]);
        const pagarLine = text.match(/IVA A PAGAR[\s\S]*?(\d[\d.,]+)\s*€?\s*$/im);
        if (pagarLine) result.iva_a_pagar = parseNumber(pagarLine[1]);
    }

    // IRPF
    const m111 = text.match(/MODELO 111\s+([\d.,]+)\s*€/i);
    if (m111) result.irpf_modelo_111 = parseNumber(m111[1]);

    const m115 = text.match(/MODELO 115\s+([\d.,]+)\s*€/i);
    if (m115) result.irpf_modelo_115 = parseNumber(m115[1]);

    if (result.irpf_modelo_111 || result.irpf_modelo_115) {
        result.irpf_total = (result.irpf_modelo_111 || 0) + (result.irpf_modelo_115 || 0);
    }

    return result;
}

function extractPnL(text: string, billing: MonthlyReportBilling, expenses: MonthlyReportExpenses): MonthlyReportPnL {
    // Buscar resultado directo
    let profitLoss = 0;
    const profitMatch = text.match(/(?:pérdidas?|beneficios?)\s+de\s+([\d.,]+)\s*euros/i);
    if (profitMatch) {
        profitLoss = parseNumber(profitMatch[1]);
        // Si dice "pérdidas" es negativo
        if (/pérdidas?/i.test(text.match(/(?:pérdidas?|beneficios?)\s+de/i)?.[0] || "")) {
            profitLoss = -profitLoss;
        }
    }

    const netRevenue = billing.total_revenue;
    const totalExpenses = expenses.total;

    // Si no encontramos el beneficio explícito, calculamos
    if (!profitLoss && netRevenue && totalExpenses) {
        profitLoss = netRevenue - totalExpenses;
    }

    const profitMargin = netRevenue ? (profitLoss / netRevenue) * 100 : 0;

    return {
        net_revenue: netRevenue,
        total_expenses: totalExpenses,
        profit_loss: profitLoss,
        profit_margin_pct: Math.round(profitMargin * 10) / 10,
    };
}

function extractRatios(text: string, billing: MonthlyReportBilling): {
    personal_pct: number;
    materia_prima_pct: number;
    suministros_pct: number;
    total_cost_pct: number;
} {
    const result = { personal_pct: 0, materia_prima_pct: 0, suministros_pct: 0, total_cost_pct: 0 };

    // Buscar en la tabla de ratios
    const personalRatio = text.match(/PERSONAL[\s\S]*?RATIO\s*([\d.,]+)%/i)
        || text.match(/PERSONAL[\s\S]*?([\d.,]+)%/i);
    if (personalRatio) result.personal_pct = parseNumber(personalRatio[1]);

    const mpRatio = text.match(/MATERIA PRIMA[\s\S]*?([\d.,]+)%/i);
    if (mpRatio) result.materia_prima_pct = parseNumber(mpRatio[1]);

    const sumRatio = text.match(/SUMINISTROS[\s\S]*?([\d.,]+)%/i);
    if (sumRatio) result.suministros_pct = parseNumber(sumRatio[1]);

    // Total cost ratio
    const totalRatio = text.match(/TOTAL[\s\S]*?RATIO\s*([\d.,]+)%/i);
    if (totalRatio) result.total_cost_pct = parseNumber(totalRatio[1]);

    return result;
}

function extractConclusions(text: string): string | undefined {
    const match = text.match(/VI\.\s*CONCLUSIONES([\s\S]+?)(?:\d+\s*$|$)/im);
    if (match) {
        return match[1].trim().substring(0, 2000); // Limitar longitud
    }
    return undefined;
}

// ─── Main Regex-Based Extraction ─────────────────────────────────────────────

export function parseMonthlyReportText(text: string): ReportExtractionResult {
    try {
        const { month, monthName } = detectMonthYear(text);
        const billing = extractBilling(text);
        const expenses = extractExpenses(text);
        const taxes = extractTaxes(text);
        const pnl = extractPnL(text, billing, expenses);
        const ratios = extractRatios(text, billing);
        const conclusions = extractConclusions(text);

        // Calcular confianza basada en datos encontrados
        let confidence = 0.5;
        if (billing.total_revenue > 0) confidence += 0.1;
        if (billing.days_open > 0) confidence += 0.05;
        if (expenses.total > 0) confidence += 0.1;
        if (expenses.breakdown.length >= 3) confidence += 0.1;
        if (taxes.iva_a_pagar > 0 || taxes.iva_repercutido > 0) confidence += 0.05;
        if (pnl.profit_loss !== 0) confidence += 0.05;
        if (ratios.personal_pct > 0) confidence += 0.05;
        confidence = Math.min(confidence, 1);

        const data: ExtractedMonthlyReport = {
            month,
            month_name: monthName,
            billing,
            expenses,
            taxes,
            pnl,
            ratios,
            conclusions,
            confidence: Math.round(confidence * 100) / 100,
        };

        return { success: true, data, raw_text: text.substring(0, 500) };
    } catch (err: unknown) {
        const error = err as Error;
        return { success: false, error: `Parse error: ${error.message}`, raw_text: text.substring(0, 500) };
    }
}

// ─── PDF to Text (server-side only) ─────────────────────────────────────────

export async function pdfBufferToText(buffer: Buffer): Promise<string> {
    // Escribir buffer a archivo temporal, ejecutar pdftotext, leer resultado
    const { writeFile, unlink, mkdtemp } = await import("fs/promises");
    const { join } = await import("path");
    const { tmpdir } = await import("os");
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const tempDir = await mkdtemp(join(tmpdir(), "report-"));
    const pdfPath = join(tempDir, "report.pdf");
    const txtPath = join(tempDir, "report.txt");

    try {
        await writeFile(pdfPath, buffer);

        // Intentar con pdftotext del PATH del usuario (scoop/choco/system)
        const possiblePaths = [
            "pdftotext",
            join(process.env.USERPROFILE || "", "scoop", "shims", "pdftotext"),
            join(process.env.HOME || "", "scoop", "shims", "pdftotext"),
            "/usr/bin/pdftotext",
        ];

        let extracted = false;
        for (const cmd of possiblePaths) {
            try {
                await execFileAsync(cmd, ["-layout", pdfPath, txtPath]);
                extracted = true;
                break;
            } catch {
                continue;
            }
        }

        if (!extracted) {
            throw new Error("pdftotext no encontrado. Instala poppler: scoop install poppler");
        }

        const { readFile } = await import("fs/promises");
        const text = await readFile(txtPath, "utf-8");
        return text;
    } finally {
        // Cleanup
        try { await unlink(pdfPath); } catch { /* ignore */ }
        try { await unlink(txtPath); } catch { /* ignore */ }
        try {
            const { rmdir } = await import("fs/promises");
            await rmdir(tempDir);
        } catch { /* ignore */ }
    }
}

// ─── Full Pipeline: PDF Buffer → Structured Report ──────────────────────────

export async function extractMonthlyReport(
    buffer: Buffer,
    fileName: string
): Promise<ReportExtractionResult> {
    try {
        console.log(`[ReportExtractor] Procesando: ${fileName}`);

        // Step 1: PDF → Texto
        const text = await pdfBufferToText(buffer);
        if (!text || text.trim().length < 100) {
            return { success: false, error: "PDF vacío o ilegible" };
        }

        console.log(`[ReportExtractor] Texto extraído: ${text.length} chars`);

        // Step 2: Texto → Datos estructurados (regex parser)
        const result = parseMonthlyReportText(text);

        if (result.success) {
            console.log(`[ReportExtractor] Extracción exitosa. Confianza: ${result.data?.confidence}`);
        }

        return result;
    } catch (err: unknown) {
        const error = err as Error;
        return { success: false, error: `Pipeline error: ${error.message}` };
    }
}

// ─── Mapper: Report → Operating Expenses para inserción en DB ───────────────

export function reportToOperatingExpenses(
    report: ExtractedMonthlyReport,
    restaurantId: string
): Array<{
    restaurant_id: string;
    expense_date: string;
    category: OperatingExpenseCategory;
    amount: number;
    description: string;
    provider_detail?: string;
    payment_method: string;
    is_paid: boolean;
    source?: string;
}> {
    const expenseDate = `${report.month}-15`; // Mitad del mes como fecha referencia
    const expenses: Array<{
        restaurant_id: string;
        expense_date: string;
        category: OperatingExpenseCategory;
        amount: number;
        description: string;
        provider_detail?: string;
        payment_method: string;
        is_paid: boolean;
        source?: string;
    }> = [];

    for (const item of report.expenses.breakdown) {
        if (item.subcategories && item.subcategories.length > 1) {
            // Insertar subcategorías individuales
            for (const sub of item.subcategories) {
                expenses.push({
                    restaurant_id: restaurantId,
                    expense_date: expenseDate,
                    category: item.category,
                    amount: sub.amount,
                    description: `${sub.name} - Informe ${report.month_name}`,
                    provider_detail: sub.provider,
                    payment_method: "bank",
                    is_paid: true,
                    source: "monthly_report",
                });
            }
        } else {
            expenses.push({
                restaurant_id: restaurantId,
                expense_date: expenseDate,
                category: item.category,
                amount: item.amount,
                description: `Informe ${report.month_name}`,
                payment_method: "bank",
                is_paid: true,
                source: "monthly_report",
            });
        }
    }

    return expenses;
}

// ─── Mapper: Report → DailySales resumen mensual ────────────────────────────

export function reportToDailySalesSummary(
    report: ExtractedMonthlyReport,
    restaurantId: string
): {
    restaurant_id: string;
    date: string;
    revenue_total: number;
    delivery_uber_eats: number;
    delivery_just_eat: number;
    delivery_al_punto: number;
    delivery_glovo: number;
    cash_amount: number;
    card_amount: number;
    iva_collected: number;
    source: string;
} {
    const b = report.billing;
    return {
        restaurant_id: restaurantId,
        date: `${report.month}-01`, // Primer día del mes
        revenue_total: b.total_revenue,
        delivery_uber_eats: b.delivery_uber_eats,
        delivery_just_eat: b.delivery_just_eat,
        delivery_al_punto: b.delivery_al_punto,
        delivery_glovo: b.delivery_glovo,
        cash_amount: Math.round(b.total_revenue * (b.cash_pct / 100)),
        card_amount: Math.round(b.total_revenue * (b.card_pct / 100)),
        iva_collected: report.taxes.iva_repercutido || 0,
        source: "monthly_report",
    };
}
