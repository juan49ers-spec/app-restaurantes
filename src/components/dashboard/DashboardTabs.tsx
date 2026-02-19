
"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LayoutDashboard, Wallet } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { DashboardGuide } from "@/components/dashboard/DashboardGuide"

interface DashboardTabsProps {
    ceoView: React.ReactNode
    cfoView: React.ReactNode
    defaultTab?: string
}

export function DashboardTabs({ ceoView, cfoView, defaultTab = "ceo" }: DashboardTabsProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // URL is the source of truth
    const activeTab = searchParams.get("view") || defaultTab

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("view", val)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-serif font-black tracking-tight text-neutral-900 dark:text-white">
                            {activeTab === 'ceo' ? 'Visión CEO' : 'Visión CFO'}
                        </h1>
                        <DashboardGuide />
                    </div>
                    <p className="text-neutral-500 font-medium">
                        {activeTab === 'ceo'
                            ? "Estrategia Global y Diagnóstico."
                            : "Control Financiero y Gestión de Gastos."}
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-1 rounded-full">
                        <TabsTrigger
                            value="ceo"
                            className="rounded-full data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4"
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Visión CEO
                        </TabsTrigger>
                        <TabsTrigger
                            value="cfo"
                            className="rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-4"
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            Visión CFO
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Tabs value={activeTab} className="w-full">
                <TabsContent value="ceo" className="mt-0 focus-visible:outline-none">
                    {ceoView}
                </TabsContent>
                <TabsContent value="cfo" className="mt-0 focus-visible:outline-none">
                    {cfoView}
                </TabsContent>
            </Tabs>
        </div>
    )
}
