export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error }
}
