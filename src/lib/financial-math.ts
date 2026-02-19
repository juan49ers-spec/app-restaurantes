export interface FinancialMetrics {
    revenue: number
    cogs: number
    labor: number
    fixedCosts: number
}

export interface SimulationLevers {
    priceIncrease: number // %
    volumeChange: number  // %
    cogsReduction: number // % (Efficiency)
    laborSavings: number  // % (Efficiency)
    fixedCostAdj: number  // Absolute Value €
}

export interface MenuImpact {
    revenueDelta: number
    cogsDelta: number
}

export interface SimulationResult {
    // Projected Totals
    projectedRevenue: number
    projectedCOGS: number
    projectedLabor: number
    projectedExpenses: number
    projectedProfit: number
    projectedMargin: number

    // Deltas (Impacts) for Waterfall
    impacts: {
        price: number
        volumeRevenue: number
        volumeCosts: number
        volumeNet: number // volumeRevenue - volumeCosts
        efficiencyCOGS: number
        efficiencyLabor: number
        efficiencyTotal: number // Sum of savings
        fixed: number
    }

    // Waterfall Data Points (ready for Recharts)
    waterfallData: Array<{
        name: string
        value: number
        fill: string
        isTotal?: boolean
        type?: 'base' | 'increment' | 'total'
    }>
}

/**
 * Calculates financial projections using a multiplicative standard model.
 * Rule: Revenue = Base * (1 + Price%) * (1 + Vol%)
 * Rule: Variable Costs = Base * (1 + Vol%) * (1 - Efficiency%)
 */
export function calculateFinancialProjection(
    base: FinancialMetrics,
    levers: SimulationLevers,
    menuImpact?: MenuImpact
): SimulationResult {
    // 1. Unpack Levers (convert form integer percentages to decimals)
    const pricePct = levers.priceIncrease / 100
    const volPct = levers.volumeChange / 100
    const cogsEffPct = levers.cogsReduction / 100
    const laborEffPct = levers.laborSavings / 100

    // 2. Revenue Calculation (Multiplicative Interaction)
    // Base -> Price Effect -> Volume Effect (on top of new price)
    // Formula: Base * (1+P) * (1+V)
    // Breakdown:
    // - Base
    // - Price Impact = Base * P
    // - Volume Impact = (Base * (1+P)) * V

    const revenueAfterPrice = base.revenue * (1 + pricePct)
    // Add Menu Impact Delta before volume scaling? 
    // Usually, volume scaling applies to the "New Menu Configuration"
    const projectedRevenue = (revenueAfterPrice + (menuImpact?.revenueDelta || 0)) * (1 + volPct)

    const impactPrice = base.revenue * pricePct
    const impactMenuRevenue = menuImpact?.revenueDelta || 0
    const impactVolumeRevenue = projectedRevenue - (revenueAfterPrice + impactMenuRevenue)

    // 3. Cost Calculation
    // Assumption: COGS is 100% Variable. Labor is 50% Fixed / 50% Variable (Standard Hospitality Rule)
    // Variable Costs scale with VOLUME only (Price doesn't change cost of making a burger)

    // COGS
    const baseCogsWithMenu = base.cogs + (menuImpact?.cogsDelta || 0)
    const projectedCOGS = baseCogsWithMenu * (1 + volPct) * (1 - cogsEffPct)
    const cogsMenuEffect = menuImpact?.cogsDelta || 0
    const cogsVolumeEffect = (baseCogsWithMenu * (1 + volPct)) - baseCogsWithMenu
    const cogsEfficiencyEffect = projectedCOGS - (baseCogsWithMenu * (1 + volPct)) // Should be negative (saving)

    // Labor (50% Fixed, 50% Variable)
    const laborFixed = base.labor * 0.5
    const laborVariable = base.labor * 0.5
    const projectedLaborVariable = laborVariable * (1 + volPct) * (1 - laborEffPct)
    const projectedLabor = laborFixed + projectedLaborVariable

    const laborVolumeEffect = (laborVariable * (1 + volPct)) - laborVariable
    const laborEfficiencyEffect = projectedLaborVariable - (laborVariable * (1 + volPct)) // Should be negative

    // Fixed Costs
    // Standardize: Input is "Change in Cost". -500 means save 500. +500 means spend 500 more.

    // Checking previous code: 
    // <LeverControl value={levers.efficiency} ... min={0} max={15} /> -> Efficiency is always positive saving.
    // FixedCostAdj: Generic input.
    // Let's assume FixedCostAdj is signed. + = Cost Up, - = Cost Down.

    const projectedExpenses = projectedCOGS + projectedLabor + (base.fixedCosts + levers.fixedCostAdj)

    // 4. Net Profit
    const projectedProfit = projectedRevenue - projectedExpenses
    const projectedMargin = (projectedProfit / projectedRevenue) * 100

    // 5. Consolidated Impacts for Waterfall
    // Volume Net Impact = Rev From Vol - Cost of Vol
    const impactVolumeCosts = cogsVolumeEffect + laborVolumeEffect
    const impactVolumeNet = impactVolumeRevenue - impactVolumeCosts

    // Efficiency Impact (Savings) = COGS Save + Labor Save
    // Note: Efficiency effects are negative numbers (cost reduction), so they ADD to profit.
    // But in waterfall, we want to show "Green Up bar".
    // Profit Delta = NewProfit - OldProfit
    // Delta breakdown: Price + VolNet + Efficiency (positive value of saving) - FixedCostIncrease

    const impactEfficiencyTotal = -(cogsEfficiencyEffect + laborEfficiencyEffect) // Flip sign to show as "Profit Gained"
    const impactFixed = -(levers.fixedCostAdj) // Flip sign: Cost down (-) = Profit Up (+)

    // 6. Waterfall Construction
    const waterfallData = [
        { name: 'Actual', value: base.revenue - base.cogs - base.labor - base.fixedCosts, fill: '#64748b', type: 'base' as const }, // slate-500
        { name: 'Precio', value: impactPrice, fill: '#8b5cf6', type: 'increment' as const }, // violet-500
        // Menu Impact (combined Revenue + COGS delta impact on profit)
        ...(Math.abs(impactMenuRevenue - cogsMenuEffect) > 1 ? [{
            name: 'Ing. Menú',
            value: impactMenuRevenue - cogsMenuEffect,
            fill: '#f59e0b', // amber-500
            type: 'increment' as const
        }] : []),
        { name: 'Volumen', value: impactVolumeNet, fill: '#3b82f6', type: 'increment' as const }, // blue-500
        { name: 'Eficiencia', value: impactEfficiencyTotal, fill: '#10b981', type: 'increment' as const }, // emerald-500
        // Fixed cost impact only if non-zero
        ...(Math.abs(impactFixed) > 1 ? [{ name: 'Fijos', value: impactFixed, fill: impactFixed > 0 ? '#10b981' : '#f43f5e', type: 'increment' as const }] : []),
        { name: 'Proyectado', value: projectedProfit, fill: projectedProfit >= base.revenue ? '#10b981' : '#f59e0b', isTotal: true, type: 'total' as const }
    ]

    return {
        projectedRevenue,
        projectedCOGS,
        projectedLabor,
        projectedExpenses,
        projectedProfit,
        projectedMargin,
        impacts: {
            price: impactPrice,
            volumeRevenue: impactVolumeRevenue,
            volumeCosts: impactVolumeCosts,
            volumeNet: impactVolumeNet,
            efficiencyCOGS: cogsEfficiencyEffect,
            efficiencyLabor: laborEfficiencyEffect,
            efficiencyTotal: impactEfficiencyTotal,
            fixed: impactFixed
        },
        waterfallData
    }
}
