'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { Supplier } from "@/types/schema"
import {
    Table, TableBody, TableCell, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Pencil, Trash2, Plus, Search, ShieldCheck, Mail, Phone
} from "lucide-react"
import { toast } from "sonner"
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/actions/suppliers"

import { SupplierDetailsModal } from "./SupplierDetailsModal"

export function SupplierTable({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
    const router = useRouter()
    const [suppliers] = useState(initialSuppliers)
    const [search, setSearch] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

    // CRM Modal State
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const debouncedSearch = useDebouncedValue(search, 300)
    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.contact_email?.toLowerCase().includes(debouncedSearch.toLowerCase())
    )

    const handleSubmit = async (formData: FormData) => {
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id!, formData)
                toast.success("Proveedor actualizado")
            } else {
                await createSupplier(formData)
                toast.success("Proveedor creado")
            }
            setIsDialogOpen(false)
            setEditingSupplier(null)
            router.refresh()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error desconocido"
            toast.error("Error al guardar: " + msg)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar este proveedor?")) return
        try {
            await deleteSupplier(id)
            toast.success("Proveedor eliminado")
            router.refresh()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error desconocido"
            toast.error("Error al borrar: " + msg)
        }
    }

    const openEdit = (s: Supplier) => {
        setEditingSupplier(s)
        setIsDialogOpen(true)
    }

    const openCreate = () => {
        setEditingSupplier(null)
        setIsDialogOpen(true)
    }

    const openDetails = (s: Supplier) => {
        setSelectedSupplier(s)
        setIsDetailsOpen(true)
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar proveedor..."
                        className="pl-9 bg-white border-slate-200 h-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate} size="sm" className="h-9">
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Proveedor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-slate-500">Datos Fiscales</Label>
                                <Input name="name" placeholder="Nombre Fiscal" defaultValue={editingSupplier?.name} required />
                                <Input name="tax_id" placeholder="CIF / NIF" defaultValue={editingSupplier?.tax_id} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-slate-500">Contacto</Label>
                                <Input name="contact_email" type="email" placeholder="Email" defaultValue={editingSupplier?.contact_email} />
                                <Input name="contact_phone" placeholder="Teléfono" defaultValue={editingSupplier?.contact_phone} />
                            </div>
                            <Button type="submit" className="w-full">Guardar Cambios</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            {/* ... */}

            <SupplierDetailsModal
                supplier={selectedSupplier}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />

            {/* Table */}
            <div className="overflow-x-auto">
                <Table>
                    {/* ... */}
                    <TableBody>
                        {/* ... */}
                        {filteredSuppliers.map((s) => (
                            <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                                <TableCell>
                                    <div className="flex flex-col cursor-pointer" onClick={() => openDetails(s)}>
                                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                            {s.name}
                                            <Search className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                        </span>
                                        <span className="text-xs font-mono text-slate-500">{s.tax_id || 'Sin ID'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {s.contact_email && (
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                                                {s.contact_email}
                                            </div>
                                        )}
                                        {s.contact_phone && (
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                                                {s.contact_phone}
                                            </div>
                                        )}
                                        {!s.contact_email && !s.contact_phone && (
                                            <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        A+ Reliable
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => openEdit(s)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(s.id!)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div >
    )
}
