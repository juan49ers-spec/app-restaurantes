"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabaseClient"
import { calculateMenuEngineeringAnalysis } from "@/lib/menu-engineering"
import { toast } from "sonner"

interface MenuEngineeringContextType {
    hoveredCategory: string | null
    setHoveredCategory: (category: string | null) => void
    selectedCategory: string | null
    setSelectedCategory: (category: string | null) => void
    hoveredItem: string | null
    setHoveredItem: (itemId: string | null) => void
    selectedMetric: 'revenue' | 'profit' | 'quantity'
    setSelectedMetric: (metric: 'revenue' | 'profit' | 'quantity') => void

    // Simulation Mode V7
    isSimulationMode: boolean
    setIsSimulationMode: (mode: boolean) => void
    simulatedItems: SimulatedMenuItem[]
    originalItems: SimulatedMenuItem[]
    updateSimulatedItem: (itemId: string, field: 'price' | 'cost', value: number) => void
    resetSimulation: () => void
    simulatedAvgPopularity: number
    simulatedAvgMargin: number
    // New Actions
    bulkUpdateSimulatedItems: (updates: { id: string, field: 'price' | 'cost', value: number }[]) => void
    applyMarketScenario: (costChangePct: number) => void
    // Persistence V2
    scenarios: MenuScenario[]
    currentScenarioId: string | null
    saveScenario: (name: string) => Promise<void>
    loadScenario: (id: string) => void
    deleteScenario: (id: string) => Promise<void>
    isSaving: boolean

    // Bridging V1
    revenueDelta: number
    cogsDelta: number
    reportName?: string
}

interface ScenarioAdjustment {
    id: string
    field: 'price' | 'cost'
    value: number
}

export interface MenuScenario {
    id: string
    name: string
    report_id: string
    adjustments: ScenarioAdjustment[]
    created_at: string
}

export interface SimulatedMenuItem {
    id: string
    recipe_id: string
    name: string
    quantity_sold: number
    price_per_unit: number
    cost_per_unit: number
    // Simulation specific (can be derived or overridden)
    price: number
    cost: number
    category: string
    contribution_margin?: number
    total_sales?: number
    total_cost?: number
    total_profit?: number
    popularity_pct?: number
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
    recipe?: {
        name: string
        category?: string
    }
}

const MenuEngineeringContext = createContext<MenuEngineeringContextType | undefined>(undefined)

export function MenuEngineeringProvider({
    children,
    initialItems = [],
    initialAvgPopularity = 0,
    initialAvgMargin = 0,
    reportId = "",
    reportName = ""
}: {
    children: ReactNode,
    initialItems?: SimulatedMenuItem[],
    initialAvgPopularity?: number,
    initialAvgMargin?: number,
    reportId?: string,
    reportName?: string
}) {
    const supabase = createClient()
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit' | 'quantity'>('quantity')

    // Simulation State
    const [isSimulationMode, setIsSimulationMode] = useState(false)

    // Use initializers to avoid expensive JSON.parse on every render
    const [originalItems, setOriginalItems] = useState<SimulatedMenuItem[]>(() =>
        initialItems.length > 0 ? JSON.parse(JSON.stringify(initialItems)) : []
    )
    const [simulatedItems, setSimulatedItems] = useState<SimulatedMenuItem[]>(() =>
        initialItems.length > 0 ? JSON.parse(JSON.stringify(initialItems)) : []
    )

    // Derived Simulation Metrics
    const [simulatedAvgPopularity, setSimulatedAvgPopularity] = useState(initialAvgPopularity)
    const [simulatedAvgMargin, setSimulatedAvgMargin] = useState(initialAvgMargin)

    // SYNC STATE: When initialItems changes (e.g. after calculation), sync state
    useEffect(() => {
        if (initialItems.length > 0) {
            const itemsCopy = JSON.parse(JSON.stringify(initialItems))
            setSimulatedItems(itemsCopy)
            // originalItems is a state, we should probably update it too if we want a new "base"
            // However, useState for originalItems doesn't have a setter in the code above (it was using [originalItems])
            // I should change it to [originalItems, setOriginalItems]
        }
    }, [initialItems])

    useEffect(() => {
        setSimulatedAvgPopularity(initialAvgPopularity)
    }, [initialAvgPopularity])

    useEffect(() => {
        setSimulatedAvgMargin(initialAvgMargin)
    }, [initialAvgMargin])

    // Persistence State
    const [scenarios, setScenarios] = useState<MenuScenario[]>([])
    const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Bridging State
    const [revenueDelta, setRevenueDelta] = useState(0)
    const [cogsDelta, setCogsDelta] = useState(0)

    useEffect(() => {
        if (initialItems.length > 0) {
            const itemsCopy = JSON.parse(JSON.stringify(initialItems))
            setOriginalItems(itemsCopy)
        }
    }, [initialItems])

    // Load Scenarios
    useEffect(() => {
        if (!reportId) return
        async function fetchScenarios() {
            const { data } = await supabase
                .from('menu_scenarios')
                .select('*')
                .eq('report_id', reportId)
                .order('created_at', { ascending: false })
            if (data) setScenarios(data)
        }
        fetchScenarios()
    }, [reportId, supabase])

    // Core Logic: Recalculate Menu Engineering Matrix
    // This duplicates the backend logic but client-side for instant feedback
    const recalculateMatrix = useCallback((currentItems: SimulatedMenuItem[]) => {
        if (currentItems.reduce((acc, item) => acc + Number(item.quantity_sold), 0) === 0) return

        const analysis = calculateMenuEngineeringAnalysis(currentItems.map((item) => ({
            ...item,
            price_per_unit: Number(item.price),
            cost_per_unit: Number(item.cost),
            quantity_sold: Number(item.quantity_sold),
        })))
        const finalItems = analysis.items

        setSimulatedItems(finalItems)
        setSimulatedAvgMargin(analysis.thresholds.avgContributionMargin)
        setSimulatedAvgPopularity(analysis.thresholds.avgPopularityPct)

        // Calculate Bridging Deltas
        const originalRevenue = originalItems.reduce((acc, i) => acc + (Number(i.price) * i.quantity_sold), 0)
        const originalCogs = originalItems.reduce((acc, i) => acc + (Number(i.cost) * i.quantity_sold), 0)
        const simRevenue = finalItems.reduce((acc, i) => acc + (i.total_sales || 0), 0)
        const simCogs = finalItems.reduce((acc, i) => acc + (i.total_cost || 0), 0)

        setRevenueDelta(simRevenue - originalRevenue)
        setCogsDelta(simCogs - originalCogs)
    }, [originalItems])


    const updateSimulatedItem = (itemId: string, field: 'price' | 'cost', value: number) => {
        const newItems = simulatedItems.map(item => {
            if (item.id === itemId) {
                return { ...item, [field]: value }
            }
            return item
        })
        recalculateMatrix(newItems)
    }

    const resetSimulation = () => {
        setSimulatedItems(JSON.parse(JSON.stringify(originalItems)))
        setSimulatedAvgMargin(initialAvgMargin)
        setSimulatedAvgPopularity(initialAvgPopularity)
    }

    const bulkUpdateSimulatedItems = (updates: { id: string, field: 'price' | 'cost', value: number }[]) => {
        const itemMap = new Map(simulatedItems.map(i => [i.id, i]))

        updates.forEach(u => {
            const item = itemMap.get(u.id)
            if (item) {
                item[u.field] = u.value
            }
        })

        recalculateMatrix(Array.from(itemMap.values()))
    }

    const applyMarketScenario = (costChangePct: number) => {
        // Apply to ORIGINAL items to avoid compounding errors on multiple slider moves
        // If user already manually tweaked items, this might overwrite manual tweaks if we use originalItems.
        // BETTER UX: Apply to CURRENT simulated items? No, that compounds.
        // HYBRID: Apply to ORIGINAL items but try to preserve "manual overrides" if we tracked them?
        // SIMPLEST ROBUST: Apply to ORIGINAL items. This acts as a "Reset + Apply Scenario".

        const newItems = originalItems.map(item => {
            const baseCost = Number(item.cost)
            const newCost = baseCost * (1 + costChangePct / 100)
            return {
                ...item,
                cost: newCost
            }
        })
        recalculateMatrix(newItems)
    }




    const saveScenario = async (name: string) => {
        if (!reportId) return
        setIsSaving(true)
        try {
            const { data: report } = await supabase.from('menu_reports').select('restaurant_id').eq('id', reportId).single()
            if (!report) return

            const adjustments = simulatedItems.map(item => {
                const original = originalItems.find(oi => oi.id === item.id)
                const updates: { id: string, field: 'price' | 'cost', value: number }[] = []
                if (original) {
                    if (Math.abs(Number(item.price) - Number(original.price)) > 0.01) {
                        updates.push({ id: item.id, field: 'price', value: Number(item.price) })
                    }
                    if (Math.abs(Number(item.cost) - Number(original.cost)) > 0.01) {
                        updates.push({ id: item.id, field: 'cost', value: Number(item.cost) })
                    }
                }
                return updates
            }).flat()

            const { data, error: upsertError } = await supabase
                .from('menu_scenarios')
                .upsert({
                    report_id: reportId,
                    restaurant_id: report.restaurant_id,
                    name,
                    adjustments
                })
                .select()
                .single()

            if (upsertError) throw upsertError
            const savedScenario = data as MenuScenario
            setScenarios(prev => [savedScenario, ...prev.filter(s => s.id !== savedScenario.id)])
            setCurrentScenarioId(savedScenario.id)
            toast.success("Estrategia de menú guardada")
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        } finally {
            setIsSaving(false)
        }
    }

    const loadScenario = (id: string) => {
        const scenario = scenarios.find(s => s.id === id)
        if (!scenario) return

        const newItems = JSON.parse(JSON.stringify(originalItems)) as SimulatedMenuItem[]
        const itemMap = new Map(newItems.map((i: SimulatedMenuItem) => [i.id, i]))

        scenario.adjustments.forEach(adj => {
            const item = itemMap.get(adj.id)
            if (item) {
                const field = adj.field as keyof SimulatedMenuItem
                if (field === 'price' || field === 'cost') {
                    item[field] = adj.value
                }
            }
        })

        setCurrentScenarioId(id)
        recalculateMatrix(newItems)
    }

    const deleteScenario = async (id: string) => {
        try {
            const { error: deleteError } = await supabase.from('menu_scenarios').delete().eq('id', id)
            if (deleteError) throw deleteError
            setScenarios(prev => prev.filter(s => s.id !== id))
            if (currentScenarioId === id) setCurrentScenarioId(null)
            toast.success("Escenario eliminado")
        } catch (error) {
            console.error("Delete error:", error)
            toast.error("Error al eliminar")
        }
    }

    return (
        <MenuEngineeringContext.Provider value={{
            hoveredCategory,
            setHoveredCategory,
            selectedCategory,
            setSelectedCategory,
            hoveredItem,
            setHoveredItem,
            selectedMetric,
            setSelectedMetric,
            isSimulationMode,
            setIsSimulationMode,
            simulatedItems,
            originalItems,
            updateSimulatedItem,
            resetSimulation,
            simulatedAvgPopularity,
            simulatedAvgMargin,
            bulkUpdateSimulatedItems,
            applyMarketScenario,
            scenarios,
            currentScenarioId,
            saveScenario,
            loadScenario,
            deleteScenario,
            isSaving,
            revenueDelta,
            cogsDelta,
            reportName
        }}>
            {children}
        </MenuEngineeringContext.Provider>
    )
}

export function useMenuEngineering() {
    const context = useContext(MenuEngineeringContext)
    if (context === undefined) {
        throw new Error("useMenuEngineering must be used within a MenuEngineeringProvider")
    }
    return context
}
