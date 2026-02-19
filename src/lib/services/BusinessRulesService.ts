/**
 * FASE 3.1: Servicio de Reglas de Negocio Versionadas
 * 
 * Gestiona reglas de negocio (COGS target, labor target, etc.)
 * con control de versiones temporales.
 */

import { createClient } from "@/lib/supabaseServer"

export interface BusinessRuleValue {
    target_percentage?: number
    warning_threshold?: number
    critical_threshold?: number
    min_value?: number
    max_value?: number
    [key: string]: number | string | boolean | undefined
}

export interface BusinessRule {
    id: string
    restaurant_id: string
    rule_name: string
    rule_type: 'cogs_target' | 'labor_target' | 'margin_target' | 'waste_threshold'
    version: number
    value: BusinessRuleValue
    description?: string
    valid_from: Date
    valid_until?: Date
    is_active: boolean
    created_at: Date
    updated_at: Date
}

export type RuleType = 'cogs_target' | 'labor_target' | 'margin_target' | 'waste_threshold'

/**
 * Servicio para gestionar reglas de negocio con versionado temporal
 */
export class BusinessRulesService {
    /**
     * Obtiene la regla activa para un tipo específico en una fecha
     */
    async getActiveRule(
        restaurantId: string,
        ruleType: RuleType,
        date: Date = new Date()
    ): Promise<BusinessRule | null> {
        const supabase = await createClient()

        const dateStr = date.toISOString().split('T')[0]

        const { data, error } = await supabase.rpc('get_active_business_rule', {
            p_restaurant_id: restaurantId,
            p_rule_type: ruleType,
            p_date: dateStr
        })

        if (error) {
            console.error(`Error fetching active rule for ${ruleType}:`, error)
            return null
        }

        if (!data || data.length === 0) {
            return null
        }

        const rule = data[0] as {
            rule_id: string
            rule_name: string
            value: BusinessRuleValue
            valid_from: string
            version: number
        }

        return {
            id: rule.rule_id,
            restaurant_id: restaurantId,
            rule_name: rule.rule_name,
            rule_type: ruleType,
            version: rule.version,
            value: rule.value,
            valid_from: new Date(rule.valid_from),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }
    }

    /**
     * Crea una nueva versión de una regla de negocio
     */
    async createRule(
        restaurantId: string,
        rule: Omit<BusinessRule, 'id' | 'restaurant_id' | 'version' | 'created_at' | 'updated_at'>
    ): Promise<BusinessRule> {
        const supabase = await createClient()

        // Obtener última versión
        const { data: lastVersion } = await supabase
            .from('business_rules')
            .select('version')
            .eq('restaurant_id', restaurantId)
            .eq('rule_type', rule.rule_type)
            .order('version', { ascending: false })
            .limit(1)
            .single()

        const newVersion = (lastVersion?.version || 0) + 1

        const { data, error } = await supabase
            .from('business_rules')
            .insert({
                restaurant_id: restaurantId,
                rule_name: rule.rule_name,
                rule_type: rule.rule_type,
                version: newVersion,
                value: rule.value,
                description: rule.description,
                valid_from: rule.valid_from.toISOString().split('T')[0],
                valid_until: rule.valid_until ? rule.valid_until.toISOString().split('T')[0] : null,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            throw new Error(`Error creating business rule: ${error.message}`)
        }

        return {
            ...data,
            valid_from: new Date(data.valid_from),
            valid_until: data.valid_until ? new Date(data.valid_until) : undefined,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        } as BusinessRule
    }

    /**
     * Obtiene todas las reglas de un restaurante
     */
    async getAllRules(restaurantId: string): Promise<BusinessRule[]> {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('business_rules')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('rule_type')
            .order('valid_from', { ascending: false })

        if (error) {
            throw new Error(`Error fetching business rules: ${error.message}`)
        }

        return (data || []).map(rule => ({
            ...rule,
            valid_from: new Date(rule.valid_from),
            valid_until: rule.valid_until ? new Date(rule.valid_until) : undefined,
            created_at: new Date(rule.created_at),
            updated_at: new Date(rule.updated_at)
        })) as BusinessRule[]
    }

    /**
     * Desactiva una regla (soft delete)
     */
    async deactivateRule(ruleId: string): Promise<void> {
        const supabase = await createClient()

        const { error } = await supabase
            .from('business_rules')
            .update({ is_active: false })
            .eq('id', ruleId)

        if (error) {
            throw new Error(`Error deactivating rule: ${error.message}`)
        }
    }
}

// Singleton instance
export const businessRulesService = new BusinessRulesService()
