export type AddonId = 'operativa' | 'personal' | 'proveedores'

export interface PlanModuleAccess {
    operativa: 'none' | 'basic' | 'premium'
    financial_control: 'none' | 'basic' | 'premium'
    proveedores: 'none' | 'basic' | 'premium'
    personal: 'none' | 'basic' | 'premium'
}

export interface BasePlanDefinition {
    id: 'CORE'
    name: string
    monthlyPrice: number
    description: string
    includedOcrCredits: number // Credits given per month
    maxEmpleados: number | 'unlimited'
    maxRecipes: number | 'unlimited'
    modules: PlanModuleAccess // Base modules enabled by default
}

export interface AddonDefinition {
    id: AddonId
    name: string
    monthlyPrice: number
    description: string
    modulesGranted: Partial<PlanModuleAccess> // Modifica el acceso base al activarse
}

// --- FALLBACKS & TYPES ---
// Note: These constants are now FALLBACKS. 
// The real source of truth is the 'billing_modules' table in the database.
// Use 'getBillingModulesConfig' and 'getBillingOverview' actions to get live data.

export const BASE_PLAN: BasePlanDefinition = {
    id: 'CORE',
    name: 'Gestión Financiera Base',
    monthlyPrice: 29, // Fallback value
    description: 'Control financiero básico, análisis de rentabilidad y OCR.',
    includedOcrCredits: 50,
    maxEmpleados: 10,
    maxRecipes: 50,
    modules: {
        operativa: 'none',
        financial_control: 'premium',
        proveedores: 'none',
        personal: 'none'
    }
}

export const ADDON_MODULES: Record<AddonId, AddonDefinition> = {
    operativa: {
        id: 'operativa',
        name: 'Ingeniería de Menú',
        monthlyPrice: 20, // Fallback value
        description: 'Escandallos avanzados, control de mermas e IA de recetas.',
        modulesGranted: {
            operativa: 'premium'
        }
    },
    personal: {
        id: 'personal',
        name: 'Optimización de Personal',
        monthlyPrice: 25, // Fallback value
        description: 'Gestión de turnos, convenios y rentabilidad por empleado.',
        modulesGranted: {
            personal: 'premium'
        }
    },
    proveedores: {
        id: 'proveedores',
        name: 'Gestión de Inventario',
        monthlyPrice: 30, // Fallback value
        description: 'Control de stock, órdenes automáticas e integración con OCR avanzado.',
        modulesGranted: {
            proveedores: 'premium'
        }
    }
}

/**
 * Technical permissions mapping logic
 */
export function calculateEffectiveAccess(activeAddons: AddonId[]): PlanModuleAccess {
    const access = { ...BASE_PLAN.modules }

    activeAddons.forEach(addonId => {
        const addon = ADDON_MODULES[addonId]
        if (addon) {
            Object.assign(access, addon.modulesGranted)
        }
    })

    return access
}

/**
 * @deprecated Use dynamic prices from the database for sensitive calculations
 */
export function calculateMonthlyPrice(activeAddons: AddonId[]): number {
    let total = BASE_PLAN.monthlyPrice
    activeAddons.forEach(addonId => {
        const addon = ADDON_MODULES[addonId]
        if (addon) {
            total += addon.monthlyPrice
        }
    })
    return total
}
