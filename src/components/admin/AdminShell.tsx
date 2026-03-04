'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    BarChart3,
    Building2,
    FileText,
    Shield,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Activity,
    Users
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

const NAV_ITEMS = [
    { href: '/admin', label: 'Panel General', icon: BarChart3, exact: true },
    { href: '/admin/restaurants', label: 'Restaurantes', icon: Building2 },
    { href: '/admin/users', label: 'Usuarios', icon: Users },
    { href: '/admin/audit', label: 'Auditoría', icon: Shield },
    { href: '/admin/invoice-validation', label: 'Validación Facturas', icon: FileText },
]

export function AdminShell({ children, userEmail }: { children: ReactNode; userEmail: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        toast.success("Sesión cerrada")
        router.push('/login')
    }

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.exact) return pathname === item.href
        return pathname.startsWith(item.href)
    }

    // Derivar nombre e iniciales del email
    const userName = userEmail.split('@')[0]
    const initials = userName.slice(0, 2).toUpperCase()

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-neutral-900/50">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-base font-bold tracking-tight">ControlHub</span>
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            Admin
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                    active
                                        ? "bg-white/10 text-white"
                                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", active && "text-red-400")} />
                                {item.label}
                                {active && <ChevronRight className="w-3 h-3 ml-auto text-red-400" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-xs font-bold shadow-lg shadow-red-500/20">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-neutral-300 truncate">Super Admin</p>
                            <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-neutral-900/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700">
                        <Activity className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-sm">ControlHub</span>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Admin</span>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg">
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
                    <div className="w-72 h-full bg-neutral-900 border-r border-white/5 pt-16 px-3 py-4 space-y-1" onClick={e => e.stopPropagation()}>
                        {NAV_ITEMS.map(item => {
                            const active = isActive(item)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                        active
                                            ? "bg-white/10 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-4 h-4", active && "text-red-400")} />
                                    {item.label}
                                </Link>
                            )
                        })}
                        <div className="pt-4 border-t border-white/5 mt-4">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-red-400"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-0 min-h-screen">
                <div className="pt-14 lg:pt-0">
                    {children}
                </div>
            </main>
        </div>
    )
}
