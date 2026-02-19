'use client'

import { useState, useEffect } from "react"
import { deleteIngredient, checkIngredientUsage } from "@/app/actions/ingredients"
import { toast } from "sonner"
import { Loader2, Trash2, AlertTriangle, FileWarning } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useRouter } from "next/navigation"

interface Props {
    ingredientId: string
    ingredientName: string
    disabled?: boolean
    onDelete?: () => void
}

export function DeleteIngredientAlert({ ingredientId, ingredientName, disabled, onDelete }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isChecking, setIsChecking] = useState(false)
    const [associatedRecipes, setAssociatedRecipes] = useState<string[]>([])

    // Check usage when dialog opens
    useEffect(() => {
        let mounted = true

        const checkUsage = async () => {
            setIsChecking(true)
            try {
                const recipes = await checkIngredientUsage(ingredientId)
                if (mounted) {
                    setAssociatedRecipes(recipes)
                }
            } catch {
                console.error("Error checking usage")
            } finally {
                if (mounted) {
                    setIsChecking(false)
                }
            }
        }

        if (open) {
            checkUsage()
        } else {
            // Reset state when closed
            setAssociatedRecipes([])
            setIsChecking(false)
        }

        return () => {
            mounted = false
        }
    }, [open, ingredientId])

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteIngredient(ingredientId)

            if (result.success) {
                toast.success("Ingrediente eliminado")
                setOpen(false)
                // Call onDelete callback to update parent component state
                onDelete?.()
                router.refresh()
            } else {
                toast.error(result.error || "No se pudo eliminar")
            }
        } catch {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
        }
    }

    const hasConflicts = associatedRecipes.length > 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    disabled={disabled}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        {hasConflicts ? <FileWarning className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        {hasConflicts ? "Conflicto de Dependencias" : "Eliminar Ingrediente"}
                    </DialogTitle>
                    <DialogDescription>
                        Vas a eliminar permanentemente <strong>{ingredientName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {isChecking ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verificando dependencias...</span>
                    </div>
                ) : hasConflicts ? (
                    <div className="space-y-4">
                        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>¡Atención!</AlertTitle>
                            <AlertDescription>
                                Este ingrediente se utiliza en <strong>{associatedRecipes.length} receta(s)</strong>.
                                Eliminarlo afectará al cálculo de costes de:
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-md border bg-muted/30 p-2">
                            <ScrollArea className="h-32 w-full pr-4">
                                <ul className="text-sm space-y-1">
                                    {associatedRecipes.map((recipe, i) => (
                                        <li key={i} className="text-muted-foreground flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-destructive/50" />
                                            {recipe}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Se recomienda editar las recetas antes de eliminar este ingrediente.
                        </p>
                    </div>
                ) : (
                    <Alert variant="destructive" className="my-2 border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Irreversible</AlertTitle>
                        <AlertDescription>
                            Esta acción no se puede deshacer. Se desvinculará de los proveedores automáticamente.
                        </AlertDescription>
                    </Alert>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" type="button" disabled={isDeleting}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || isChecking || hasConflicts}
                        className={hasConflicts ? "opacity-50 cursor-not-allowed" : ""}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasConflicts ? "Eliminación Bloqueada" : "Sí, eliminar ingrediente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
