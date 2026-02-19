'use client'

import { useState } from "react"
import { deleteRecipe } from "@/app/actions/recipes"
import { toast } from "sonner"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"

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

interface Props {
    recipeId: string
    recipeName: string
}

export function DeleteRecipeAlert({ recipeId, recipeName }: Props) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteRecipe(recipeId)

            if (result.success) {
                toast.success("Receta eliminada")
                setOpen(false)
            } else {
                toast.error(result.error || "No se pudo eliminar")
            }
        } catch {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Eliminar Receta
                    </DialogTitle>
                    <DialogDescription>
                        Vas a eliminar permanentemente <strong>{recipeName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="my-2 border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>¡Atención!</AlertTitle>
                    <AlertDescription>
                        Esta acción no se puede deshacer. Si esta receta se utiliza como sub-receta en otros platos, esos cálculos se romperán.
                    </AlertDescription>
                </Alert>

                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" type="button" disabled={isDeleting}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sí, eliminar receta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
