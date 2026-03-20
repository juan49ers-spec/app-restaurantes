"use client";

import { useState } from "react";
import { FolderUp, RefreshCw, CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
    restaurantId: string;
}

export function DriveInboxPanel({ restaurantId }: Props) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(new Date()); // Mock para MVP

    // En el futuro, esto leerá de la tabla invoices filtrado por este restaurante
    const [recentInvoices] = useState([
        { id: 1, name: "Factura_Makro_Marzo.pdf", status: "completed", date: "Hace 2h" },
        { id: 2, name: "Ticket_Gasolinera.jpg", status: "review_required", date: "Hace 5h" },
    ]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            // Llama voluntariamente al cron (requerirá Auth en el futuro o un endpoint específico manual)
            // const res = await fetch('/api/cron/process-drive');
            // await res.json();
            
            // Simulación
            await new Promise(resolve => setTimeout(resolve, 2000));
            setLastSync(new Date());
        } catch (error) {
            console.error(error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <FolderUp className="w-5 h-5 text-blue-500" />
                            Ingesta Automática
                        </CardTitle>
                        <CardDescription data-restaurant-id={restaurantId}>
                            Facturas procesadas desde Google Drive
                        </CardDescription>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSync} 
                        disabled={isSyncing}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Sincronizando..." : "Forzar Sincronización"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Última sincronización: {lastSync ? lastSync.toLocaleTimeString() : 'Nunca'}
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Últimos documentos procesados</h4>
                    
                    {recentInvoices.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                            No hay documentos recientes. Sube facturas a tu carpeta INBOX de Drive.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentInvoices.map((inv) => (
                                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-muted/30 gap-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium truncate">{inv.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                        <span className="text-xs text-muted-foreground">{inv.date}</span>
                                        {inv.status === 'completed' ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 flex items-center">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Procesado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 flex items-center">
                                                <AlertCircle className="w-3 h-3" />
                                                Revisión manual
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {recentInvoices.some(i => i.status === 'review_required') && (
                    <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm flex items-start gap-2 border border-amber-200">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong>Tienes documentos pendientes de revisión.</strong> Entra en la carpeta `3_REVISION_MANUAL` de tu Google Drive para corregirlos.
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Utility local
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}
