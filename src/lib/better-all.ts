/**
 * betterAll - Utilidad para parallelización inteligente de dependencies
 * 
 * Implementa el patrón "better-all" de Vercel React Best Practices:
 * - Permite partial dependencies (algunas pueden fallar sin romper todo)
 * - Continúa con resultados parciales si algunos fallan
 * - Mejor tolerancia a fallos en datos secundarios
 * 
 * @example
 * // En lugar de Promise.all que falla si cualquiera falla:
 * const [sales, expenses, alerts] = await Promise.all([...])
 * 
 * // Usar betterAll para continuar aunque alerts falle:
 * const [sales, expenses, alerts] = await betterAll([
 *   getSales(),      // Crítico
 *   getExpenses(),   // Crítico
 *   getAlerts(),    // No-crítico, puede fallar
 * ])
 */

export type BetterAllResult<T> = {
  success: boolean
  data?: T
  error?: Error
}

export async function betterAll<T>(
  promises: Promise<T>[],
  options?: {
    /** Si es true, continúa aunque algunos fallen */
    continueOnError?: boolean
    /** Callback para errores */
    onError?: (error: Error, index: number) => void
  }
): Promise<(T | null)[]> {
  const { continueOnError = true, onError } = options || {}

  // Mapear cada promise a un resultado que nunca falla
  const settledPromises = promises.map(async (promise, index) => {
    try {
      return await promise
    } catch (error) {
      if (onError) {
        onError(error as Error, index)
      }
      if (continueOnError) {
        console.warn(`Promise ${index} failed, continuing with partial results:`, error)
        return null
      }
      throw error
    }
  })

  return Promise.all(settledPromises)
}

/**
 * Versión tipada de betterAll que preserva tipos
 */
export async function betterAllTyped<T>(
  operations: Array<{
    promise: Promise<T>
    critical?: boolean
    name?: string
  }>,
  options?: {
    onError?: (error: Error, operation: { name?: string }) => void
  }
): Promise<(T | null)[]> {
  const { onError } = options || {}

  const settledPromises = operations.map(async ({ promise, critical = false, name }) => {
    try {
      return await promise
    } catch (error) {
      if (onError) {
        onError(error as Error, { name })
      }
      if (!critical) {
        console.warn(`Non-critical operation "${name}" failed:`, error)
        return null
      }
      throw error
    }
  })

  return Promise.all(settledPromises)
}

/**
 * betterAll con timeout por operación
 */
export async function betterAllWithTimeout<T>(
  promises: Array<{
    promise: Promise<T>
    timeout?: number
    name?: string
  }>,
  options?: {
    onError?: (error: Error, operation: { name?: string }) => void
  }
): Promise<(T | null)[]> {
  const { onError } = options || {}

  const settledPromises = promises.map(async ({ promise, timeout = 5000, name }) => {
    try {
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation "${name}" timed out after ${timeout}ms`)), timeout)
        )
      ])
      return result
    } catch (error) {
      if (onError) {
        onError(error as Error, { name })
      }
      console.warn(`Operation "${name}" failed or timed out:`, error)
      return null
    }
  })

  return Promise.all(settledPromises)
}