'use client'

import { MasterIngredient, Recipe } from "@/types/schema"
import { useRecipeCalculator, RecipeEditData } from "@/hooks/useRecipeCalculator"
import { IngredientSelector } from "@/components/recipes/IngredientSelector"
import { RecipeBuilder } from "@/components/recipes/RecipeBuilder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft,
    Save,
    Printer,
    AlertTriangle,
    CheckCircle,
    Clock,
    Euro,
    Target,
    TrendingUp,
    ChefHat,
    Gauge
} from "lucide-react"
import { ProductionScaler } from "@/components/recipes/ProductionScaler"
import { PriceSensitivity } from "@/components/recipes/PriceSensitivity"
import { RecipeHistory } from "@/components/recipes/RecipeHistory"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { KitchenTicket } from "@/components/recipes/KitchenTicket"
import { RecipePrintView } from "@/components/recipes/RecipePrintView"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { saveRecipe } from "@/app/actions/saveRecipe"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Props {
    initialIngredients: MasterIngredient[]
    initialRecipes: Recipe[]
    recipeId: string
    initialData?: RecipeEditData
}

function KpiCard({ label, icon: Icon, children, className = '' }: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-muted/30 border border-border/50 min-w-[80px] ${className}`}>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            {children}
        </div>
    )
}

function MarginIndicator({ margin, target }: { margin: number, target: number }) {
    const isCritical = margin < 20
    const isBelowTarget = margin < target
    const isGood = margin >= target

    const color = isCritical ? 'text-destructive' : isBelowTarget ? 'text-amber-500' : 'text-emerald-500'
    const bgColor = isCritical ? 'bg-destructive/10 border-destructive/30' : isBelowTarget ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
    const StatusIcon = isCritical ? AlertTriangle : isGood ? CheckCircle : Gauge

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bgColor}`}>
            <StatusIcon className={`w-4 h-4 ${color} ${isCritical ? 'animate-pulse' : ''}`} />
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Margen</span>
                <span className={`text-lg font-black italic tracking-tighter tabular-nums ${color}`}>
                    {margin.toFixed(0)}%
                </span>
            </div>
        </div>
    )
}

export function RecipeEditorClient({ initialIngredients, initialRecipes, recipeId, initialData }: Props) {
    const router = useRouter()
    const [name, setName] = useState(initialData?.name || "Nueva Receta")
    const [isSaving, setIsSaving] = useState(false)
    const [showPrint, setShowPrint] = useState(false)
    const [idempotencyKey] = useState(() => crypto.randomUUID())

    const {
        ingredients,
        scaledIngredients,
        addIngredient,
        removeIngredient,
        updateIngredient,
        metrics,
        sellingPrice,
        setSellingPrice,
        targetMargin,
        setTargetMargin,
        prepTime,
        setPrepTime,
        hourlyRate,
        setHourlyRate,
        yields,
        setYields,
        productionTarget,
        setProductionTarget,
        scalingFactor
    } = useRecipeCalculator(initialData)

    const handleSave = async () => {
        if (!name.trim()) return toast.error("La receta necesita un nombre")
        if (ingredients.length === 0) return toast.error("Añade al menos un ingrediente")

        setIsSaving(true)
        try {
            const result = await saveRecipe({
                id: recipeId,
                name,
                selling_price: sellingPrice,
                target_margin_pct: targetMargin,
                hourly_rate: hourlyRate,
                prep_time_minutes: prepTime,
                yields,
                ingredients,
                idempotency_key: idempotencyKey
            })

            if (result.success) {
                toast.success("Receta guardada correctamente")
                if (recipeId === 'new' && result.recipeId) {
                    router.push(`/recipes/${result.recipeId}/edit`)
                }
            }
        } catch (e) {
            toast.error("Error al guardar: " + (e instanceof Error ? e.message : "Desconocido"))
        } finally {
            setIsSaving(false)
        }
    }

    const isScaling = scalingFactor !== 1
    const foodCostPct = sellingPrice > 0 ? (metrics.totalCost / sellingPrice) * 100 : 0
    const foodCostColor = foodCostPct > 35 ? 'text-destructive' : foodCostPct > 30 ? 'text-amber-500' : sellingPrice > 0 ? 'text-emerald-500' : 'text-muted-foreground'

    return (
        <div className="flex flex-col h-full bg-background">

            {/* ─── HEADER ─── */}
            <header className="border-b bg-card px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                {/* Back + Name */}
                <Link href="/escandallos">
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1 min-w-0 mr-2">
                    <Input
                        className="text-lg font-black italic tracking-tighter border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent truncate"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre de la receta..."
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <ChefHat className="w-3 h-3" />
                        <span>{ingredients.length} ingredientes</span>
                        {isScaling && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0">
                                ×{scalingFactor.toFixed(1)} Escalado
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Yield + Scaler */}
                <div className="flex items-center gap-2 border-l border-border/50 pl-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap">Rend.</span>
                        <Input
                            type="number"
                            className="h-7 w-12 text-center text-sm font-bold tabular-nums"
                            value={yields || ''}
                            onChange={(e) => setYields(parseFloat(e.target.value) || 1)}
                        />
                    </div>
                    <ProductionScaler
                        baseYield={yields}
                        targetYield={productionTarget}
                        onChange={setProductionTarget}
                    />
                </div>

                {/* KPI Strip */}
                <div className="flex items-center gap-2 border-l border-border/50 pl-3">
                    <KpiCard label={isScaling ? "Prod." : "Coste"} icon={Euro}>
                        <span className={`text-base font-black italic tabular-nums tracking-tighter ${isScaling ? 'text-primary' : 'text-foreground'}`}>
                            €{(metrics.primeCost * scalingFactor).toFixed(2)}
                        </span>
                    </KpiCard>

                    <KpiCard label="MP %" icon={TrendingUp}>
                        <span className={`text-base font-black italic tabular-nums tracking-tighter ${foodCostColor}`}>
                            {sellingPrice > 0 ? foodCostPct.toFixed(0) : '--'}%
                        </span>
                    </KpiCard>

                    <div className="flex flex-col items-center gap-0.5">
                        <KpiCard label="PVP" icon={Euro} className="pb-1">
                            <Input
                                type="number"
                                className="h-6 w-16 text-center text-sm font-black tabular-nums bg-transparent"
                                value={sellingPrice || ''}
                                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </KpiCard>
                    </div>

                    <KpiCard label="Sugerido" icon={Target}>
                        <span className="text-base font-black italic tabular-nums tracking-tighter text-primary">
                            €{metrics.suggestedPrice.toFixed(2)}
                        </span>
                    </KpiCard>

                    <MarginIndicator margin={metrics.calculatedMargin} target={targetMargin} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 border-l border-border/50 pl-3 shrink-0">
                    <Button variant="ghost" size="icon" title="Imprimir Ficha" onClick={() => setShowPrint(true)} className="text-muted-foreground hover:text-foreground">
                        <Printer className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.back()} className="text-xs">
                        Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs font-bold gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            </header>

            {/* ─── SECONDARY BAR: Prep Time, Hourly Rate, Target Margin ─── */}
            <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-muted-foreground">Prep:</span>
                    <Input
                        type="number"
                        className="h-6 w-12 text-center text-xs font-bold tabular-nums"
                        value={prepTime || ''}
                        onChange={(e) => setPrepTime(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                    <span className="text-muted-foreground">min</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                    <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-muted-foreground">Coste/h:</span>
                    <Input
                        type="number"
                        className="h-6 w-12 text-center text-xs font-bold tabular-nums"
                        value={hourlyRate || ''}
                        onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                    <span className="text-muted-foreground">€/h</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-muted-foreground">Obj. Margen:</span>
                    <Input
                        type="number"
                        className="h-6 w-12 text-center text-xs font-bold tabular-nums"
                        value={targetMargin || ''}
                        onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                        placeholder="70"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
                {metrics.laborCost > 0 && (
                    <>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span>Mano de obra:</span>
                            <span className="font-bold text-foreground tabular-nums">€{(metrics.laborCost * scalingFactor).toFixed(2)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* ─── MAIN WORKSPACE ─── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Ingredient Pantry */}
                <div className="w-[340px] border-r bg-card flex flex-col">
                    <IngredientSelector
                        ingredients={initialIngredients}
                        recipes={initialRecipes}
                        onAdd={addIngredient}
                    />
                </div>

                {/* Right Panel: Recipe Builder + Analysis */}
                <div className="flex-1 bg-muted/5 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 relative">
                        <RecipeBuilder
                            ingredients={scaledIngredients}
                            onUpdate={updateIngredient}
                            onRemove={removeIngredient}
                            readOnly={isScaling}
                        />
                    </div>

                    {/* Analysis Section (only in base mode) */}
                    {!isScaling && (
                        <div className="h-[280px] shrink-0 overflow-y-auto border-t bg-card z-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
                            <div className="p-6 space-y-8">
                                <PriceSensitivity
                                    baseCost={metrics.primeCost}
                                    sellingPrice={sellingPrice}
                                    targetMargin={targetMargin}
                                    onApplyPrice={(newPrice) => setSellingPrice(newPrice)}
                                />
                                <div className="border-t pt-8">
                                    <RecipeHistory
                                        key={recipeId}
                                        recipeId={recipeId}
                                        currentCost={metrics.primeCost}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── PRINT MODAL ─── */}
            <Dialog open={showPrint} onOpenChange={setShowPrint}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <Tabs defaultValue="ticket" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="ticket">Ticket de Cocina</TabsTrigger>
                            <TabsTrigger value="ficha">Ficha Técnica</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ticket" className="mt-4">
                            <div className="flex justify-center">
                                <KitchenTicket
                                    recipeName={name}
                                    ingredients={scaledIngredients}
                                    yields={productionTarget}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="ficha" className="mt-4">
                            <RecipePrintView
                                recipe={{
                                    id: recipeId === 'new' ? undefined : recipeId,
                                    restaurant_id: '',
                                    name,
                                    selling_price: sellingPrice,
                                    target_margin_pct: targetMargin,
                                    prep_time_minutes: prepTime,
                                    yields,
                                    current_cost: metrics.totalCost,
                                    hourly_rate: hourlyRate,
                                    ingredients: scaledIngredients.map(ing => ({
                                        id: ing.id,
                                        ingredient_name: ing.name || 'Unknown',
                                        quantity_gross: ing.quantity_gross,
                                        quantity_net: ing.quantity_net,
                                        unit: ing.base_unit || 'u',
                                        cost_per_unit: ing.price_per_unit || 0,
                                        total_cost: ing.quantity_gross * (ing.price_per_unit || 0),
                                        waste_pct: 1 - ing.yield_pct
                                    }))
                                }}
                                restaurantName="Restaurante"
                            />
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 mt-4 print:hidden">
                        <Button variant="outline" onClick={() => setShowPrint(false)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
