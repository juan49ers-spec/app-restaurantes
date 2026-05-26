import { DriveStep } from "driver.js"

export interface Scenario {
    id: string
    title: string
    description: string
    icon: string // Lucide icon name
    module: 'menu' | 'stock' | 'finance' | 'purchasing'
    steps: DriveStep[]
    startUrl: string
    // New Metadata
    difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
    duration: string // e.g. "2 min"
    category: 'Onboarding' | 'Gestión Diaria' | 'Optimización'
}

export const SCENARIOS: Scenario[] = [
    {
        id: 'price-burger',
        title: 'Masterclass: Ingeniería de Menú',
        description: 'Aprende a crear un Escandallo profesional, fijar precios basados en datos y analizar la rentabilidad de cada plato.',
        icon: 'Utensils',
        module: 'menu',
        startUrl: '/recipes',
        difficulty: 'Básico',
        duration: '5 min',
        category: 'Onboarding',
        steps: [
            {
                element: '#new-recipe-btn',
                popover: {
                    title: '1. El Corazón de tu Negocio',
                    description: 'Todo empieza aquí. Un Escandallo no es solo una receta, es la ficha financiera de tu plato. Sin esto, estás vendiendo a ciegas.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#recipe-name-input',
                popover: {
                    title: '2. Naming y Categorización',
                    description: 'Usa nombres claros. "Hamburguesa Nostra" es mejor que "Hamb. 1". La categoría define dónde aparecerá en los reportes de ingeniería.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#ingredients-section',
                popover: {
                    title: '3. Construcción de Costes',
                    description: 'Añade ingredientes uno a uno. El sistema extrae el precio de la última factura o del precio de mercado. Si el precio del tomate sube, tu coste se actualiza solo.',
                    side: "top",
                    align: 'start'
                }
            },
            {
                element: '#production-yield',
                popover: {
                    title: '4. Mermas y Rendimiento',
                    description: 'No todo lo que compras se vende. Si limpias un solomillo y pierdes el 20%, indícalo aquí. El coste real debe incluir lo que tiras.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#kpi-food-cost',
                popover: {
                    title: '5. El Food Cost (Coste de Materia Prima)',
                    description: 'Este es tu "semáforo". Para un plato principal, intenta que no supere el 30%. Si está en rojo, o subes precio, o bajas cantidad, o renegocias con proveedores.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#price-input',
                popover: {
                    title: '6. Fijación de Precio (PVP)',
                    description: 'Introduce el precio de carta (con IVA). El sistema descuenta el impuesto automáticamente para mostrarte tu ingreso neto real.',
                    side: "left",
                    align: 'center'
                }
            },
            {
                element: '#kpi-gross-margin',
                popover: {
                    title: '7. Margen Bruto',
                    description: 'Este es el dinero que te queda para pagar alquiler, luz y personal. ¡Maximízalo!',
                    side: "top",
                    align: 'center'
                }
            }
        ]
    },
    {
        id: 'log-purchase',
        title: 'Flujo de Compras y Stock',
        description: 'Domina el ciclo de aprovisionamiento: Desde la factura hasta la estantería del almacén.',
        icon: 'PackageCheck',
        module: 'stock',
        startUrl: '/stock',
        difficulty: 'Intermedio',
        duration: '3 min',
        category: 'Gestión Diaria',
        steps: [
            {
                element: '#stock-stats-cards',
                popover: {
                    title: 'Visión General del Almacén',
                    description: 'Aquí ves el valor total de tu stock inmovilizado. Dinero parado en estanterías es dinero que no está en tu banco.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#manual-entry-btn',
                popover: {
                    title: 'Entrada Rápida (Sin Factura)',
                    description: '¿Compras de urgencia en el súper? No esperes a la factura. Regístralo aquí para que el stock cuadre hoy mismo.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#review-invoice-link',
                popover: {
                    title: 'Conciliación de Facturas',
                    description: 'Cuando llegue la factura real, vincúlala aquí. El sistema detectará si el precio ha variado respecto a lo pactado.',
                    side: "bottom",
                    align: 'start'
                }
            }
        ]
    },
    {
        id: 'analyze-sales',
        title: 'Análisis Financiero Diario',
        description: 'Cómo leer la salud de tu restaurante en 5 minutos cada mañana.',
        icon: 'BarChart3',
        module: 'finance',
        startUrl: '/financial-control',
        difficulty: 'Avanzado',
        duration: '4 min',
        category: 'Optimización',
        steps: [
            {
                element: '#date-range-picker',
                popover: {
                    title: 'El Periodo de Análisis',
                    description: 'No mires solo "ayer". Analiza semanas completas para ver tendencias y corregir el rumbo antes de acabar el mes.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#kpi-sales',
                popover: {
                    title: 'Ventas Netas',
                    description: 'Tus ventas sin IVA. Este es el dinero real que entra en la caja.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#kpi-prime-cost',
                popover: {
                    title: 'Prime Cost: El Número de Oro',
                    description: 'Coste de Producto + Coste de Personal. Si esto suma más del 60%, tu restaurante está en peligro, aunque vendas mucho.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#break-even-chart',
                popover: {
                    title: 'Punto de Equilibrio',
                    description: 'Este gráfico te dice qué día del mes empiezas a ganar dinero real. Todo lo anterior es solo cubrir gastos.',
                    side: "top",
                    align: 'center'
                }
            }
        ]
    }
]
