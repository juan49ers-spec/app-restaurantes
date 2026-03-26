'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { z } from "zod"
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getWasteSummary } from "./waste-actions"

export const PrepTaskSchema = z.object({
  id: z.string(),
  title: z.string().describe("Qué preparar, Ej: Cortar Cebolla Juliana"),
  quantity: z.number().describe("Cantidad requerida"),
  unit: z.string().describe("Unidad (kg, l, u, raciones)"),
  priority: z.enum(['high', 'medium', 'low']).describe("Prioridad de la tarea"),
  station: z.string().describe("Estación/Partida (Ej: Fuego, Frío, Plancha, Prep)"),
  reasoning: z.string().describe("Por qué el modelo sugiere esta tarea (Ej: 'Viernes noche, rotación alta')")
})

export type PrepTask = z.infer<typeof PrepTaskSchema>

export async function generatePrepList(notes?: string): Promise<PrepTask[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // 1. Contexto para la IA
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' })
  const contextNotes = notes || "Día normal de servicio."

  // 2. Información del Restaurante (mockeando el historial exhaustivo por rapidez, aunque traemos las mermas como indicador)
  // Lo ideal: traer (A) Recetas más vendidas ayer (B) Bajo stock
  
  // Como prueba concepto tramo las mermas de ayer para no sobre-producir lo que sobra
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const wasteYesterday = await getWasteSummary(yesterday, yesterday)
  
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, category')
    .eq('restaurant_id', restaurantId)
    .limit(10)

  const menuContext = menuItems?.map(m => m.name).join(', ') || 'Menú genérico'
  
  const systemPrompt = `
Eres un Jefe de Cocina (Executive Chef) experto planificando la "Prep List" (Lista de Producción) diaria de un restaurante español.
Tu objetivo es entregar la lista estructurada de las elaboraciones y cortes que el equipo debe hacer por la mañana para superar el servicio con éxito.

## Contexto Actual
- Día de la semana hoy: ${today}
- Platos principales en carta: ${menuContext}
- Mermas recientes (evita pedir sobreproducción de esto si hubo sobrantes): ${JSON.stringify(wasteYesterday)}
- Notas del Gerente: "${contextNotes}"

Genera una lista de 5 a 10 tareas de preparación esenciales. Sé pragmático, usa lenguaje de cocina (ej. "Mise en place", "Brunoise", "Fumet").
Cada tarea debe tener una prioridad lógica ('high' para lo que tarda más o se gasta más rápido).
`

  // 3. Generar Objecto con AI SDK
  
  if (!process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV === 'development') {
    // Mock local si no hay API key
    return [
       { id: '1', title: 'Cortar Cebolla Brunoise', quantity: 5, unit: 'kg', priority: 'high', station: 'Prep', reasoning: 'Base para sofritos, alto consumo estimado para el fin de semana.' },
       { id: '2', title: 'Fumet de Pescado', quantity: 10, unit: 'l', priority: 'high', station: 'Fuego', reasoning: 'Tarda 2 horas en hacer, necesario para los arroces.' },
       { id: '3', title: 'Lavar y Desinfectar Lechuga', quantity: 3, unit: 'kg', priority: 'medium', station: 'Frío', reasoning: 'Mise en place básico para ensaladas.' }
    ]
  }

  try {
    const modelId = process.env.PREP_LIST_MODEL || 'claude-3-haiku-20240307'
    const { object } = await generateObject({
      model: anthropic(modelId),
      schema: z.object({
        tasks: z.array(PrepTaskSchema)
      }),
      system: systemPrompt,
      prompt: "Genera la Prep List interactiva para hoy.",
    })

    return object.tasks
  } catch (error) {
    console.error("Error generating prep list:", error)
    throw new Error("No se pudo generar la lista con IA.")
  }
}
