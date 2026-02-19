import { describe, it, expect } from 'vitest'
import { calculateFinancialProjection, FinancialMetrics, SimulationLevers, MenuImpact } from './financial-math'

describe('calculateFinancialProjection', () => {
    const baseMetrics: FinancialMetrics = {
        revenue: 100000,
        cogs: 30000, // 30%
        labor: 30000, // 30%
        fixedCosts: 20000 // 20%
    }
    // Net Profit = 100k - 30k - 30k - 20k = 20k (20%)

    const zeroLevers: SimulationLevers = {
        priceIncrease: 0,
        volumeChange: 0,
        cogsReduction: 0,
        laborSavings: 0,
        fixedCostAdj: 0
    }

    it('should return base metrics when all levers are zero', () => {
        const result = calculateFinancialProjection(baseMetrics, zeroLevers)

        expect(result.projectedRevenue).toBe(100000)
        expect(result.projectedCOGS).toBe(30000)
        expect(result.projectedLabor).toBe(30000)
        expect(result.projectedExpenses).toBe(80000)
        expect(result.projectedProfit).toBe(20000)
        expect(result.projectedMargin).toBe(20)
    })

    it('should calculate price increase correctly', () => {
        const levers: SimulationLevers = { ...zeroLevers, priceIncrease: 10 } // +10% Price
        const result = calculateFinancialProjection(baseMetrics, levers)

        // Revenue = 100k * 1.1 = 110k
        expect(result.projectedRevenue).toBeCloseTo(110000)

        // COGS stays same (cost/unit doesn't change with price) = 30k
        expect(result.projectedCOGS).toBe(30000)

        // Labor stays same = 30k
        expect(result.projectedLabor).toBe(30000)

        // Fixed Costs stay same = 20k

        // Profit = 110k - 30k - 30k - 20k = 30k
        expect(result.projectedProfit).toBeCloseTo(30000)

        // Impact Check
        expect(result.impacts.price).toBeCloseTo(10000)
    })

    it('should calculate volume increase correctly', () => {
        const levers: SimulationLevers = { ...zeroLevers, volumeChange: 10 } // +10% Volume
        const result = calculateFinancialProjection(baseMetrics, levers)

        // Revenue = 100k * 1.1 = 110k
        expect(result.projectedRevenue).toBeCloseTo(110000)

        // COGS scales with volume = 30k * 1.1 = 33k
        expect(result.projectedCOGS).toBeCloseTo(33000)

        // Labor: 50% Fixed (15k), 50% Variable (15k)
        // Variable Labor scales = 15k * 1.1 = 16.5k
        // Total Labor = 15k + 16.5k = 31.5k
        expect(result.projectedLabor).toBeCloseTo(31500)

        // Profit = 110k - 33k - 31.5k - 20k = 25.5k
        expect(result.projectedProfit).toBeCloseTo(25500)
    })

    it('should calculate efficiency (cost reduction) correctly', () => {
        const levers: SimulationLevers = { ...zeroLevers, cogsReduction: 10 } // -10% COGS
        const result = calculateFinancialProjection(baseMetrics, levers)

        // Revenue same = 100k
        expect(result.projectedRevenue).toBe(100000)

        // COGS = 30k * (1 - 0.10) = 27k
        expect(result.projectedCOGS).toBeCloseTo(27000)

        // Profit = 20k + 3k saved = 23k
        expect(result.projectedProfit).toBeCloseTo(23000)
    })

    it('should handle menu impacts correctly', () => {
        const menuImpact: MenuImpact = {
            revenueDelta: 5000,
            cogsDelta: 2000
        }
        const result = calculateFinancialProjection(baseMetrics, zeroLevers, menuImpact)

        // Revenue = base + delta = 105k
        expect(result.projectedRevenue).toBe(105000)

        // COGS = base + delta = 32k
        expect(result.projectedCOGS).toBe(32000)

        // Profit = 105k - 32k - 30k - 20k = 23k
        expect(result.projectedProfit).toBe(23000)
    })

    it('should handle combined levers scenario', () => {
        const levers: SimulationLevers = {
            priceIncrease: 10,   // rev 110k
            volumeChange: 10,    // rev 121k
            cogsReduction: 5,    // cogs effic
            laborSavings: 0,
            fixedCostAdj: 0
        }
        const result = calculateFinancialProjection(baseMetrics, levers)

        // Revenue: 100k * 1.1 * 1.1 = 121k
        expect(result.projectedRevenue).toBeCloseTo(121000)

        // COGS: 30k * 1.1 (vol) * 0.95 (eff) = 31.35k
        expect(result.projectedCOGS).toBeCloseTo(31350)
    })
})
