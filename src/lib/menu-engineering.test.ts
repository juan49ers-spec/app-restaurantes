import { describe, it, expect } from 'vitest'
import { MenuEngineeringCalculator, SalesItemUnsynced } from './menu-engineering'
import { Recipe } from '../types/schema'

// Helper to create a minimal valid Recipe for testing
const createRecipe = (id: string, name: string, cost: number, price: number): Recipe => ({
    id,
    restaurant_id: 'test-restaurant-id', // Required by schema
    name,
    current_cost: cost,
    selling_price: price,
    // Required fields by schema but irrelevant for this specific logic test
    hourly_rate: 0,
    prep_time_minutes: 0,
    yields: 1,
    allergens: [],
    updated_at: new Date()
})

describe('MenuEngineeringCalculator', () => {
    // SCENARIO: 4 Items, one for each quadrant
    // Avg Qty = (100+100+20+20) / 4 = 60
    // Avg Margin:
    // 1. Star: Price 20, Cost 5 -> Margin 15. Total Profit 1500.
    // 2. Plowhorse: Price 10, Cost 7 -> Margin 3. Total Profit 300.
    // 3. Puzzle: Price 25, Cost 5 -> Margin 20. Total Profit 400.
    // 4. Dog: Price 8, Cost 6 -> Margin 2. Total Profit 40.
    // Total Profit = 2240. Total Sold = 240.
    // Weighted Avg Margin = 2240 / 240 = 9.33...

    const recipes: Recipe[] = [
        createRecipe('1', 'Super Star Burger', 5, 20),      // High Margin (15)
        createRecipe('2', 'Popular Fries', 7, 10),          // Low Margin (3)
        createRecipe('3', 'Fancy Steak', 5, 25),            // High Margin (20)
        createRecipe('4', 'Sad Salad', 6, 8)                // Low Margin (2)
    ]

    const sales: SalesItemUnsynced[] = [
        { recipe_id: '1', quantity_sold: 100, revenue_total: 2000 }, // High Vol (100 > 60) -> STAR
        { recipe_id: '2', quantity_sold: 100, revenue_total: 1000 }, // High Vol (100 > 60) -> PLOWHORSE
        { recipe_id: '3', quantity_sold: 20, revenue_total: 500 },   // Low Vol (20 < 60) -> PUZZLE
        { recipe_id: '4', quantity_sold: 20, revenue_total: 160 }    // Low Vol (20 < 60) -> DOG
    ]

    const calculator = new MenuEngineeringCalculator(sales, recipes)
    const result = calculator.analyze()
    const stats = calculator.getStats()

    it('should correctly merge sales and recipe data', () => {
        const star = result.find(p => p.id === '1')
        expect(star).toBeDefined()
        expect(star?.name).toBe('Super Star Burger')
        expect(star?.total_profit).toBe(1500) // (20-5)*100
        expect(star?.contribution_margin).toBe(15)
    })

    it('should classify STAR correctly (High Vol, High Margin)', () => {
        const item = result.find(p => p.id === '1')
        expect(item?.quadrant).toBe('STAR')
    })

    it('should classify PLOWHORSE correctly (High Vol, Low Margin)', () => {
        // High Vol (100 > 60), Low Margin (3 < 9.33)
        const item = result.find(p => p.id === '2')
        expect(item?.quadrant).toBe('PLOWHORSE')
    })

    it('should classify PUZZLE correctly (Low Vol, High Margin)', () => {
        // Low Vol (20 < 60), High Margin (20 > 9.33)
        const item = result.find(p => p.id === '3')
        expect(item?.quadrant).toBe('PUZZLE')
    })

    it('should classify DOG correctly (Low Vol, Low Margin)', () => {
        // Low Vol (20 < 60), Low Margin (2 < 9.33)
        const item = result.find(p => p.id === '4')
        expect(item?.quadrant).toBe('DOG')
    })

    it('should calculate global stats correctly', () => {
        expect(stats.totalRevenue).toBe(3660)
        expect(stats.starsCount).toBe(1)
        expect(stats.puzzles.length).toBe(1)
    })

    it('should handle missing recipe gracefully', () => {
        const disjointSales: SalesItemUnsynced[] = [
            { recipe_id: '999', quantity_sold: 10, revenue_total: 100 }
        ]
        const emptyCalc = new MenuEngineeringCalculator(disjointSales, recipes)
        const emptyRes = emptyCalc.analyze()
        expect(emptyRes).toHaveLength(0)
    })
})
