"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { navigationConfig, type NavItem } from "@/config/navigation"
import { cn } from "@/lib/utils"

const allNavItems: NavItem[] = navigationConfig.flatMap(g => g.items)

function findNavItem(pathname: string): NavItem | undefined {
    return allNavItems.find(
        item => pathname === item.href || pathname.startsWith(item.href + "/")
    )
}

function buildCrumbs(pathname: string) {
    const crumbs: { label: string; href: string }[] = []

    const navItem = findNavItem(pathname)
    if (!navItem) return crumbs

    crumbs.push({ label: navItem.title, href: navItem.href })

    const rest = pathname.slice(navItem.href.length).replace(/^\//, "")
    if (rest) {
        const segments = rest.split("/").filter(Boolean)
        let accumulated = navItem.href
        for (const seg of segments) {
            accumulated += "/" + seg
            const decoded = decodeURIComponent(seg)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)
            const label = isUuid
                ? "Detalle"
                : decoded.charAt(0).toUpperCase() + decoded.slice(1).replace(/-/g, " ")
            crumbs.push({ label, href: accumulated })
        }
    }

    return crumbs
}

export function Breadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname()
    if (!pathname || pathname === "/") return null

    const crumbs = buildCrumbs(pathname)
    if (crumbs.length === 0) return null

    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm", className)}>
            <Link
                href="/"
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>

            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1
                return (
                    <span key={crumb.href} className="flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                        {isLast ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
