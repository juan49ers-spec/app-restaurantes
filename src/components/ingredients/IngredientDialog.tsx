'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreateIngredientSchema, CreateIngredientInput, MasterIngredient } from "@/types/schema"
import { updateIngredient, createIngredient } from "@/app/actions/ingredients"
import { toast } from "sonner"
import { PlusIcon, Loader2 } from "lucide-react"

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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AllergenSelector, AllergenId } from "./AllergenSelector"

interface Props {
    initialData?: MasterIngredient
    trigger?: React.ReactNode
    onSuccess?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function IngredientDialog({ initialData, trigger, onSuccess, open: constrainedOpen, onOpenChange }: Props) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const isEditing = !!initialData

    // Controlled vs Uncontrolled open state
    const isOpen = constrainedOpen !== undefined ? constrainedOpen : internalOpen
    const setIsOpen = onOpenChange || setInternalOpen

    // Let TypeScript infer the type from the schema/defaults to avoid mismatches
    const form = useForm({
        resolver: zodResolver(CreateIngredientSchema),
        defaultValues: {
            name: initialData?.name || "",
            base_unit: initialData?.base_unit || "kg",
            category: initialData?.category || "General",
            standard_waste_pct: initialData?.standard_waste_pct || 0,
            current_avg_price: initialData?.current_avg_price || 0,
            allergens: initialData?.allergens || [],
        },
    })

    // Reset form when dialog opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: initialData?.name || "",
                base_unit: initialData?.base_unit || "kg",
                category: initialData?.category || "General",
                standard_waste_pct: initialData?.standard_waste_pct || 0,
                current_avg_price: initialData?.current_avg_price || 0,
                allergens: initialData?.allergens || [],
            })
        }
    }, [initialData, isOpen, form])

    const watchWaste = form.watch("standard_waste_pct")
    const yieldPercentage = ((1 - (watchWaste || 0)) * 100).toFixed(1)

    // Helper to handle percentage input (user types 20 for 20%, but we store 0.2)
    const handleWasteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        if (isNaN(val)) return
        form.setValue("standard_waste_pct", val / 100)
    }

    async function onSubmit(data: CreateIngredientInput) {
        setIsLoading(true)
        try {
            let result;

            if (isEditing && initialData?.id) {
                result = await updateIngredient(initialData.id, data)
            } else {
                result = await createIngredient(data)
            }

            if (result.success) {
                toast.success(isEditing ? "Ingrediente actualizado" : "Ingrediente creado correctamente")
                setIsOpen(false)
                form.reset()
                router.refresh()
                onSuccess?.()
            } else {
                const errorMessage = 'error' in result ? result.error : undefined
                toast.error(errorMessage ?? "Error al guardar ingrediente")
            }
        } catch {
            toast.error("Error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <PlusIcon className="h-4 w-4" />
                        Nuevo Ingrediente
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Ingrediente" : "Crear Ingrediente"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifica los detalles del ingrediente maestro."
                            : "Añade un nuevo ingrediente maestro a tu inventario base."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Producto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Tomate Pera" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Unit */}
                            <FormField
                                control={form.control}
                                name="base_unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidad Base</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                                                <SelectItem value="l">Litro (l)</SelectItem>
                                                <SelectItem value="u">Unidad (ud)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Category */}
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Verduras" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Price */}
                            <FormField
                                control={form.control}
                                name="current_avg_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio (€)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Waste */}
                            <FormField
                                control={form.control}
                                name="standard_waste_pct"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Merma (%)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={field.value ? (field.value * 100).toFixed(1) : ""}
                                                    onChange={handleWasteChange}
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                                    Yield: {yieldPercentage}%
                                                </span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}

                            />
                        </div>

                        {/* Allergens */}
                        <FormField
                            control={form.control}
                            name="allergens"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Alérgenos</FormLabel>
                                    <FormControl>
                                        <AllergenSelector
                                            // Ensure value is always an array
                                            selectedAllergens={(field.value as AllergenId[]) || []}
                                            onChange={field.onChange}
                                            showSummary={true}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Actualizar Ingrediente" : "Guardar Ingrediente"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    )
}
