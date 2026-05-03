"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { navigationConfig } from "@/config/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "radix-ui"

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter()
    const openRef = useRef(open)
    openRef.current = open

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                onOpenChange(!openRef.current)
            }
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onOpenChange])

    const runCommand = useCallback((href: string) => {
        onOpenChange(false)
        router.push(href)
    }, [router, onOpenChange])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="p-0 overflow-hidden max-w-lg top-[35%] rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-indigo-500/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
            >
                <VisuallyHidden.Root>
                    <DialogTitle>Buscar</DialogTitle>
                </VisuallyHidden.Root>
                <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-xs">
                    <div className="flex items-center border-b border-slate-200/60 dark:border-slate-700/60 px-4">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                        <Command.Input
                            placeholder="Buscar sección..."
                            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                            ESC
                        </kbd>
                    </div>
                    <Command.List className="max-h-[320px] overflow-y-auto p-2">
                        <Command.Empty className="py-8 text-center text-sm text-slate-400">
                            Sin resultados.
                        </Command.Empty>
                        {navigationConfig.map(group => (
                            <Command.Group key={group.title} heading={group.title}>
                                {group.items.map(item => (
                                    <Command.Item
                                        key={item.href}
                                        value={`${item.title} ${item.description}`}
                                        onSelect={() => runCommand(item.href)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-colors",
                                            "aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10 aria-selected:text-indigo-700 dark:aria-selected:text-indigo-300",
                                            "text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 group-aria-selected:bg-indigo-100 dark:group-aria-selected:bg-indigo-500/20 transition-colors">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold tracking-tight">{item.title}</span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">{item.description}</span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        ))}
                    </Command.List>
                </Command>
            </DialogContent>
        </Dialog>
    )
}
