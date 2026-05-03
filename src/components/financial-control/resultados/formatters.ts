export const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val)

export const formatPercent = (val: number): string =>
  `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
