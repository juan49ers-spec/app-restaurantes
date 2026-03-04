export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

export interface PlanModuleAccess {
    menu_engineering: 'none' | 'basic' | 'premium'
    financial_control: 'none' | 'basic' | 'premium'
    inventory: 'none' | 'basic' | 'premium'
    staff_optimization: 'none' | 'basic' | 'premium'
    ai_insights: boolean
}

export interface PlanDefinition {
    id: PlanTier
    name: string
    monthlyPrice: number
    description: string
    includedOcrCredits: number // Credits given per month
    maxEmpleados: number | 'unlimited'
    maxRecipes: number | 'unlimited'
    modules: PlanModuleAccess
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
    FREE: {
        id: 'FREE',
        name: 'Gratuito',
        monthlyPrice: 0,
        description: 'Ideal para probar el sistema. Acceso básico a módulos.',
        includedOcrCredits: 10,
        maxEmpleados: 5,
        maxRecipes: 20,
        modules: {
            menu_engineering: 'basic',
            financial_control: 'basic',
            inventory: 'none',
            staff_optimization: 'none',
            ai_insights: false
        }
    },
    STARTER: {
        id: 'STARTER',
        name: 'Starter',
        monthlyPrice: 39,
        description: 'Para pequeños restaurantes que quieren control financiero.',
        includedOcrCredits: 50,
        maxEmpleados: 15,
        maxRecipes: 100,
        modules: {
            menu_engineering: 'basic',
            financial_control: 'premium',
            inventory: 'basic',
            staff_optimization: 'none',
            ai_insights: false
        }
    },
    PRO: {
        id: 'PRO',
        name: 'Pro',
        monthlyPrice: 89,
        description: 'La solución completa para optimizar operaciones.',
        includedOcrCredits: 150,
        maxEmpleados: 50,
        maxRecipes: 'unlimited',
        modules: {
            menu_engineering: 'premium',
            financial_control: 'premium',
            inventory: 'premium',
            staff_optimization: 'premium',
            ai_insights: true
        }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        monthlyPrice: 199,
        description: 'Para grupos y franquicias. Todo ilimitado.',
        includedOcrCredits: 500,
        maxEmpleados: 'unlimited',
        maxRecipes: 'unlimited',
        modules: {
            menu_engineering: 'premium',
            financial_control: 'premium',
            inventory: 'premium',
            staff_optimization: 'premium',
            ai_insights: true
        }
    }
}
