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
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-black/5 dark:border-white/5 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                        <h1 className="text-4xl font-serif font-black tracking-tighter text-foreground">
                            Control Financiero
                        </h1>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/60 pl-4">
                        Gestión Operativa · <span className="text-emerald-600/80 font-bold">Libros y Flujo de Caja</span>
                    </p>
                </div>

                {/* Navigation / Tabs will be injected by the page or handled here if we split into subroutes later */}
            </header>

            <main className="min-h-[600px]">
                {children}
            </main>
        </div>
    )
}
