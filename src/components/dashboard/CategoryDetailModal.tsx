'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

interface CategoryDetailModalProps {
    isOpen: boolean
    onClose: () => void
    category: string
    restaurantId: string
    startDate: string
    endDate: string
}

interface DetailItem {
    name: string
    supplier: string
    total_spend: number
    quantity: number
    avg_price: number
}

export function CategoryDetailModal({
    isOpen,
    onClose,
    category,
    restaurantId,
    startDate,
    endDate
}: CategoryDetailModalProps) {
    const [items, setItems] = useState<DetailItem[]>([])
    const [loading, setLoading] = useState(false)


    useEffect(() => {
        async function fetchDetails() {
            setLoading(true)
            // supabase imported from lib

            const { data: invoices, error } = await supabase
                .from('invoices')
                .select(`
                    total_amount,
                    supplier:suppliers (
                        name,
                        category
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .gte('issue_date', startDate)
                .lte('issue_date', endDate)
                .eq('status', 'processed')

            const supplierMap = new Map<string, number>()

            if (error) {
                console.error("Error fetching invoices:", error);
                setLoading(false);
                return;
            }

            if (invoices) {
                interface InvoiceWithSupplier {
                    total_amount: number;
                    supplier: {
                        name: string;
                        category: string;
                    } | null;
                }

                (invoices as unknown as InvoiceWithSupplier[]).forEach((inv) => {
                    const invCat = inv.supplier?.category
                    const supplierName = inv.supplier?.name

                    if (invCat === category && supplierName) {
                        supplierMap.set(supplierName, (supplierMap.get(supplierName) || 0) + (inv.total_amount || 0))
                    }
                })
            }

            const aggregated: DetailItem[] = Array.from(supplierMap.entries())
                .map(([name, amount]) => ({
                    name: "All Items",
                    supplier: name,
                    total_spend: amount,
                    quantity: 1,
                    avg_price: amount
                }))
                .sort((a, b) => b.total_spend - a.total_spend)

            setItems(aggregated)
            setLoading(false)
        }

        if (isOpen && category) {
            fetchDetails()
        }
    }, [isOpen, category, startDate, endDate, restaurantId])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-premium max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {category} Details
                        <Badge variant="outline" className="ml-2 font-normal">
                            {startDate.split('T')[0]} - {endDate.split('T')[0]}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Breakdown of spend by supplier (Item breakdown coming soon)
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-3 font-medium">Supplier</th>
                                        <th className="p-3 font-medium text-right">Total Spend</th>
                                        <th className="p-3 font-medium text-right">% of Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-t border-border/50 hover:bg-muted/20">
                                            <td className="p-3 font-medium">{item.supplier}</td>
                                            <td className="p-3 text-right">€{item.total_spend.toFixed(2)}</td>
                                            <td className="p-3 text-right">
                                                {items.length > 0 ? ((item.total_spend / items.reduce((s, i) => s + i.total_spend, 0)) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                                No records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
