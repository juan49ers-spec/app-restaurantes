"use client"

import { usePathname } from "next/navigation"
import React, { useState, useEffect, useTransition } from "react"
import { User } from "@supabase/supabase-js"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"
import { TourGuide } from "@/components/ui/tour-guide"
import { GuideSelector } from "@/components/ui/guide-selector"

interface AppLayoutProps {
    children: React.ReactNode
    user?: User
    activeAddons?: string[]
    restaurantId?: string
    restaurantName?: string
    isImpersonating?: boolean
    isAdmin?: boolean
}

export function AppLayout({ children, user, activeAddons = [], restaurantId, restaurantName, isImpersonating = false, isAdmin = false }: AppLayoutProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [scenarioId, setScenarioId] = useState<string | null>(null)
    const [isGuideOpen, setIsGuideOpen] = useState(false)
    const [, startTransition] = useTransition()

    useEffect(() => {
        startTransition(() => {
            const savedState = localStorage.getItem("sidebar-collapsed")
            if (savedState) {
                setCollapsed(JSON.parse(savedState))
            }

            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            if (window.innerWidth < 1024 && !mobile && !localStorage.getItem("sidebar-collapsed")) {
                setCollapsed(true)
            }
        })

        const handleResize = () => {
            startTransition(() => {
                const mobile = window.innerWidth < 768
                setIsMobile(mobile)
                if (window.innerWidth < 1024 && !mobile) {
                    setCollapsed(true)
                }
            })
        }

        window.addEventListener("resize", handleResize, { passive: true })

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    const toggleCollapse = () => {
        const newState = !collapsed
        setCollapsed(newState)
        localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
    }

    const pathname = usePathname()
    const isExemptRoute = pathname?.startsWith('/login') || pathname?.startsWith('/auth') || pathname?.startsWith('/admin')

    if (isExemptRoute) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen bg-gastronomic-gradient">
            <Sidebar
                user={user}
                collapsed={collapsed}
                setCollapsed={toggleCollapse}
                isMobile={isMobile}
                activeAddons={activeAddons}
                restaurantId={restaurantId}
                restaurantName={restaurantName}
                isImpersonating={isImpersonating}
                isAdmin={isAdmin}
            />
            <main
                className={cn(
                    "flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:pl-8 lg:pl-10 transition-[margin] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    !isMobile && (collapsed ? "ml-24" : "ml-72")
                )}
            >
                <div className="flex justify-between items-center mb-6 md:mb-0">
                    <div className="h-12 md:hidden" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsGuideOpen(true)}
                        className="hidden md:flex gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                        <Wand2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Guía Interactiva</span>
                    </Button>
                </div>

                <GuideSelector
                    open={isGuideOpen}
                    onOpenChange={setIsGuideOpen}
                    onSelectScenario={(id) => {
                        setIsGuideOpen(false)
                        // Small delay to allow modal to close smoothly before tour starts
                        setTimeout(() => setScenarioId(id), 200)
                    }}
                />

                <TourGuide scenarioId={scenarioId} onClose={() => setScenarioId(null)} />
                {children}
            </main>
        </div>
    )
}
