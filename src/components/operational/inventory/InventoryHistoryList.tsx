'use client'

import { InventorySession } from "@/types/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

export function InventoryHistoryList({ sessions }: { sessions: InventorySession[] }) {
    if (sessions.length === 0) {
        return (
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-foreground">No hay recuentos de inventario</p>
                    <p className="text-sm">Inicia tu primer recuento para calcular el coste de ventas real.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
                <Link key={session.id} href={`/operations/inventory/count/${session.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(session.date), "dd MMMM yyyy", { locale: es })}
                                </CardTitle>
                                <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                                    {session.status === 'completed' ? 'Completado' : 'Pendiente'}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Creado el {format(new Date(session.created_at!), "dd/MM/yy HH:mm")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {session.notes ? (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {session.notes}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    Sin notas
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
