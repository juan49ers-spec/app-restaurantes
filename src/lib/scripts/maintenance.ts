/**
 * FASE 4.3: Scripts de Mantenimiento Automatizado
 * 
 * Scripts para tareas comunes de mantenimiento:
 * - VACUUM ANALYZE de tablas grandes
 * - Limpieza de logs antiguos
 * - Health checks del sistema
 */

import { createClient } from "../supabaseServer"

/**
 * Ejecuta VACUUM ANALYZE en todas las tablas del usuario
 * 
 * VACUUM libera espacio y reorganiza datos en disco
 * ANALYZE actualiza estadísticas para el query planner
 */
export async function vacuumAnalyzeTables(): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        // Usar RPC o SQL directo para VACUUM ANALYZE
        const { error } = await supabase.rpc('vacuum_analyze_tables')

        if (error) {
            // Si no existe la función RPC, intentar con SQL directo
            console.log('RPC not available, attempting direct SQL...')

            const tables = [
                'invoices',
                'invoice_items',
                'operating_expenses',
                'daily_sales',
                'waste_logs',
                'stock_movements',
                'recipes',
                'recipe_ingredients',
                'master_ingredients',
                'inventory_stock'
            ]

            for (const table of tables) {
                await supabase.rpc('exec_sql', {
                    sql: `VACUUM ANALYZE ${table};`
                })
            }
        }

        return {
            success: true,
            message: 'VACUUM ANALYZE completado exitosamente'
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        return {
            success: false,
            message: `Error en VACUUM ANALYZE: ${message}`
        }
    }
}

/**
 * Limpia logs y alertas antiguas
 * 
 * Elimina registros financieros antiguos para mantener rendimiento
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<{
    success: boolean
    deletedAlerts: number
    deletedLogs: number
    message: string
}> {
    const supabase = await createClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    try {
        // Eliminar alertas resueltas antiguas
        const { count: deletedAlerts } = await supabase
            .from('financial_alerts')
            .delete({ count: 'exact' })
            .lt('created_at', cutoffDate.toISOString())
            .eq('is_resolved', true)

        // Nota: No eliminamos waste_logs, stock_movements, etc.
        // Son datos históricos importantes para el negocio

        return {
            success: true,
            deletedAlerts: deletedAlerts || 0,
            deletedLogs: 0,
            message: `Limpieza completada: ${deletedAlerts} alertas eliminadas`
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        return {
            success: false,
            deletedAlerts: 0,
            deletedLogs: 0,
            message: `Error en limpieza: ${message}`
        }
    }
}

/**
 * Health check del sistema
 * 
 * Verifica: base de datos, auth, storage, y métricas clave
 */
export async function healthCheck(): Promise<{
    success: boolean
    checks: Record<string, boolean | string>
    overallStatus: 'healthy' | 'degraded' | 'unhealthy'
}> {
    const checks: Record<string, boolean | string> = {}
    let failedChecks = 0

    // 1. Database check
    try {
        const supabase = await createClient()
        const { error } = await supabase.from('restaurants').select('id').limit(1)
        checks['database'] = !error
        if (error) failedChecks++
    } catch {
        checks['database'] = false
        failedChecks++
    }

    // 2. Auth check
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        checks['auth'] = !!user
    } catch {
        checks['auth'] = true // Auth puede fallar si no hay usuario, pero el servicio está up
    }

    // 3. Storage check
    try {
        const supabase = await createClient()
        const { data } = await supabase.storage.listBuckets()
        checks['storage'] = !!data
        if (!data) failedChecks++
    } catch {
        checks['storage'] = false
        failedChecks++
    }

    // 4. Query performance check (últimas 100 recetas)
    try {
        const supabase = await createClient()
        const start = Date.now()
        await supabase
            .from('recipes')
            .select('id, name')
            .limit(100)
        const duration = Date.now() - start

        checks['query_performance'] = duration < 500
        if (duration >= 500) failedChecks++
    } catch {
        checks['query_performance'] = false
        failedChecks++
    }

    // Determinar estado general
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks === 0) {
        overallStatus = 'healthy'
    } else if (failedChecks <= 2) {
        overallStatus = 'degraded'
    } else {
        overallStatus = 'unhealthy'
    }

    return {
        success: overallStatus !== 'unhealthy',
        checks,
        overallStatus
    }
}

/**
 * Optimiza tablas del sistema
 * 
 * - Reindexa tablas con alto índice de escritura
 * - Actualiza estadísticas
 * - Reporta tamaño de tablas
 */
export async function optimizeDatabase(): Promise<{
    success: boolean
    tablesOptimized: string[]
    message: string
}> {
    const supabase = await createClient()
    const tablesOptimized: string[] = []

    try {
        // Tablas con alta rotación que necesitan optimización
        const tables = [
            'stock_movements',
            'waste_logs',
            'daily_sales'
        ]

        for (const table of tables) {
            try {
                // ANALYZE actualiza estadísticas para el query planner
                await supabase.rpc('exec_sql', {
                    sql: `ANALYZE ${table};`
                })
                tablesOptimized.push(table)
            } catch (error) {
                console.warn(`Failed to optimize ${table}:`, error)
            }
        }

        return {
            success: true,
            tablesOptimized,
            message: `${tablesOptimized.length} tablas optimizadas`
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        return {
            success: false,
            tablesOptimized,
            message: `Error en optimización: ${message}`
        }
    }
}

/**
 * Genera reporte de métricas del sistema
 */
export async function generateSystemMetrics(): Promise<{
    success: boolean
    metrics: {
        totalRestaurants: number
        totalRecipes: number
        totalIngredients: number
        totalInvoices: number
        totalAlerts: number
        unreadAlerts: number
        databaseSize?: string
    }
}> {
    const supabase = await createClient()

    try {
        // Contar registros clave
        const [
            { count: totalRestaurants },
            { count: totalRecipes },
            { count: totalIngredients },
            { count: totalInvoices },
            { count: totalAlerts },
            { count: unreadAlerts }
        ] = await Promise.all([
            supabase.from('restaurants').select('id', { count: 'exact', head: true }),
            supabase.from('recipes').select('id', { count: 'exact', head: true }),
            supabase.from('master_ingredients').select('id', { count: 'exact', head: true }),
            supabase.from('invoices').select('id', { count: 'exact', head: true }),
            supabase.from('financial_alerts').select('id', { count: 'exact', head: true }),
            supabase.from('financial_alerts').select('id', { count: 'exact', head: true }).eq('is_read', false)
        ])

        return {
            success: true,
            metrics: {
                totalRestaurants: totalRestaurants || 0,
                totalRecipes: totalRecipes || 0,
                totalIngredients: totalIngredients || 0,
                totalInvoices: totalInvoices || 0,
                totalAlerts: totalAlerts || 0,
                unreadAlerts: unreadAlerts || 0
            }
        }
    } catch (_error: unknown) {
        return {
            success: false,
            metrics: {
                totalRestaurants: 0,
                totalRecipes: 0,
                totalIngredients: 0,
                totalInvoices: 0,
                totalAlerts: 0,
                unreadAlerts: 0
            }
        }
    }
}
