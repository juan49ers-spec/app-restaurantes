import { motion } from "framer-motion"
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface SmartBriefingProps {
    metrics: {
        totalRevenue: number
        netProfit: number
        netProfitPct: number
        laborCostPct: number
    } | null
    userName?: string
}

export function SmartBriefing({ metrics, userName = "Chef" }: SmartBriefingProps) {
    const router = useRouter()

    if (!metrics) return (
        <div className="h-32 w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-3xl" />
    )

    const { netProfitPct, laborCostPct } = metrics

    // Logic for message generation
    let message = ""
    let subMessage = ""
    let status: "good" | "neutral" | "bad" = "neutral"
    let Icon = Sparkles
    let actionLabel = ""
    let actionRoute = ""

    if (netProfitPct > 20) {
        message = "¡Rendimiento Excepcional!"
        subMessage = `Tu margen neto del ${netProfitPct.toFixed(1)}% supera todas las expectativas. Es un gran momento para reinvertir.`
        status = "good"
        Icon = TrendingUp
        actionLabel = "Ver Proyecciones"
        actionRoute = "/financial-control" // Could go to specific projection view if it existed
    } else if (netProfitPct > 10) {
        if (laborCostPct > 35) {
            message = "Buen beneficio, pero vigila el personal."
            subMessage = `El coste de personal (${laborCostPct.toFixed(1)}%) está impactando tu margen potencial.`
            status = "neutral"
            Icon = AlertTriangle
            actionLabel = "Analizar Eficiencia"
            actionRoute = "/staff/schedule"
        } else {
            message = "El negocio es saludable y estable."
            subMessage = "Tus métricas clave están balanceadas. Mantén este ritmo."
            status = "good"
            Icon = CheckCircle2
            actionLabel = "Ver Informe Completo"
            actionRoute = "/financial-control"
        }
    } else if (netProfitPct > 0) {
        message = "Margen positivo, pero ajustado."
        subMessage = `Estás en verde (${netProfitPct.toFixed(1)}%), pero cualquier imprevisto podría afectarte.`
        status = "neutral"
        Icon = AlertTriangle
        actionLabel = "Revisar Gastos"
        actionRoute = "/financial-control?view=cfo"
    } else {
        message = "Acción Requerida: Negocio en Pérdidas."
        subMessage = "Es urgente revisar la ingeniería de menú y costes fijos para recuperar la rentabilidad."
        status = "bad"
        Icon = AlertTriangle
        actionLabel = "Auditoría de Costes"
        actionRoute = "/financial-control?view=cfo"
    }

    const colors = {
        good: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        neutral: "bg-amber-500/10 text-amber-600 border-amber-200",
        bad: "bg-rose-500/10 text-rose-600 border-rose-200"
    }[status]

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-3xl backdrop-blur-md border shadow-sm transition-all duration-500 ${colors} hover:shadow-md cursor-default`}
        >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className={`p-3 rounded-xl bg-white dark:bg-black/20 shadow-sm ring-1 ring-inset ring-black/5`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                    <h2 className="text-lg font-serif font-black tracking-tight leading-none">
                        Hola {userName}, {message.toLowerCase()}
                    </h2>
                    <p className="text-sm opacity-90 leading-snug font-medium max-w-xl">
                        {subMessage}
                    </p>
                </div>
            </div>

            {actionLabel && (
                <Button
                    onClick={() => router.push(actionRoute)}
                    size="sm"
                    className="shrink-0 bg-white/20 hover:bg-white/30 text-current border border-current/20 shadow-none hover:shadow-sm transition-all h-8 text-[10px] font-black uppercase tracking-widest px-4"
                >
                    {actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
            )}
        </motion.div>
    )
}
