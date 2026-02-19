import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-black/70 transition-all duration-300">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary transition-colors duration-300">
                                <Sparkles className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                            </div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-foreground transition-all duration-300 group-hover:tracking-normal">
                                ControlHub
                            </span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link
                                href="/"
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-300"
                            >
                                Panel de Control
                            </Link>
                            {[
                                { name: "Escandallos", href: "/escandallos" },
                                { name: "Facturas", href: "/invoices" },
                                { name: "Proveedores", href: "/suppliers" },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-300"
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <Link
                                href="/menu-engineering"
                                className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-full transition-all duration-300 flex items-center gap-2"
                            >
                                Ingeniería de Menú <span className="text-base animate-pulse">🧠</span>
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground rounded-full"
                        >
                            Acceder
                        </Button>
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5"
                        >
                            Empezar
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}
