'use client'

import { stopImpersonation } from '@/app/actions/impersonate'
import { Button } from '@/components/ui/button'
import { AlertTriangle, LogOut } from 'lucide-react'

export function ImpersonationBanner({ restaurantName }: { restaurantName: string }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 p-2 sm:p-3 flex items-center justify-between shadow-lg shadow-amber-500/20 translate-y-0 animate-in slide-in-from-bottom border-t border-amber-600/20">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 flex-1 font-medium text-xs sm:text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>
                        <strong>Modo Súper Administrador:</strong> Estás viendo el sistema como <span className="underline decoration-amber-600 underline-offset-2 font-bold">{restaurantName}</span>. Todo se muestra exactamente igual que a un usuario de este restaurante.
                    </p>
                </div>
                <Button
                    onClick={() => stopImpersonation()}
                    variant="outline"
                    size="sm"
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold whitespace-nowrap mt-2 sm:mt-0 w-full sm:w-auto"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir del Modo
                </Button>
            </div>
        </div>
    )
}
