'use client'

import { ReactNode } from 'react'

interface FinancialHubLayoutProps {
    children: ReactNode
}

// Localized layout wrapper
export function FinancialHubLayout({ children }: FinancialHubLayoutProps) {
    // Current tab detection based on URL query or active component state would be ideal,
    // but for now we'll imply it or manage it via parent page state passed down.
    // Actually, `page.tsx` will manage the tabs for V1 to keep it simple (everything in one page).
    // This layout is more of a wrapper for the "Financial" section.

    return (
        <div className="space-y-6">
            <header className="relative flex flex-col md:flex-row justify-between items-end gap-6 pb-8 overflow-hidden">
                {/* Gradient mesh */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 via-transparent to-sky-50/30 dark:from-emerald-950/10 dark:via-transparent dark:to-sky-950/10 rounded-2xl -mx-2 -mt-2" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                <div className="relative space-y-1.5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                            <div className="absolute inset-0 h-2 w-2 bg-emerald-500 rounded-full animate-ping opacity-30" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Control Financiero
                        </h1>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground/60 pl-5">
                        Gestión Operativa · <span className="text-emerald-600/80 font-bold">Libros y Flujo de Caja</span>
                    </p>
                </div>
            </header>

            <main className="min-h-[600px]">
                {children}
            </main>
        </div>
    )
}
