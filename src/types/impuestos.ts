// ==================== IMPUESTOS MODULE TYPES (Simplified) ====================

// Tax Period
export type TaxQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

// Tax Models
export type TaxModel = 'mod111' | 'mod115'

// Tax Payment Method
export type PaymentMethod = 'transfer' | 'cash' | 'offset'

// ==================== DATA STRUCTURES ====================

export interface TaxPeriod {
    id: string
    restaurant_id: string
    year: number
    quarter: TaxQuarter
    start_date: Date
    end_date: Date
    status: 'open' | 'closed' | 'filed'
}

export interface TaxPayment {
    id: string
    liability_id: string
    date: Date
    amount: number
    method: PaymentMethod
    reference: string
}

// ==================== SCHEMAS ====================

import { z } from 'zod'

export const TaxPeriodSchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    year: z.number(),
    quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
    status: z.enum(['open', 'closed', 'filed']).default('open')
})

export const TaxPaymentSchema = z.object({
    liability_id: z.string().uuid(),
    amount: z.number().min(0.01),
    date: z.string(),
    method: z.enum(['transfer', 'cash', 'offset']),
    reference: z.string().optional()
})
