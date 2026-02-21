
import {
    FileText,
    BookOpen,
    BrainCircuit,
    Users,
    CalendarClock,
    Truck,
    Package,
    Trash2,
    Wallet,
    type LucideIcon
} from "lucide-react"

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    description: string
}

export interface MenuGroup {
    title: string
    items: NavItem[]
}

export const navigationConfig: MenuGroup[] = [
    {
        title: "CORE",
        items: [
            { title: "Control Financiero", href: "/financial-control", icon: Wallet, description: "Gestión y KPIs" },
            { title: "Facturas", href: "/invoices", icon: FileText, description: "Input de Datos" }
        ]
    },
    {
        title: "OPERATIVA",
        items: [
            { title: "Escandallos", href: "/escandallos", icon: BookOpen, description: "Recetas e Ingredientes" },
            { title: "Ingeniería de Menú", href: "/menu-engineering", icon: BrainCircuit, description: "Rentabilidad" },
            { title: "Control de Stock", href: "/stock", icon: Package, description: "Inventario" },
            { title: "Desperdicios", href: "/desperdicios", icon: Trash2, description: "Mermas" }
        ]
    },
    {
        title: "ESTRUCTURA",
        items: [
            { title: "Equipo", href: "/staff/employees", icon: Users, description: "Directorio" },
            { title: "Turnos", href: "/staff/schedule", icon: CalendarClock, description: "Smart Scheduling" },
            { title: "Políticas", href: "/staff/policies", icon: BookOpen, description: "Documentación" }
        ]
    },
    {
        title: "PROVEEDORES",
        items: [
            { title: "Proveedores", href: "/suppliers", icon: Truck, description: "Gestión de Terceros" }
        ]
    }
]
