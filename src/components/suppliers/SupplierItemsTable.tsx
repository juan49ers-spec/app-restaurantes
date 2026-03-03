'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MasterIngredient } from "@/types/schema"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Trash2, Plus, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { createSupplierItem, updateSupplierItem, deleteSupplierItem } from "@/app/actions/supplierItems"

interface SupplierItem {
    id: string
    name_on_invoice: string
    sku_on_invoice?: string
    pack_size?: number
    last_price?: number
    master_ingredient_id?: string
    master_ingredients?: { name: string }
}

export function SupplierItemsTable({
    supplierId,
    initialItems,
    masterIngredients
}: {
    supplierId: string,
    initialItems: SupplierItem[],
    masterIngredients: MasterIngredient[]
}) {
    const router = useRouter()
    const [items] = useState(initialItems)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<SupplierItem | null>(null)

    const handleSubmit = async (formData: FormData) => {
        formData.append('supplier_id', supplierId)
        try {
            if (editingItem) {
                await updateSupplierItem(editingItem.id, formData)
                toast.success("Item actualizado")
            } else {
                await createSupplierItem(formData)
                toast.success("Item creado")
            }
            setIsDialogOpen(false)
            setEditingItem(null)
            router.refresh()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error desconocido"
            toast.error("Error al guardar: " + msg)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Borrar item?")) return
        try {
            await deleteSupplierItem(id, supplierId)
            toast.success("Item eliminado")
            router.refresh()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error desconocido"
            toast.error("Error al borrar: " + msg)
        }
    }

    const openEdit = (item: SupplierItem) => {
        setEditingItem(item)
        setIsDialogOpen(true)
    }

    const openCreate = () => {
        setEditingItem(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Catálogo de Productos</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Item</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Item' : 'Nuevo Item'}</DialogTitle>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-4">
                            <div className="grid w-full gap-2">
                                <Label>Nombre en Factura</Label>
                                <Input name="name_on_invoice" defaultValue={editingItem?.name_on_invoice} required />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>SKU Proveedor</Label>
                                <Input name="sku_on_invoice" defaultValue={editingItem?.sku_on_invoice} placeholder="REF-123" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid w-full gap-2">
                                    <Label>Formato (kg/l/u)</Label>
                                    <Input name="pack_size" type="number" step="0.01" defaultValue={editingItem?.pack_size} />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label>Último Precio (€)</Label>
                                    <Input name="last_price" type="number" step="0.01" defaultValue={editingItem?.last_price} />
                                </div>
                            </div>

                            <div className="grid w-full gap-2">
                                <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /> Mapear a Ingrediente Maestro</Label>
                                <Select name="master_ingredient_id" defaultValue={editingItem?.master_ingredient_id || ""} >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona ingrediente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Unmapped">-- Sin Mapear --</SelectItem>
                                        {masterIngredients.map(mi => (
                                            <SelectItem key={mi.id!} value={mi.id!}>{mi.name} ({mi.base_unit})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Esto permite que el OCR actualice el precio de tus recetas automáticamente.</p>
                            </div>

                            <Button type="submit" className="w-full">Guardar</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto (Factura)</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Mapeo</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No hay productos registrados de este proveedor.
                                </TableCell>
                            </TableRow>
                        )}
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    {item.name_on_invoice}
                                    <div className="text-xs text-muted-foreground">Format: {item.pack_size || '-'}</div>
                                </TableCell>
                                <TableCell>{item.sku_on_invoice || '-'}</TableCell>
                                <TableCell>
                                    {item.master_ingredients ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {item.master_ingredients.name}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-amber-600 font-medium">No mapeado</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">{item.last_price ? `€${item.last_price}` : '-'}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
