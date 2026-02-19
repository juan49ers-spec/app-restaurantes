import { Recipe } from "../types/schema"

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
    quadrant: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
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

        // 1. Calculate Averages
        const totalSold = this.products.reduce((acc, p) => acc + p.quantity_sold, 0)
        // Avg Popularity = (100% / No. of Items) * (0.7 Multiplier usually, but let's use Avg Quantity for simplicity first)
        // Kasavana & Smith model uses: (100 / N) * 0.7 as the "Hurdle Rate" for Menu Mix.
        // Let's use simple Average Quantity Sold as the X-axis midpoint for now.
        const avgQuantity = totalSold / this.products.length

        // Avg Profitability = Weighted Average Contribution Margin
        // Total Contribution Margin / Total Number Sold
        const totalCM = this.products.reduce((acc, p) => acc + p.total_profit, 0)
        const avgCM = totalSold > 0 ? totalCM / totalSold : 0

        return this.products.map(p => {
            // X-AXIS: Popularity (Quantity Sold)
            // Y-AXIS: Profitability (Contribution Margin)

            const isHighPopularity = p.quantity_sold >= avgQuantity
            const isHighProfitability = p.contribution_margin >= avgCM

            let quadrant: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG' = 'DOG'

            if (isHighPopularity && isHighProfitability) quadrant = 'STAR'
            else if (isHighPopularity && !isHighProfitability) quadrant = 'PLOWHORSE' // High Vol, Low Margin
            else if (!isHighPopularity && isHighProfitability) quadrant = 'PUZZLE'   // Low Vol, High Margin
            else quadrant = 'DOG'

            return {
                ...p,
                popularity_rate: p.quantity_sold, // using raw value for plotting X
                profitability_rate: p.contribution_margin, // using raw value for plotting Y
                quadrant
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
                quantity: totalQuantity / totalProducts,
                margin: analyzed.reduce((acc, p) => acc + p.total_profit, 0) / totalQuantity
            }
        }
    }

}
