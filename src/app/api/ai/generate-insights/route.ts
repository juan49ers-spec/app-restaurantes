import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { moduleName, periodKey, contextNotes, metricsData } = await req.json();

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

        const systemPrompt = `
Eres un Analista Financiero (CFO) experto en el sector de la restauración.
Tu tarea es generar un informe ejecutivo conciso y accionable estructurado en Markdown, analizando los resultados del módulo: ${moduleName} del restaurante para el periodo: ${periodKey}.

Contexto e Indicaciones proporcionadas por el Gerente: 
"${contextNotes || 'Sin anotaciones adicionales. Interpreta solo los números de forma neutral.'}"

Datos Duros Financieros del Periodo:
${JSON.stringify(metricsData, null, 2)}

Reglas del reporte (ESTRICTAS):
1. **Sé directo y ejecutivo**, usa viñetas para los KPIs más críticos. Limita el texto a un máximo de 5-6 párrafos en total.
2. Incorpora EL CONTEXTO del Gerente en tu análisis para establecer causalidades (ej. "Como indicas, la lluvia en tal fecha explica la caída de afluencia...").
3. Finaliza siempre con una sección '### Acciones Recomendadas' con 1 o 2 recomendaciones claras de negocio (ej. subir ticket medio, recortar horas, vigilar proveedor).
4. Genera SOLO el contenido en formato Markdown puro (encabezados, listas). NADA de notas iniciales como "Claro, aquí tienes tu informe". Inicia directamente con el "# Resumen Ejecutivo".
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
