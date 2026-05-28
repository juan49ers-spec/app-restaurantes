"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Save, Sparkles, Trash2, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScenarioSummary {
    id: string
    name: string
}

interface EngineeringMatrixHeaderProps {
    isSimulationMode: boolean
    setIsSimulationMode: (value: boolean) => void
    clearEditingItem: () => void
    scenarios: ScenarioSummary[]
    currentScenarioId: string | null
    loadScenario: (id: string) => void
    deleteScenario: (id: string) => void
    isSaving: boolean
    isDialogOpen: boolean
    setIsDialogOpen: (value: boolean) => void
    newScenarioName: string
    setNewScenarioName: (value: string) => void
    handleSave: () => void
}

export function EngineeringMatrixHeader({
    isSimulationMode,
    setIsSimulationMode,
    clearEditingItem,
    scenarios,
    currentScenarioId,
    loadScenario,
    deleteScenario,
    isSaving,
    isDialogOpen,
    setIsDialogOpen,
    newScenarioName,
    setNewScenarioName,
    handleSave,
}: EngineeringMatrixHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-2 z-10 relative">
            <div>
                <h3 className="font-serif text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                    Mapa Estratégico
                    {isSimulationMode && (
                        <Badge className="bg-amber-500 text-[10px] tracking-widest px-3 py-1 border-none shadow-lg shadow-amber-500/30 animate-pulse">
                            SIMULACIÓN ACTIVA
                        </Badge>
                    )}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1 opacity-80 flex items-center gap-2">
                    Rentabilidad (Eje X) vs Popularidad (Eje Y)
                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <Info className="w-3 h-3 cursor-help text-muted-foreground/70" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 glass-premium border-white/20">
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Curso Rápido de Ingeniería
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    El objetivo del juego es mover todos tus platos hacia la esquina <b>Superior Derecha (ESTRELLAS)</b>.
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-wider">
                                    <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded border border-emerald-500/20 text-center">
                                        Arriba = Más Popular
                                    </div>
                                    <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded border border-emerald-500/20 text-center">
                                        Derecha = Más Rentable
                                    </div>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </p>
                <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Estrellas
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Vacas
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                        <span className="w-2 h-2 rounded-full bg-violet-500" /> Enigmas
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Perros
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-9">
                            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                            {currentScenarioId ? scenarios.find(s => s.id === currentScenarioId)?.name : "Estrategias Guardadas"}
                            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-premium border-white/20">
                        <DropdownMenuLabel>Mis Escenarios</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {scenarios.map(s => (
                            <DropdownMenuItem key={s.id} onClick={() => loadScenario(s.id)} className="flex items-center justify-between group">
                                <span className="truncate">{s.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground group-hover:text-rose-400 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteScenario(s.id)
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </DropdownMenuItem>
                        ))}
                        {scenarios.length === 0 && <DropdownMenuItem disabled>No hay escenarios</DropdownMenuItem>}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/10 h-9" disabled={!isSimulationMode || isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-premium border-white/20">
                        <DialogHeader>
                            <DialogTitle>Guardar Estrategia</DialogTitle>
                            <DialogDescription>Asigna un nombre a esta simulación para consultarla más tarde.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                placeholder="Ej: Menú Verano 2026..."
                                value={newScenarioName}
                                onChange={(e) => setNewScenarioName(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">Guardar Estrategia</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button
                    variant={isSimulationMode ? "default" : "outline"}
                    size="sm"
                    className={cn(
                        "h-9 border-white/10 transition-all duration-300",
                        isSimulationMode ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20" : "bg-white/5 hover:bg-white/10"
                    )}
                    onClick={() => {
                        setIsSimulationMode(!isSimulationMode)
                        if (isSimulationMode) clearEditingItem()
                    }}
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isSimulationMode ? "Ver Realidad" : "Simular Mejoras"}
                </Button>
            </div>
        </div>
    )
}
