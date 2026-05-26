export const DEFAULT_BUSINESS_TIME_ZONE = 'Europe/Madrid'

export function formatDateEs(value: string | Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: DEFAULT_BUSINESS_TIME_ZONE,
  }).format(new Date(value))
}

export function formatDateTimeEs(value: string | Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_BUSINESS_TIME_ZONE,
  }).format(new Date(value))
}

export function formatDateInputEs(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}
