/**
 * after() - Non-blocking operations utility for Next.js Server Components
 * 
 * Implementa el patrón "server-after-nonblocking" de Vercel React Best Practices:
 * - Permite ejecutar operaciones NO críticas después de enviar la respuesta
 * - No bloquea el rendering de la página
 * - Ideal para: analytics, logging, cache warming, notifications
 * 
 * @example
 * export default async function Page() {
 *   const data = await getData() // Crítico - bloquea render
 *   after(() => {
 *     logPageView() // No-crítico - NO bloquea render
 *     updateAnalytics() // No-crítico - NO bloquea render
 *   })
 *   return <div>{data}</div>
 * }
 */

type AfterCallback = () => void | Promise<void>

// Mapa para track callbacks después del render
const afterCallbacks = new Set<AfterCallback>()

/**
 * Registra un callback para ejecutar después del render
 * NO bloquea la respuesta HTTP
 */
export function after(callback: AfterCallback) {
  afterCallbacks.add(callback)
}

/**
 * Ejecuta todos los callbacks registrados
 * Llamado automáticamente por el framework o manualmente
 */
export async function executeAfterCallbacks() {
  const callbacks = Array.from(afterCallbacks)
  afterCallbacks.clear()

  // Ejecutar en paralelo, no esperar resultados
  const results = callbacks.map(async (callback) => {
    try {
      await callback()
    } catch (error) {
      console.error('After callback failed:', error)
      // No lanzar error - después del render no podemos manejarlo
    }
  })

  // Esperar todos (background) pero no bloquear
  Promise.all(results).catch(() => {
    // Todos los errores ya fueron loggeados individualmente
  })
}

/**
 * Hook de Next.js para ejecutar after callbacks automáticamente
 * Puedes agregar esto a tu layout o page wrapper
 */
export function withAfterHandler<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const result = await handler(...args)
    
    // Ejecutar after callbacks después de la respuesta
    executeAfterCallbacks().catch(() => {})
    
    return result
  }
}
