/**
 * Spanish Fiscal Calendar Utilities
 */

export interface FiscalQuarterInfo {
    quarter: string
    nextDeadline: string
    year: number
}

/**
 * Determines the current fiscal quarter and the next tax deadline (Spain)
 * Deadlines for Modelo 303/111 are usually the 20th of the month following the quarter,
 * except for the 4th quarter which is the 30th of January.
 */
export function getFiscalQuarterInfo(date: Date = new Date()): FiscalQuarterInfo {
    const month = date.getMonth() // 0-11
    const year = date.getFullYear()

    if (month < 3) {
        return { quarter: "1T", nextDeadline: `20 de Abril ${year}`, year }
    } else if (month < 6) {
        return { quarter: "2T", nextDeadline: `20 de Julio ${year}`, year }
    } else if (month < 9) {
        return { quarter: "3T", nextDeadline: `20 de Octubre ${year}`, year }
    } else {
        return { quarter: "4T", nextDeadline: `30 de Enero ${year + 1}`, year }
    }
}

/**
 * Formats a currency value for Spanish locale
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount)
}
