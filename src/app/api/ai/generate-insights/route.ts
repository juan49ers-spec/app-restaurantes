import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { moduleName, periodKey, contextNotes, metricsData, tone } = await req.json();

        // Si no hay API KEY, devolvemos un mock en desarrollo para no bloquear si el usuario no tiene saldo, 
        // pero usaremos el SDK si hay. El Vercel SDK lanza un error por defecto si ANTHROPIC_API_KEY no está.
        if (!process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV === 'development') {
             // Mock streamer
             return new Response(new ReadableStream({
                 start(controller) {
                     const text = `Esta es un **borrador de prueba** generado localmente porque falta ANTHROPIC_API_KEY.\n\n### ${moduleName} - ${periodKey}\n\nCon las siguientes anotaciones: "${contextNotes || ''}"\n\n* Las ventas están estables.\n* Revisa tus costes.`;
                     let i = 0;
                     const interval = setInterval(() => {
                         controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text[i])}\n`));
                         i++;
                         if (i >= text.length) {
                             clearInterval(interval);
                             controller.close();
                         }
                     }, 20);
                 }
             }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
        }

        // Contexto específico por módulo para mejorar la calidad del análisis
        const moduleContext: Record<string, string> = {
            'Facturación': `Analiza la facturación del restaurante: ingresos brutos vs netos, ticket medio diario, progreso hacia objetivo mensual,
desglose por canal (sala, delivery Uber Eats / Just Eat / Glovo, takeaway).
Presta atención a: días con facturación atípica, ratio delivery vs sala, evolución del ticket medio.
Benchmark restauración: ticket medio sala 18-25€, ratio delivery saludable <35% del total.`,

            'Gastos': `Analiza la estructura de costes operativos del restaurante: personal, materia prima (COGS), suministros, mantenimiento, marketing.
Ratios clave a evaluar:
- Ratio Personal/Ventas: benchmark restauración 28-35%. >35% = alerta.
- Ratio Materia Prima (COGS)/Ventas: benchmark 28-33%. >35% = problema grave.
- Ratio Gastos Totales/Ventas: debe ser <70% para ser rentable.
- Variación MoM: identifica categorías con incrementos >10% como alertas.
Prioriza las categorías con mayor peso y peor variación.`,

            'Impuestos': `Analiza la situación fiscal del restaurante en España: IVA (devengado, soportado, liquidación trimestral), IRPF retenciones, Impuesto de Sociedades.
Puntos clave:
- IVA: diferencia devengado-soportado determina liquidación trimestral. Un IVA soportado alto indica inversión/compras.
- IRPF: retenciones sobre nóminas y profesionales. Verificar que las retenciones son correctas.
- IS: tipo general 25%, nueva creación 15%. Evaluar BAI y pagos fraccionados (art. 40 LIS, 18% cuota).
- Calendario fiscal: M.303 y M.111 trimestrales (20 abril, julio, octubre, enero).
Recomienda optimizaciones fiscales legales (amortización acelerada, gastos deducibles pendientes).`,

            'Resultados': `Analiza la cuenta de resultados (P&L) completa del restaurante: ingresos, costes variables, costes fijos, resultado neto, margen.
Evalúa:
- Margen neto: benchmark restauración 8-15%. <5% = negocio en riesgo.
- Break-even: día del mes en que se alcanza. Ideal antes del día 20.
- Variación interanual (YoY): crecimiento sostenible >5%.
- Variación mensual (MoM): alertar si caída >10%.
- Composición gastos: personal + materia prima no deben superar 65% de ingresos (prime cost).
Identifica palancas de mejora: ¿reducir costes o aumentar ingresos?`,
        };

        const moduleSpecificContext = moduleContext[moduleName] ||
            `Analiza los datos financieros del módulo ${moduleName} del restaurante.`;

        const systemPrompt = `
Eres un Analista Financiero (CFO) experto en el sector de la restauración española.
Tu tarea es generar un informe ejecutivo conciso y accionable en Markdown para el módulo: **${moduleName}** del restaurante, periodo: **${periodKey}**.

## Especialización del Módulo
${moduleSpecificContext}

## Contexto del Gerente
"${contextNotes || 'Sin anotaciones adicionales. Interpreta solo los números de forma neutral.'}"

## Datos Financieros del Periodo
${JSON.stringify(metricsData, null, 2)}

## Tono solicitado: ${tone || 'executive'}
${tone === 'detailed' ? '- Genera un análisis profundo con todos los KPIs desglosados, comparativas históricas y correlaciones. Extensión: 6-8 párrafos.'
    : tone === 'actionable' ? '- Céntrate en acciones concretas e inmediatas. Cada punto debe incluir QUÉ hacer, CUÁNDO y el IMPACTO estimado. Extensión: 4-5 párrafos.'
    : '- Sé directo y ejecutivo, usa viñetas para los KPIs más críticos. Máximo 5-6 párrafos.'}

## Reglas del Reporte (ESTRICTAS)
1. Compara SIEMPRE contra los benchmarks del sector restauración mencionados arriba. Indica si cada ratio está en zona verde, amarilla o roja.
2. Incorpora EL CONTEXTO del Gerente para establecer causalidades (ej. "Como indicas, el festivo del día 12 explica el pico de facturación...").
3. Finaliza con '### Acciones Recomendadas' con 2-3 recomendaciones priorizadas por impacto. Sé específico (no "mejorar costes" sino "renegociar contrato con proveedor X dado que COGS subió un 12%").
4. Genera SOLO Markdown puro. Inicia directamente con "# Resumen Ejecutivo — ${moduleName}". Sin preámbulos.
`;

        const result = await streamText({
            model: anthropic('claude-3-haiku-20240307'),
            system: "Eres el mejor Analista CFO de restaurantes, y te comunicas de manera asertiva, breve y en idioma español.",
            prompt: systemPrompt,
            temperature: 0.3, // Bajo para ser analítico,
        });

        // @ts-expect-error - Some versions might use toTextStreamResponse
        return result.toDataStreamResponse ? result.toDataStreamResponse() : result.toTextStreamResponse();
        
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[AiInsights Error]:", error);
        return new Response(JSON.stringify({ error: error.message || 'Error generando insights' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
