'use client'

import { useState } from 'react'
import { PrepTask, generatePrepList } from '@/app/actions/prep-list'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export function SmartPrepList() {
  const [tasks, setTasks] = useState<PrepTask[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const generated = await generatePrepList()
      setTasks(generated)
      setCompletedIds(new Set())
      toast.success("Prep List Generada", {
        description: "Lista de producción basada en IA lista para usar."
      })
    } catch (error) {
       console.error(error)
       toast.error("Error", {
        description: "No se pudo generar la prep list."
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (id: string) => {
    const newCompleted = new Set(completedIds)
    if (newCompleted.has(id)) {
      newCompleted.delete(id)
    } else {
      newCompleted.add(id)
    }
    setCompletedIds(newCompleted)
  }

  const progress = tasks.length === 0 ? 0 : Math.round((completedIds.size / tasks.length) * 100)

  return (
    <Card className="flex flex-col h-full bg-white shadow-sm border-neutral-200">
      <CardHeader className="pb-3 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Smart Prep List
            </CardTitle>
            <CardDescription className="mt-1">
              Producción sugerida por IA basada en ventas recientes y mermas.
            </CardDescription>
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            variant={tasks.length > 0 ? "outline" : "default"}
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : tasks.length > 0 ? (
               "Regenerar Lista"
            ) : (
              <>Generar Ahora <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
        
        {tasks.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>Progreso de cocina</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto p-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-neutral-500">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
            <p className="text-sm">No hay lista generada para hoy.</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">Haz clic en Generar Ahora para organizar el servicio.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {tasks.map(task => {
              const isDone = completedIds.has(task.id)
              return (
                <div 
                  key={task.id} 
                  className={`p-4 hover:bg-neutral-50 transition-colors flex gap-3 cursor-pointer ${isDone ? 'opacity-60 bg-neutral-50' : ''}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="pt-0.5 mt-0.5 shrink-0">
                    <button 
                      aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        isDone ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-neutral-300 text-transparent hover:border-indigo-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                       <p className={`font-medium text-sm transition-all ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                         {task.title}
                       </p>
                       <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                         {task.quantity} {task.unit}
                       </Badge>
                    </div>
                    <p className={`text-xs mt-1 ${isDone ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {task.reasoning}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-neutral-200 ${
                        task.priority === 'high' ? 'text-rose-600 bg-rose-50' : 
                        task.priority === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-neutral-500 bg-neutral-100'
                      }`}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-neutral-500 border-neutral-200 bg-white">
                        {task.station.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
