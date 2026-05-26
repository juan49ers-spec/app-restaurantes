import type { Recipe } from "../types/schema"

export type MenuEngineeringClassification = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'

export type SalesItemUnsynced = {
    recipe_id: string
    quantity_sold: number
    revenue_total: number
}

export type EnrichedProduct = {
    id: string
    name: string
    category?: string

    // Core Metrics
    quantity_sold: number
    revenue_total: number
    cost_per_unit: number
    price_per_unit: number

    // Calculated
    total_cost: number        // quantity * cost_per_unit
    total_profit: number      // revenue_total - total_cost
    contribution_margin: number // price_per_unit - cost_per_unit
    margin_pct: number        // (price - cost) / price

    // Classification
    popularity_rate: number   // quantity / avg_quantity (or total) - used for X axis
    profitability_rate: number // margin / avg_margin - used for Y axis
    quadrant: MenuEngineeringClassification
}

export type MenuEngineeringCalculationItem = {
    id: string
    quantity_sold: number
    cost_per_unit: number
    price_per_unit: number
}

export type CalculatedMenuEngineeringItem<T extends MenuEngineeringCalculationItem> = T & {
    popularity_pct: number
    contribution_margin: number
    total_sales: number
    total_cost: number
    total_profit: number
    classification: MenuEngineeringClassification
}

export type MenuEngineeringAnalysis<T extends MenuEngineeringCalculationItem> = {
    thresholds: {
        totalSold: number
        avgQuantity: number
        avgPopularityPct: number
        avgContributionMargin: number
    }
    items: CalculatedMenuEngineeringItem<T>[]
}

export function calculateMenuEngineeringAnalysis<T extends MenuEngineeringCalculationItem>(
    items: T[]
): MenuEngineeringAnalysis<T> {
    if (items.length === 0) {
        return {
            thresholds: {
                totalSold: 0,
                avgQuantity: 0,
                avgPopularityPct: 0,
                avgContributionMargin: 0,
            },
            items: [],
        }
    }

    const totalSold = items.reduce((sum, item) => sum + Number(item.quantity_sold), 0)
    if (totalSold === 0) {
        throw new Error("Total quantity sold is 0. Cannot calculate popularity.")
    }

    const avgQuantity = totalSold / items.length
    const avgPopularityPct = 1 / items.length
    const totalMarginGenerated = items.reduce((sum, item) => {
        const margin = Number(item.price_per_unit) - Number(item.cost_per_unit)
        return sum + margin * Number(item.quantity_sold)
    }, 0)
    const avgContributionMargin = totalMarginGenerated / totalSold

    const calculatedItems = items.map((item) => {
        const quantitySold = Number(item.quantity_sold)
        const cost = Number(item.cost_per_unit)
        const price = Number(item.price_per_unit)
        const contributionMargin = price - cost
        const popularityPct = quantitySold / totalSold
        const isHighPopularity = popularityPct >= avgPopularityPct
        const isHighMargin = contributionMargin >= avgContributionMargin

        let classification: MenuEngineeringClassification = 'DOG'
        if (isHighPopularity && isHighMargin) classification = 'STAR'
        else if (isHighPopularity && !isHighMargin) classification = 'PLOWHORSE'
        else if (!isHighPopularity && isHighMargin) classification = 'PUZZLE'

        return {
            ...item,
            popularity_pct: popularityPct,
            contribution_margin: contributionMargin,
            total_sales: price * quantitySold,
            total_cost: cost * quantitySold,
            total_profit: contributionMargin * quantitySold,
            classification,
        }
    })

    return {
        thresholds: {
            totalSold,
            avgQuantity,
            avgPopularityPct,
            avgContributionMargin,
        },
        items: calculatedItems,
    }
}

export class MenuEngineeringCalculator {
    private products: EnrichedProduct[] = []

    constructor(
        salesData: SalesItemUnsynced[],
        recipes: Recipe[]
    ) {
        this.products = this.mergeData(salesData, recipes)
    }

    private mergeData(sales: SalesItemUnsynced[], recipes: Recipe[]): EnrichedProduct[] {
        return sales.map(sale => {
            const recipe = recipes.find(r => r.id === sale.recipe_id)
            if (!recipe) return null

            const cost = recipe.current_cost
            // Infer price from revenue if possible, or use recipe price
            const price = sale.quantity_sold > 0
                ? (sale.revenue_total / sale.quantity_sold)
                : (recipe.selling_price || 0)

            const total_cost = sale.quantity_sold * cost
            const total_profit = sale.revenue_total - total_cost
            const contribution_margin = price - cost

            return {
                id: recipe.id!,
                name: recipe.name,
                // category: recipe.category, // TODO: add category to recipe schema
                quantity_sold: sale.quantity_sold,
                revenue_total: sale.revenue_total,
                cost_per_unit: cost,
                price_per_unit: price,
                total_cost,
                total_profit,
                contribution_margin,
                margin_pct: price > 0 ? (contribution_margin / price) * 100 : 0,

                // Placeholders for now
                popularity_rate: 0,
                profitability_rate: 0,
                quadrant: 'DOG'
            }
        }).filter(p => p !== null) as EnrichedProduct[]
    }

    public analyze(): EnrichedProduct[] {
        if (this.products.length === 0) return []

        const analysis = calculateMenuEngineeringAnalysis(this.products)

        return this.products.map(p => {
            const calculated = analysis.items.find((item) => item.id === p.id)
            return {
                ...p,
                popularity_rate: p.quantity_sold, // using raw value for plotting X
                profitability_rate: p.contribution_margin, // using raw value for plotting Y
                quadrant: calculated?.classification ?? 'DOG',
            }
        })
    }

    public getStats() {
        const analyzed = this.analyze()
        const totalProducts = analyzed.length
        const totalRevenue = analyzed.reduce((acc, p) => acc + p.revenue_total, 0)
        const totalQuantity = analyzed.reduce((acc, p) => acc + p.quantity_sold, 0)
        const avgMargin = totalRevenue > 0
            ? analyzed.reduce((acc, p) => acc + (p.margin_pct / 100), 0) / totalProducts
            : 0

        const stars = analyzed.filter(p => p.quadrant === 'STAR')

        return {
            totalProducts,
            totalRevenue,
            avgMargin,
            starsCount: stars.length,
            stars,
            plowhorses: analyzed.filter(p => p.quadrant === 'PLOWHORSE'),
            puzzles: analyzed.filter(p => p.quadrant === 'PUZZLE'),
            dogs: analyzed.filter(p => p.quadrant === 'DOG'),
            averages: {
                quantity: totalProducts > 0 ? totalQuantity / totalProducts : 0,
                margin: totalQuantity > 0 ? analyzed.reduce((acc, p) => acc + p.total_profit, 0) / totalQuantity : 0
            }
        }
    }

}
