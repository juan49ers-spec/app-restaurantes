'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, CreditCard, Box, TrendingUp, Calendar, Star } from "lucide-react"
import { Supplier } from "@/types/schema"

interface SupplierDetailsModalProps {
    supplier: Supplier | null
    isOpen: boolean
    onClose: () => void
}

export function SupplierDetailsModal({ supplier, isOpen, onClose }: SupplierDetailsModalProps) {
    if (!supplier) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {supplier.name}
                        <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-600">
                            Activo
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        ID: {supplier.id?.slice(0, 8)}...
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Contact Info */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Contacto</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-md">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Email</p>
                                    <p className="text-xs font-medium truncate" title={supplier.contact_email || ''}>
                                        {supplier.contact_email || 'No disponible'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div className="bg-green-100 text-green-600 p-2 rounded-md">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Teléfono</p>
                                    <p className="text-xs font-medium">
                                        {supplier.contact_phone || 'No disponible'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 col-span-2">
                                <div className="bg-slate-100 text-slate-600 p-2 rounded-md">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">CIF / NIF</p>
                                    <p className="text-xs font-medium font-mono">
                                        {supplier.tax_id || 'No registrado'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Stats (Mock) */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex justify-between items-center">
                            Rendimiento
                            <Badge variant="outline" className="text-[10px] font-normal border-green-200 text-green-700 bg-green-50">
                                <Star className="w-3 h-3 mr-1 fill-green-600 text-green-600" />
                                98% Fiabilidad
                            </Badge>
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded border border-slate-100 text-center">
                                <p className="text-xs text-slate-400 mb-1">Gasto Mes</p>
                                <p className="font-bold text-slate-700">1.240€</p>
                            </div>
                            <div className="p-2 rounded border border-slate-100 text-center">
                                <p className="text-xs text-slate-400 mb-1">Facturas</p>
                                <p className="font-bold text-slate-700">4</p>
                            </div>
                            <div className="p-2 rounded border border-slate-100 text-center">
                                <p className="text-xs text-slate-400 mb-1">Items</p>
                                <p className="font-bold text-slate-700">45</p>
                            </div>
                        </div>
                    </div>

                    {/* Top Products (Placeholder) */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Top Productos</h4>
                        <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center gap-2"><Box className="w-3 h-3 text-slate-400" /> Solomillo Vacuno</span>
                                <span className="font-mono font-medium">450€</span>
                            </div>
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center gap-2"><Box className="w-3 h-3 text-slate-400" /> Aceite Oliva 5L</span>
                                <span className="font-mono font-medium">210€</span>
                            </div>
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center gap-2"><Box className="w-3 h-3 text-slate-400" /> Queso Manchego</span>
                                <span className="font-mono font-medium">180€</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Editar Proveedor</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
