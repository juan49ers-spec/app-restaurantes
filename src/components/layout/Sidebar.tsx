"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    ChevronRight,
    Menu,
    LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { navigationConfig, MenuGroup } from "@/config/navigation"
import { supabase } from "@/lib/supabaseClient"
import dynamic from "next/dynamic"

const NotificationCenter = dynamic(
    () => import("@/components/alerts/NotificationCenter").then(mod => mod.NotificationCenter),
    { ssr: false, loading: () => <div className="h-9 w-9" /> }
)
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
    className?: string
    user?: User
    collapsed: boolean
    setCollapsed: () => void
    isMobile: boolean
    activeAddons?: string[]
}

export function Sidebar({ className, user, collapsed, setCollapsed: toggleCollapse, isMobile, activeAddons = [] }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()






    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    // Mobile Drawer
    if (isMobile) {
        return (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur border shadow-sm" aria-label="Abrir menú">
                        <Menu className="w-5 h-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px]">
                    <SidebarContent
                        pathname={pathname}
                        collapsed={false}
                        toggleCollapse={() => { }}
                        isMobile={true}
                        menuGroups={navigationConfig}
                        user={user}
                        onLogout={handleLogout}
                        activeAddons={activeAddons}
                    />
                </SheetContent>
            </Sheet>
        )
    }

    // Desktop Sidebar
    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "bg-white/70 dark:bg-black/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-indigo-500/5",
                collapsed ? "w-24" : "w-72",
                "hidden md:flex flex-col",
                className
            )}
        >
            <SidebarContent
                pathname={pathname}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                isMobile={false}
                menuGroups={navigationConfig}
                user={user}
                onLogout={handleLogout}
                activeAddons={activeAddons}
            />
        </aside>
    )
}

interface SidebarContentProps {
    pathname: string | null
    collapsed: boolean
    toggleCollapse: () => void
    isMobile: boolean
    menuGroups: MenuGroup[]
    user?: User
    onLogout: () => void
    activeAddons: string[]
}

function SidebarContent({ pathname, collapsed, toggleCollapse, isMobile, menuGroups, user, onLogout, activeAddons }: SidebarContentProps) {
    const router = useRouter()

    const getInitials = () => {
        const fullName = user?.user_metadata?.full_name
        const email = user?.email
        const name = fullName || email || ""
        if (!name) return "G"

        const parts = name.trim().split(/[\s.@]+/).filter(Boolean)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        return name.slice(0, 2).toUpperCase()
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Invitado"
    const userRole = user?.user_metadata?.role || "Usuario"
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'

    const filteredMenuGroups = menuGroups.map(group => {
        if (isAdmin) return group // Admins see everything
        if (group.title === "CORE") return group
        if (group.title === "OPERATIVA" && activeAddons.includes('operativa')) return group
        if (group.title === "ESTRUCTURA" && activeAddons.includes('personal')) return group
        if (group.title === "PROVEEDORES" && activeAddons.includes('proveedores')) return group
        return null
    }).filter(Boolean) as MenuGroup[]

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            <div className={cn(
                "flex-shrink-0 flex items-center gap-3 px-6 py-10 transition-all duration-500",
                collapsed ? "justify-center" : "px-8"
            )}>
                <Link href="/" className="relative group flex items-center gap-3">
                    <div className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 text-white font-black text-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                        C
                    </div>
                    {!collapsed && (
                        <span className="font-serif text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-400 bg-clip-text text-transparent tracking-tight">
                            ControlHub
                        </span>
                    )}
                </Link>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-4 pt-2">
                    {filteredMenuGroups.map((group, idx) => (
                        <div key={idx} className={cn(
                            "transition-all duration-500 mx-2 p-1.5 rounded-[1.5rem] bg-white/40 dark:bg-white/[0.03] border border-white/60 dark:border-white/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] space-y-1.5",
                            collapsed ? "p-1" : "p-2"
                        )}>
                            {!collapsed && (
                                <h4 className="px-3 pb-0.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] font-sans">
                                    {group.title}
                                </h4>
                            )}
                            <nav className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/')

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onMouseEnter={() => router.prefetch(item.href)}
                                            className={cn(
                                                "group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 relative overflow-hidden",
                                                collapsed ? "justify-center px-0 h-10" : "",
                                                isActive
                                                    ? "bg-white dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20"
                                                    : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-[1.125rem] w-[1.125rem] transition-all duration-300 z-10",
                                                isActive ? "scale-110 text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:scale-110 group-hover:text-indigo-500"
                                            )} />

                                            {!collapsed && (
                                                <span className="text-sm font-bold tracking-tight z-10 antialiased">
                                                    {item.title}
                                                </span>
                                            )}

                                            {isActive && !collapsed && (
                                                <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r-full" />
                                            )}
                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-auto flex-shrink-0 w-full px-4 pb-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className={cn(
                    "relative flex items-center transition-all duration-500 ease-out p-1.5 rounded-2xl group",
                    collapsed ? "justify-center bg-transparent" : "bg-white/60 dark:bg-white/[0.03] shadow-lg border border-white dark:border-white/5 gap-3 pr-3"
                )}>
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-900 shadow-sm relative ring-1 ring-slate-200/50 dark:ring-white/10">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                                {getInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm z-10" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col min-w-0 flex-1 py-0.5">
                            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight tracking-tight">
                                {userName}
                            </p>
                            <p className="text-[9px] text-indigo-500 dark:text-indigo-300 truncate uppercase tracking-widest font-black opacity-80 mt-0.5">
                                {userRole}
                            </p>
                        </div>
                    )}

                    {!collapsed && (
                        <>
                            <NotificationCenter />
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    onLogout()
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all active:scale-90"
                                aria-label="Cerrar sesión"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}
                </div>

                {!isMobile && (
                    <button
                        onClick={toggleCollapse}
                        className={cn(
                            "mt-3 w-full flex items-center transition-all duration-500 rounded-xl overflow-hidden group",
                            collapsed ? "justify-center py-2 h-10 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/5" : "justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 h-10"
                        )}
                    >
                        {!collapsed && (
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600 transition-colors">
                                Contraer
                            </span>
                        )}
                        <div className={cn(
                            "flex items-center justify-center transition-all duration-500",
                            collapsed ? "rotate-0 text-indigo-500" : "rotate-180 text-slate-300 group-hover:text-indigo-400"
                        )}>
                            <ChevronRight className={cn(collapsed ? "h-5 w-5 animate-pulse" : "h-4 w-4")} />
                        </div>
                    </button>
                )}
            </div>
        </div>
    )
}
