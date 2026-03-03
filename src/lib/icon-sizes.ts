/**
 * Icon Sizes System - Estandarización
 * UI/UX Pro Max Rule: Icon sizes consistentes
 */

export const iconSizes = {
  xs: 'w-3 h-3',   // 12px - muy pequeño (badges, indicators)
  sm: 'w-4 h-4',   // 16px - pequeño (default, icons en texto)
  md: 'w-5 h-5',   // 20px - medio (cards, buttons)
  lg: 'w-6 h-6',   // 24px - grande (headers, featured)
  xl: 'w-8 h-8',   // 32px - extra grande
} as const

export type IconSize = keyof typeof iconSizes

/**
 * Helper para aplicar tamaño de icono consistente
 */
export function getIconSize(size: IconSize = 'sm'): string {
  return iconSizes[size]
}

/**
 * Grid de iconos con tamaños estandarizados por contexto
 */
export const iconSizesByContext = {
  'text-xs': iconSizes.xs,    // 12px
  'text-sm': iconSizes.sm,    // 16px
  'text-base': iconSizes.sm, // 16px
  'text-lg': iconSizes.md,    // 20px
  'text-xl': iconSizes.md,    // 20px
  'text-2xl': iconSizes.lg,   // 24px
  'text-3xl': iconSizes.xl,   // 32px
} as const

export const iconSizesByComponent = {
  'button-sm': iconSizes.sm,    // 16px
  'button-default': iconSizes.md, // 20px
  'button-lg': iconSizes.lg,    // 24px
  'button-icon': iconSizes.md,  // 20px
  'avatar': iconSizes.lg,       // 24px
  'card-icon': iconSizes.md,    // 20px
  'menu-item': iconSizes.sm,     // 16px
  'table-action': iconSizes.sm, // 16px
} as const