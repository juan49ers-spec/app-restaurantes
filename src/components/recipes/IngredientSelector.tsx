import { useState, useMemo } from "react"
import { MasterIngredient, Recipe } from "@/types/schema"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, ChefHat, Package, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Props {
    ingredients: MasterIngredient[]
    recipes: Recipe[]
    onAdd: (item: MasterIngredient | Recipe, type: 'INGREDIENT' | 'RECIPE') => void
}

export function IngredientSelector({ ingredients, recipes, onAdd }: Props) {
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState("ingredients")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc">("name")

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(ingredients.map(i => i.category).filter(Boolean))
        return Array.from(cats).sort()
    }, [ingredients])

    const filteredIngredients = useMemo(() => {
        let result = ingredients.filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase())
        )

        if (categoryFilter !== "all") {
            result = result.filter(i => i.category === categoryFilter)
        }

        return result.sort((a, b) => {
            if (sortBy === "price-asc") return a.current_avg_price - b.current_avg_price
            if (sortBy === "price-desc") return b.current_avg_price - a.current_avg_price
            return a.name.localeCompare(b.name)
        })
    }, [ingredients, search, categoryFilter, sortBy])

    const filteredRecipes = useMemo(() => {
        return recipes.filter(r =>
            r.name.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name))
    }, [recipes, search])

    return (
        <Card className="h-full flex flex-col border-r-0 rounded-r-none border-b-0 rounded-b-none border-t-0 rounded-t-none shadow-none">
            <CardHeader className="pb-3 px-4 pt-4 space-y-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                        <TabsTrigger value="recipes">Recetas</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        className="pl-8 bg-slate-50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {activeTab === 'ingredients' && (
                    <div className="flex gap-2">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c} value={c as string}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setSortBy(prev => {
                                if (prev === "name") return "price-desc"
                                if (prev === "price-desc") return "price-asc"
                                return "name"
                            })}
                            title="Ordenar por precio"
                        >
                            <ArrowUpDown className={`h-3 w-3 ${sortBy !== 'name' ? 'text-indigo-600' : ''}`} />
                        </Button>
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/30">
                <ScrollArea className="h-full">
                    {activeTab === 'ingredients' ? (
                        <div className="divide-y border-t">
                            {filteredIngredients.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onAdd(item, 'INGREDIENT')}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                            {item.base_unit.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm text-foreground/90 truncate flex items-center gap-2">
                                                {item.name}
                                                {item.category && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal text-muted-foreground border-slate-200">
                                                        {item.category}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span className="font-mono text-slate-600">€{item.current_avg_price.toFixed(2)}</span>
                                                <span className="text-slate-400">/ {item.base_unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y border-t">
                            {filteredRecipes.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onAdd(item, 'RECIPE')}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <ChefHat className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-foreground/90">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">Sub-Receta • €{(item.current_cost || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {((activeTab === 'ingredients' && filteredIngredients.length === 0) ||
                        (activeTab === 'recipes' && filteredRecipes.length === 0)) && (
                            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                                <div className="h-10 w-10 text-muted-foreground/20 mb-2">
                                    <Package className="h-full w-full" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    No se encontraron resultados para <br />
                                    <span className="font-medium text-foreground">&quot;{search}&quot;</span>
                                </p>
                            </div>
                        )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
