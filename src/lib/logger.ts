/**
 * FASE 4.1: Logging Estructurado con Pino
 * 
 * Reemplaza console.log/error con logging estructurado para:
 * - Búsqueda fácil de errores
 * - Análisis de patrones
 * - Exportación a Axiom/Logflare
 * - Performance tracking
 */

import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Niveles de log:
 * - trace: Muy detallado (debugging intensivo)
 * - debug: Información de depuración
 * - info: Información general
 * - warn: Advertencias
 * - error: Errores manejados
 * - fatal: Errores críticos que requieren atención inmediata
 */

const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    
    // Formato diferenciado por ambiente
    ...(isDevelopment ? {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
                singleLine: false
            }
        }
    } : {}),

    // Base fields (incluidos en todos los logs)
    base: {
        env: process.env.NODE_ENV || 'development',
        app: 'controlhub-pro'
    },

    // Timestamps en ISO 8601
    timestamp: pino.stdTimeFunctions.isoTime,

    // Serialización de errores
    serializers: {
        err: pino.stdSerializers.err
    },

    // Redactar campos sensibles
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        remove: true
    }
})

/**
 * Logger principal para Server Actions
 */
export const logger = baseLogger

/**
 * Crea un logger con contexto específico para Server Actions
 * 
 * @param actionName - Nombre del Server Action
 * @returns Logger con contexto pre-configurado
 * 
 * @example
 * export async function saveRecipe(data: RecipeInput) {
 *     const log = createActionLogger('saveRecipe')
 *     
 *     log.info('Starting save', { recipeName: data.name })
 *     
 *     try {
 *         // ... lógica
 *         log.info('Recipe saved successfully', { recipeId })
 *     } catch (error) {
 *         log.error('Failed to save recipe', { error, recipeName: data.name })
 *         throw error
 *     }
 * }
 */
export function createActionLogger(actionName: string) {
    const requestId = crypto.randomUUID()

    return logger.child({
        context: 'server-action',
        action: actionName,
        requestId
    })
}

/**
 * Logger para Server Actions con medición de performance
 */
export class PerformanceLogger {
    private log: pino.Logger
    private startTime: number

    constructor(actionName: string) {
        this.log = createActionLogger(actionName)
        this.startTime = Date.now()
    }

    start(data?: Record<string, unknown>) {
        this.log.info({
            msg: 'Action started',
            ...data,
            startTime: new Date(this.startTime).toISOString()
        })
        return this
    }

    step(stepName: string, data?: Record<string, unknown>) {
        const elapsed = Date.now() - this.startTime
        this.log.debug({
            msg: `Step: ${stepName}`,
            step: stepName,
            elapsedMs: elapsed,
            ...data
        })
        return this
    }

    complete(data?: Record<string, unknown>) {
        const elapsed = Date.now() - this.startTime
        this.log.info({
            msg: 'Action completed successfully',
            elapsedMs: elapsed,
            ...data
        })
        return elapsed
    }

    error(error: unknown, data?: Record<string, unknown>) {
        const elapsed = Date.now() - this.startTime
        this.log.error({
            msg: 'Action failed',
            elapsedMs: elapsed,
            err: error,
            ...data
        })
        return elapsed
    }
}

/**
 * Helper para crear logger de performance
 */
export function createPerformanceLogger(actionName: string): PerformanceLogger {
    return new PerformanceLogger(actionName)
}

/**
 * Logger para querys de base de datos
 */
export const dbLogger = logger.child({
    context: 'database'
})

/**
 * Logger para APIs externas
 */
export const apiLogger = logger.child({
    context: 'external-api'
})

/**
 * Logger para tareas en segundo plano
 */
export const jobLogger = logger.child({
    context: 'background-job'
})

/**
 * Middleware de logging para Next.js API routes (opcional)
 */
export function logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
) {
    logger.info({
        msg: 'API Request',
        context: 'api-route',
        method,
        path,
        statusCode,
        durationMs: duration
    })
}

/**
 * Export default para uso fácil
 */
export default logger
