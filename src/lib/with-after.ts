/**
 * after() Decorator para Server Actions
 * 
 * Implementa el patrón server-after-nonblocking de Vercel
 */

import { executeAfterCallbacks } from './after'

/**
 * Decorador para Server Actions que ejecuta after() callbacks
 * 
 * @example
 * 'use server'
 * 
 * export const saveData = withServerAfterAction(async (formData: FormData) => {
 *   // Tu lógica aquí
 *   after(() => logToAnalytics())
 *   return { success: true }
 * })
 */
export function withServerAfterAction<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    const result = await handler(...args)
    
    // Ejecutar after callbacks (non-blocking)
    executeAfterCallbacks().catch(() => {})
    
    return result
  }
}
