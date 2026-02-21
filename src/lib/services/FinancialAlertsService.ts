/**
 * FASE 3.2: Servicio de Alertas Financieras Proactivas
 * 
 * Genera alertas automáticas cuando se detectan anomalías:
 * - Desviaciones de margen
 * - Gastos sin ventas correspondientes
 * - Aumentos inusuales de desperdicio
 * - Riesgos de quiebra de stock
 */

import { createClient } from "@/lib/supabaseServer"
import { businessRulesService } from "./BusinessRulesService"

export interface FinancialAlert {
    id: string
    restaurant_id: string
    alert_type: 'margin_deviation' | 'expense_anomaly' | 'waste_spike' | 'stockout_risk'
    severity: 'info' | 'warning' | 'critical'
    title: string
    description: string
    metadata: Record<string, unknown>
    is_read: boolean
    is_resolved: boolean
    entity_type?: string
    entity_id?: string
    created_at: Date
}

export interface CreateAlertInput {
    restaurant_id: string
    alert_type: FinancialAlert['alert_type']
    severity: FinancialAlert['severity']
    title: string
    description: string
    metadata: Record<string, unknown>
    entity_type?: string
    entity_id?: string
}

/**
 * Servicio para gestión de alertas financieras automáticas
 */
export class FinancialAlertsService {
    /**
     * Verifica márgenes de recetas y genera alertas si es necesario
     */
    async checkRecipeMargins(restaurantId: string): Promise<void> {
        const supabase = await createClient()

        // Obtener todas las recetas activas
        const { data: recipes, error } = await supabase
            .from('recipes')
            .select('id, name, selling_price, current_cost')
            .eq('restaurant_id', restaurantId)
            .gt('selling_price', 0)

        if (error || !recipes) {
            console.error('Error fetching recipes for margin check:', error)
            return
        }

        // Obtener target de margen
        const marginRule = await businessRulesService.getActiveRule(
            restaurantId,
            'margin_target'
        )

        const targetMargin = marginRule?.value?.target_percentage || 70
        const warningThreshold = marginRule?.value?.warning_threshold || 5

        // Verificar cada receta
        for (const recipe of recipes) {
            const currentMargin = recipe.selling_price > 0
                ? ((recipe.selling_price - recipe.current_cost) / recipe.selling_price) * 100
                : 0

            const deviation = Math.abs(currentMargin - targetMargin)

            // Crear alerta si la desviación supera el threshold
            if (deviation > warningThreshold) {
                const severity: FinancialAlert['severity'] = deviation > warningThreshold * 2 ? 'critical' : 'warning'

                await this.createAlert({
                    restaurant_id: restaurantId,
                    alert_type: 'margin_deviation',
                    severity,
                    title: `Margen desviado: ${recipe.name}`,
                    description: `El margen actual (${currentMargin.toFixed(1)}%) se desvía ${deviation.toFixed(1)}% del target (${targetMargin}%)`,
                    metadata: {
                        recipe_id: recipe.id,
                        recipe_name: recipe.name,
                        current_margin: currentMargin,
                        target_margin: targetMargin,
                        deviation: deviation
                    },
                    entity_type: 'recipe',
                    entity_id: recipe.id
                })
            }
        }
    }

    /**
     * Detecta gastos sin ventas correspondientes (anomalía de operación)
     */
    async checkExpenseAnomalies(restaurantId: string): Promise<void> {
        const supabase = await createClient()
        const daysToCheck = 7 // Últimos 7 días

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysToCheck)

        // Obtener gastos recientes de alimentos
        const { data: recentExpenses, error: expenseError } = await supabase
            .from('operating_expenses')
            .select('id, amount, expense_date, category')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', startDate.toISOString())
            .in('category', ['PROVEEDORES_COMIDA', 'PROVEEDORES_BEBIDA'])

        if (expenseError || !recentExpenses || recentExpenses.length === 0) {
            return
        }

        // Verificar si hay ventas en ese período
        const { data: recentSales } = await supabase
            .from('daily_sales')
            .select('date, total_sales')
            .eq('restaurant_id', restaurantId)
            .gte('date', startDate.toISOString().split('T')[0])

        const hasSales = recentSales && recentSales.length > 0 &&
            recentSales.some(s => (s.total_sales || 0) > 0)

        // Si hay gastos pero no ventas, crear alerta
        if (!hasSales) {
            const totalExpenseAmount = recentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

            await this.createAlert({
                restaurant_id: restaurantId,
                alert_type: 'expense_anomaly',
                severity: totalExpenseAmount > 1000 ? 'warning' : 'info',
                title: 'Compras sin ventas registradas',
                description: `Se detectaron ${recentExpenses.length} gastos de alimentos/bebidas en los últimos ${daysToCheck} días sin ventas registradas (Total: €${totalExpenseAmount.toFixed(2)})`,
                metadata: {
                    expense_count: recentExpenses.length,
                    total_amount: totalExpenseAmount,
                    days_period: daysToCheck,
                    expenses: recentExpenses.map(e => ({
                        id: e.id,
                        amount: e.amount,
                        date: e.expense_date,
                        category: e.category
                    }))
                },
                entity_type: 'expense'
            })
        }
    }

    /**
     * Verifica aumentos inusuales en desperdicios
     */
    async checkWasteSpikes(restaurantId: string): Promise<void> {
        const supabase = await createClient()

        // Obtener datos de desperdicio de los últimos 30 días
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        const { data: wasteLogs, error } = await supabase
            .from('waste_logs')
            .select('date, quantity, ingredient:master_ingredients!inner(id, name)')
            .eq('restaurant_id', restaurantId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (error || !wasteLogs || wasteLogs.length < 7) {
            return // Necesitamos al menos 7 días de datos
        }

        // Agrupar por ingrediente y detectar picos
        const ingredientWaste: Record<string, { daily_avg: number; recent_avg: number; trend: 'increasing' | 'stable' | 'decreasing' }> = {}

        // Calcular promedios
        const midPoint = Math.floor(wasteLogs.length / 2)
        const recentLogs = wasteLogs.slice(-7) // Últimos 7 días
        const olderLogs = wasteLogs.slice(0, midPoint)

        for (const log of wasteLogs) {
            const ing = log.ingredient as unknown as { id: string; name: string } | null
            if (!ing || !ing.id) continue

            const ingId = ing.id
            if (!ingredientWaste[ingId]) {
                ingredientWaste[ingId] = {
                    daily_avg: 0,
                    recent_avg: 0,
                    trend: 'stable' as const
                }
            }
        }

        // Calcular promedios por período
        for (const ingId in ingredientWaste) {
            const olderItems = olderLogs.filter(l => {
                const ing = l.ingredient as unknown as { id: string } | null
                return ing?.id === ingId
            })
            const recentItems = recentLogs.filter(l => {
                const ing = l.ingredient as unknown as { id: string } | null
                return ing?.id === ingId
            })

            if (olderItems.length > 0) {
                ingredientWaste[ingId].daily_avg =
                    olderItems.reduce((sum, l) => sum + l.quantity, 0) / olderItems.length
            }

            if (recentItems.length > 0) {
                ingredientWaste[ingId].recent_avg =
                    recentItems.reduce((sum, l) => sum + l.quantity, 0) / recentItems.length

                // Determinar tendencia
                const ratio = ingredientWaste[ingId].recent_avg / (ingredientWaste[ingId].daily_avg || 1)
                if (ratio > 1.5) {
                    ingredientWaste[ingId].trend = 'increasing'
                } else if (ratio < 0.8) {
                    ingredientWaste[ingId].trend = 'decreasing'
                }
            }
        }

        // Crear alertas para ingredientes con tendencias crecientes
        const wasteRule = await businessRulesService.getActiveRule(
            restaurantId,
            'waste_threshold'
        )

        const threshold = wasteRule?.value?.warning_threshold || 50 // 50% de aumento

        for (const [ingId, data] of Object.entries(ingredientWaste)) {
            if (data.trend === 'increasing' && data.daily_avg > 0) {
                const increasePercent = ((data.recent_avg - data.daily_avg) / data.daily_avg) * 100

                if (increasePercent > threshold) {
                    // Encontrar el nombre del ingrediente
                    const logWithIngredient = recentLogs.find(l => {
                        const ing = l.ingredient as unknown as { id: string; name: string } | null
                        return ing?.id === ingId
                    })
                    const ingredientName = logWithIngredient?.ingredient
                        ? (logWithIngredient.ingredient as unknown as { id: string; name: string }).name
                        : 'Ingrediente'

                    await this.createAlert({
                        restaurant_id: restaurantId,
                        alert_type: 'waste_spike',
                        severity: 'warning',
                        title: 'Aumento inusual de desperdicio',
                        description: `${ingredientName}: +${increasePercent.toFixed(0)}% de desperdicio en los últimos 7 días`,
                        metadata: {
                            ingredient_id: ingId,
                            ingredient_name: ingredientName,
                            daily_avg: data.daily_avg,
                            recent_avg: data.recent_avg,
                            increase_percent: increasePercent
                        },
                        entity_type: 'ingredient',
                        entity_id: ingId
                    })
                }
            }
        }
    }

    /**
     * Crea una nueva alerta financiera
     */
    async createAlert(input: CreateAlertInput): Promise<FinancialAlert> {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('financial_alerts')
            .insert({
                restaurant_id: input.restaurant_id,
                alert_type: input.alert_type,
                severity: input.severity,
                title: input.title,
                description: input.description,
                metadata: input.metadata,
                entity_type: input.entity_type,
                entity_id: input.entity_id
            })
            .select()
            .single()

        if (error) {
            throw new Error(`Error creating alert: ${error.message}`)
        }

        return {
            ...data,
            created_at: new Date(data.created_at)
        } as FinancialAlert
    }

    /**
     * Obtiene alertas no leídas
     */
    async getUnreadAlerts(restaurantId: string): Promise<FinancialAlert[]> {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('financial_alerts')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching unread alerts:', error)
            return []
        }

        return (data || []).map(alert => ({
            ...alert,
            created_at: new Date(alert.created_at)
        })) as FinancialAlert[]
    }

    /**
     * Marca una alerta como leída
     */
    async markAsRead(alertId: string): Promise<void> {
        const supabase = await createClient()

        const { error } = await supabase
            .from('financial_alerts')
            .update({ is_read: true })
            .eq('id', alertId)

        if (error) {
            throw new Error(`Error marking alert as read: ${error.message}`)
        }
    }

    /**
     * Marca una alerta como resuelta
     */
    async markAsResolved(alertId: string): Promise<void> {
        const supabase = await createClient()

        const { error } = await supabase
            .from('financial_alerts')
            .update({
                is_resolved: true,
                resolved_at: new Date().toISOString()
            })
            .eq('id', alertId)

        if (error) {
            throw new Error(`Error marking alert as resolved: ${error.message}`)
        }
    }

    /**
     * Ejecuta todas las verificaciones de alertas
     */
    async runAllChecks(restaurantId: string): Promise<void> {
        await Promise.all([
            this.checkRecipeMargins(restaurantId),
            this.checkExpenseAnomalies(restaurantId),
            this.checkWasteSpikes(restaurantId)
        ])
    }
}

// Singleton instance
export const financialAlertsService = new FinancialAlertsService()
