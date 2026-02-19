// Design Tokens - Sistema de diseño coherente
// Basado en Visual Design Foundations & Frontend Design Skills

export const tokens = {
  // Espaciado 8-point grid
  spacing: {
    '0': '0',
    '1': '0.25rem',  // 4px
    '2': '0.5rem',   // 8px
    '3': '0.75rem',  // 12px
    '4': '1rem',     // 16px
    '5': '1.25rem',  // 20px
    '6': '1.5rem',   // 24px
    '8': '2rem',     // 32px
    '10': '2.5rem',  // 40px
    '12': '3rem',    // 48px
    '16': '4rem',    // 64px
  },

  // Tipografía escalada
  fontSize: {
    'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
    'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
    'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
    '5xl': ['3rem', { lineHeight: '1' }],           // 48px
  },

  // Colores semánticos - Sistema restaurante/finanzas
  colors: {
    // Primarios
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    // Estados
    success: {
      light: '#dcfce7',
      DEFAULT: '#16a34a',
      dark: '#15803d',
      contrast: '#ffffff',
    },
    warning: {
      light: '#fef3c7',
      DEFAULT: '#d97706',
      dark: '#b45309',
      contrast: '#ffffff',
    },
    danger: {
      light: '#fee2e2',
      DEFAULT: '#dc2626',
      dark: '#b91c1c',
      contrast: '#ffffff',
    },
    info: {
      light: '#dbeafe',
      DEFAULT: '#2563eb',
      dark: '#1d4ed8',
      contrast: '#ffffff',
    },

    // Neutros - Escala completa
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },

  // Radios de borde
  borderRadius: {
    'none': '0',
    'sm': '0.375rem',   // 6px
    'DEFAULT': '0.5rem', // 8px
    'md': '0.625rem',   // 10px
    'lg': '0.75rem',    // 12px
    'xl': '1rem',       // 16px
    '2xl': '1.25rem',   // 20px
    '3xl': '1.5rem',    // 24px
    'full': '9999px',
  },

  // Sombras
  shadow: {
    'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Transiciones
  transition: {
    'fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    'DEFAULT': '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    'slow': '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-index scale
  zIndex: {
    '0': '0',
    '10': '10',
    '20': '20',
    '30': '30',
    '40': '40',
    '50': '50',
  },
} as const

// Types para autocompletado
export type SpacingToken = keyof typeof tokens.spacing
export type FontSizeToken = keyof typeof tokens.fontSize
export type ColorToken = keyof typeof tokens.colors
export type BorderRadiusToken = keyof typeof tokens.borderRadius
export type ShadowToken = keyof typeof tokens.shadow
export type TransitionToken = keyof typeof tokens.transition
export type ZIndexToken = keyof typeof tokens.zIndex

// Helper functions
export const getSpacing = (token: SpacingToken) => tokens.spacing[token]
export const getFontSize = (token: FontSizeToken) => tokens.fontSize[token]
export const getColor = (path: string) => {
  const parts = path.split('.')
  let result: Record<string, unknown> | string = tokens.colors
  for (const part of parts) {
    if (typeof result === 'object' && result !== null) {
      result = (result as Record<string, unknown>)[part] as Record<string, unknown> | string
    } else {
      return undefined // or handle error
    }
  }
  return result as string
}
