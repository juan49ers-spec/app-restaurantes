export interface ChartDataItem {
    id: string
    name: string
    x: number
    y: number
    z: number
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
    originalX: number
    originalY: number
    hasMoved: boolean
}

export const COLORS = {
    STAR: '#10b981',
    PLOWHORSE: '#f59e0b',
    PUZZLE: '#8b5cf6',
    DOG: '#f43f5e',
    DEFAULT: '#94a3b8'
}

export const quadrantConfig = {
    STAR: { label: "ESTRELLAS", color: COLORS.STAR, bg: "rgba(16, 185, 129, 0.05)" },
    PLOWHORSE: { label: "VACAS", color: COLORS.PLOWHORSE, bg: "rgba(245, 158, 11, 0.05)" },
    PUZZLE: { label: "ENIGMAS", color: COLORS.PUZZLE, bg: "rgba(139, 92, 246, 0.05)" },
    DOG: { label: "PERROS", color: COLORS.DOG, bg: "rgba(244, 63, 94, 0.05)" },
}

export const CLASSIFICATION_LABELS: Record<string, string> = {
    STAR: 'Estrella',
    PLOWHORSE: 'Vaca',
    PUZZLE: 'Enigma',
    DOG: 'Perro'
}

export const QUICK_ACTIONS = [
    { label: '-10%', factor: -0.10, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/20' },
    { label: '-5%', factor: -0.05, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20' },
    { label: '+5%', factor: 0.05, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20' },
    { label: '+10%', factor: 0.10, color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-500/30' },
]

export function getColor(classification?: string) {
    switch (classification) {
        case 'STAR': return COLORS.STAR
        case 'PLOWHORSE': return COLORS.PLOWHORSE
        case 'PUZZLE': return COLORS.PUZZLE
        case 'DOG': return COLORS.DOG
        default: return COLORS.DEFAULT
    }
}
