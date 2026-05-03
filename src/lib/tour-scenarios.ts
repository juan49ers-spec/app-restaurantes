import { DriveStep } from "driver.js"

export interface Scenario {
    id: string
    title: string
    description: string
    icon: string
    module: 'menu' | 'stock' | 'finance' | 'purchasing' | 'engineering'
    steps: DriveStep[]
    startUrl: string
    difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
    duration: string
    category: 'Onboarding' | 'Gestión Diaria' | 'Optimización'
}

export const SCENARIOS: Scenario[] = [
    {
        id: 'price-burger',
        title: 'Masterclass: Escandallo Profesional',
        description: 'Aprende a crear un Escandallo, fijar precios basados en datos y dominar el Food Cost de cada plato.',
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
                    title: '1. Crea tu Primer Escandallo',
                    description: 'Todo empieza aquí. Un Escandallo no es solo una receta: es la ficha financiera de tu plato. Sin esto, estás vendiendo a ciegas. Haz click para crear uno nuevo.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#recipe-summary-cards',
                popover: {
                    title: '2. Tu Panel de Control',
                    description: 'Aquí ves de un vistazo cuántas recetas tienes, el margen promedio de toda tu carta, y cuál es el plato más débil. Si el margen promedio baja del 65%, hay trabajo por hacer.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#recipes-table',
                popover: {
                    title: '3. La Tabla de Rentabilidad',
                    description: 'Cada fila muestra PVP, Coste Real, % de Materia Prima y Margen. Los colores son tu semáforo: verde = sano, rojo = revisión urgente. Haz click en el ojo para ver el desglose completo.',
                    side: "top",
                    align: 'start'
                }
            }
        ]
    },
    {
        id: 'recipe-editor',
        title: 'Dominando el Editor de Recetas',
        description: 'Aprende a usar el editor de escandallos: ingredientes, mermas, precios sugeridos y análisis de sensibilidad.',
        icon: 'ChefHat',
        module: 'menu',
        startUrl: '/recipes/new/edit',
        difficulty: 'Básico',
        duration: '4 min',
        category: 'Onboarding',
        steps: [
            {
                element: '#recipe-name-input',
                popover: {
                    title: '1. Nombra tu Receta',
                    description: 'Usa nombres claros y específicos. "Hamburguesa Nostra" es mejor que "Hamb. 1". Este nombre aparecerá en los reportes de ingeniería de menú.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#production-yield',
                popover: {
                    title: '2. Rendimiento y Escalado',
                    description: 'Define cuántas raciones da la receta base. Si preparas para producción, usa el escalador para multiplicar cantidades sin cambiar proporciones.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#ingredients-section',
                popover: {
                    title: '3. Construye tu Escandallo',
                    description: 'A la izquierda busca ingredientes, a la derecha construye la receta. Indica cantidades y mermas (si limpias un solomillo y pierdes el 20%, indícalo). El coste se actualiza solo cuando cambian los precios de tus proveedores.',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#kpi-food-cost',
                popover: {
                    title: '4. El Semáforo: Food Cost %',
                    description: 'Este es tu indicador clave. Para un plato principal, no debería superar el 30-33%. Si está en rojo, tienes tres palancas: subir precio, reducir cantidad o renegociar con proveedores.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#price-input',
                popover: {
                    title: '5. Fija el Precio de Venta (PVP)',
                    description: 'Introduce el precio con IVA. El sistema descuenta el impuesto automáticamente para mostrarte tu ingreso neto real. Al lado tienes el precio sugerido según tu margen objetivo.',
                    side: "left",
                    align: 'center'
                }
            },
            {
                element: '#kpi-gross-margin',
                popover: {
                    title: '6. Tu Margen Real',
                    description: 'Este indicador muestra el dinero que te queda para cubrir alquiler, personal y suministros. Verde = sano, ámbar = vigilar, rojo = peligro. Compáralo con tu objetivo.',
                    side: "top",
                    align: 'center'
                }
            }
        ]
    },
    {
        id: 'log-purchase',
        title: 'Control de Stock y Compras',
        description: 'Domina el ciclo de aprovisionamiento: del inventario a la factura, y de la factura al almacén.',
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
                    title: '1. Visión General del Almacén',
                    description: 'Cuatro métricas clave: Total de ingredientes registrados, los que están bajo mínimo (hay que pedir), los agotados (urgente) y el valor total inmovilizado en estanterías. Dinero parado = dinero que no está en tu banco.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#manual-entry-btn',
                popover: {
                    title: '2. Entrada Rápida de Stock',
                    description: '¿Compra de urgencia en el súper? ¿Recepción de mercancía? No esperes a la factura. Regístralo aquí para que el inventario cuadre hoy mismo. Cuando llegue la factura, se reconcilia automáticamente.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#inventory-table',
                popover: {
                    title: '3. Tu Inventario en Tiempo Real',
                    description: 'Cada fila es un ingrediente con su stock actual, unidad, precio unitario y estado. Los que están bajo mínimo se marcan automáticamente. Úsalo para generar tu lista de compras semanal.',
                    side: "top",
                    align: 'start'
                }
            }
        ]
    },
    {
        id: 'analyze-sales',
        title: 'Análisis Financiero de Ventas',
        description: 'Cómo leer la salud financiera de tu restaurante en 5 minutos cada mañana.',
        icon: 'BarChart3',
        module: 'finance',
        startUrl: '/finance',
        difficulty: 'Intermedio',
        duration: '4 min',
        category: 'Gestión Diaria',
        steps: [
            {
                element: '#date-range-picker',
                popover: {
                    title: '1. Elige el Periodo',
                    description: 'No mires solo "ayer". Analiza meses completos y compara con el anterior. Las flechas te permiten navegar entre periodos y el selector cambia entre vista mensual y trimestral.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#kpi-sales',
                popover: {
                    title: '2. Tus Indicadores de Venta',
                    description: 'Cuatro KPIs esenciales: Facturación Bruta (con IVA), Total Neto (tu ingreso real), Media Diaria (tu pulso) y Media Semanal (tu flujo). Si la media diaria baja, actúa antes de acabar el mes.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#revenue-chart',
                popover: {
                    title: '3. Evolución de Ingresos',
                    description: 'Este gráfico muestra la tendencia día a día (o mes a mes en vista trimestral). La línea negra es tu facturación neta, la gris es la bruta. Busca patrones: ¿bajas los lunes? ¿picos los viernes?',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#target-card',
                popover: {
                    title: '4. Tu Objetivo de Ingresos',
                    description: 'Configura tu meta mensual y el sistema te muestra el % de avance y cuánto falta. Si llegas al día 20 y estás por debajo del 60%, es señal de que necesitas acciones correctivas.',
                    side: "left",
                    align: 'center'
                }
            },
            {
                element: '#payment-distribution',
                popover: {
                    title: '5. Distribución de Pagos',
                    description: 'Efectivo vs Tarjeta. Un ratio saludable suele ser 60-70% tarjeta. Si tienes demasiado efectivo, puede indicar problemas de trazabilidad. Controla este dato para cuadrar caja cada noche.',
                    side: "left",
                    align: 'start'
                }
            }
        ]
    },
    {
        id: 'menu-engineering',
        title: 'Ingeniería de Menú: Mapa Estratégico',
        description: 'Aprende a leer el Mapa BCG, clasificar tus platos y usar el simulador para optimizar tu carta.',
        icon: 'Compass',
        module: 'engineering',
        startUrl: '/menu-engineering',
        difficulty: 'Avanzado',
        duration: '5 min',
        category: 'Optimización',
        steps: [
            {
                element: '#engineering-kpis',
                popover: {
                    title: '1. Los Umbrales de Clasificación',
                    description: 'La Popularidad Media y el Margen Medio dividen el mapa en cuatro cuadrantes. Todo plato se clasifica según esté por encima o por debajo de estas líneas. Son los ejes de tu estrategia.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#engineering-matrix-chart',
                popover: {
                    title: '2. El Mapa Estratégico (BCG)',
                    description: 'Cada punto es un plato. Eje X = Rentabilidad, Eje Y = Popularidad. El objetivo: mover todo hacia arriba-derecha (Estrellas). Estrellas = populares y rentables. Vacas = populares pero poco rentables. Enigmas = rentables pero poco vendidos. Perros = ni rentables ni populares.',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#simulation-toggle',
                popover: {
                    title: '3. El Simulador de Mejoras',
                    description: 'Activa el modo simulación para experimentar con precios y costes sin afectar datos reales. Haz click en cualquier punto del gráfico para ajustar su precio o coste, y observa cómo se mueve en tiempo real.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#menu-advisor',
                popover: {
                    title: '4. Tu Consultor de Menú',
                    description: 'El panel derecho analiza tu carta y genera recomendaciones específicas para cada clasificación: qué precio mover, qué coste renegociar, qué plato promocionar o retirar. Cada consejo incluye el impacto estimado.',
                    side: "left",
                    align: 'start'
                }
            }
        ]
    }
]
