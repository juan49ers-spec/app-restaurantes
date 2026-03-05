'use client'

import { useState } from 'react'
import { BillingOverview, RestaurantBillingInfo, changeRestaurantPlan, adjustCredits, registerPayment, getBillingHistory, BillingEvent } from '@/app/actions/admin-billing'
import { AddonId, PlanModuleAccess } from '@/lib/plan-definitions'
import { BillingModule } from '@/types/billing'
import { CreditCard, History, Package, Receipt, Settings, TrendingUp, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BillingManagerProps {
    overview: BillingOverview
    restaurants: RestaurantBillingInfo[]
    billingConfigs: BillingModule[]
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val)

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function BillingManager({ overview, restaurants, billingConfigs }: BillingManagerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantBillingInfo | null>(null)
    const [actionModals, setActionModals] = useState<'NONE' | 'CHANGE_PLAN' | 'ADJUST_CREDITS' | 'REGISTER_PAYMENT' | 'HISTORY'>('NONE')
    const [history, setHistory] = useState<BillingEvent[]>([])

    // Lookup table for modules
    const moduleMap = new Map(billingConfigs.map(m => [m.id, m]));
    const baseModule = billingConfigs.find(m => m.is_base);

    const calculateDynamicMonthlyPrice = (activeAddons: AddonId[]) => {
        let total = baseModule?.price_monthly || 0;
        activeAddons.forEach(id => {
            total += moduleMap.get(id)?.price_monthly || 0;
        });
        return total;
    }

    // Modal States
    const [selectedAddons, setSelectedAddons] = useState<AddonId[]>([])
    const [creditAmount, setCreditAmount] = useState<number>(0)
    const [paymentAmount, setPaymentAmount] = useState<number>(0)
    const [reasonConcept, setReasonConcept] = useState('')

    const openModal = async (action: typeof actionModals, restaurant: RestaurantBillingInfo) => {
        setSelectedRestaurant(restaurant)
        setActionModals(action)
        setSelectedAddons(restaurant.active_addons || [])
        setCreditAmount(0)
        setPaymentAmount(0)
        setReasonConcept('')

        if (action === 'HISTORY') {
            try {
                const hist = await getBillingHistory(restaurant.id)
                setHistory(hist)
            } catch (err: any) {
                toast.error(err.message || 'Error al cargar historial')
            }
        }
    }

    const handlePlanChange = async () => {
        if (!selectedRestaurant) return
        setIsSubmitting(true)
        try {
            await changeRestaurantPlan(selectedRestaurant.id, selectedAddons, reasonConcept)
            toast.success(`Suscripción actualizada correctamente`)
            setActionModals('NONE')
        } catch (err: any) {
            toast.error(err.message || "Error al actualizar la suscripción")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreditAdjust = async () => {
        if (!selectedRestaurant) return
        if (!reasonConcept.trim()) return toast.error("Por favor, incluye un motivo")
        setIsSubmitting(true)
        try {
            const res = await adjustCredits(selectedRestaurant.id, creditAmount, reasonConcept)
            toast.success(`Créditos actualizados: ${res.previous} → ${res.new}`)
            setActionModals('NONE')
        } catch (err: any) {
            toast.error(err.message || "Error al ajustar créditos")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePaymentRegister = async () => {
        if (!selectedRestaurant) return
        if (paymentAmount <= 0) return toast.error("El monto debe ser numérico y mayor que 0")
        if (!reasonConcept.trim()) return toast.error("Por favor, incluye un concepto para el pago")
        setIsSubmitting(true)
        try {
            await registerPayment(selectedRestaurant.id, paymentAmount, reasonConcept)
            toast.success("Pago registrado exitosamente")
            setActionModals('NONE')
        } catch (err: any) {
            toast.error(err.message || "Error al registrar pago")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Colors for distribution chart
    const distributionColors: Record<string, string> = {
        'CORE': "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
        'operativa': "bg-blue-500/10 text-blue-400 border-blue-500/20",
        'personal': "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        'proveedores': "bg-purple-500/10 text-purple-400 border-purple-500/20"
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-medium">MRR Estimado</h3>
                    </div>
                    <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(overview.estimatedMonthlyRevenue)}</p>
                    <p className="text-xs text-neutral-500 mt-1">Ingreso Recurrente Mensual</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                        <Package className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-medium">Restaurantes Activos</h3>
                    </div>
                    <p className="text-3xl font-bold text-white tabular-nums">{overview.totalRestaurants}</p>
                    <p className="text-xs text-neutral-500 mt-1">Suscritos a algún plan</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-5 md:col-span-2">
                    <h3 className="text-sm font-medium text-neutral-400 mb-3">Distribución de Módulos</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                        {(Object.keys(overview.addonDistribution) as (AddonId | 'CORE')[]).map(addon => {
                            const count = overview.addonDistribution[addon] || 0
                            const pct = Math.round((count / (overview.totalRestaurants || 1)) * 100)
                            return count > 0 ? (
                                <div key={addon} className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs font-semibold text-white uppercase">{addon}</span>
                                        <span className="text-xs text-neutral-500">{count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className={cn("h-full transition-all duration-500", distributionColors[addon]?.split(' ')[0] || "bg-white/50")} style={{ width: `${pct}%` } as React.CSSProperties} />
                                    </div>
                                </div>
                            ) : null
                        })}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-neutral-400" />
                        Suscripciones de Clientes
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-neutral-500 text-left bg-black/20">
                                <th className="px-5 py-3 font-medium">Restaurante</th>
                                <th className="px-5 py-3 font-medium text-center">Plan Base</th>
                                <th className="px-5 py-3 font-medium text-center">Complementos</th>
                                <th className="px-5 py-3 font-medium text-right">Créditos OCR</th>
                                <th className="px-5 py-3 font-medium text-right">Actualizado</th>
                                <th className="px-5 py-3 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {restaurants.map(rest => {
                                const activeAddons = rest.active_addons || []
                                const currentPrice = calculateDynamicMonthlyPrice(activeAddons)
                                return (
                                    <tr key={rest.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-white">{rest.name}</div>
                                            <div className="text-xs text-neutral-500 mt-0.5">ID: {rest.id.split('-')[0]}...</div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-wider bg-neutral-500/10 text-neutral-400 border-neutral-500/20">
                                                {baseModule?.name || 'Base'}
                                            </span>
                                            <div className="text-[10px] text-neutral-500 mt-1">{formatCurrency(baseModule?.price_monthly || 0)}/mes</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                {activeAddons.length === 0 ? (
                                                    <span className="text-xs text-neutral-600 italic">Ninguno</span>
                                                ) : (
                                                    activeAddons.map(addonId => {
                                                        const m = moduleMap.get(addonId);
                                                        return (
                                                            <span key={addonId} className={cn(
                                                                "px-2 py-0.5 text-[10px] font-medium rounded-full border tracking-wide uppercase",
                                                                distributionColors[addonId] || "bg-white/10 text-white border-white/20"
                                                            )}>
                                                                {m?.name || addonId}
                                                            </span>
                                                        )
                                                    })
                                                )}
                                            </div>
                                            <div className="text-[10px] text-center text-emerald-400 font-medium mt-1">Total: {formatCurrency(currentPrice)}/mes</div>
                                        </td>
                                        <td className="px-5 py-4 text-right tabular-nums">
                                            <span className={cn("font-medium", rest.ocr_credits < 10 ? "text-red-400" : "text-neutral-300")}>
                                                {rest.ocr_credits}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right text-xs text-neutral-400">
                                            {formatDate(rest.plan_updated_at)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openModal('CHANGE_PLAN', rest)}
                                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                    title="Cambiar Plan"
                                                >
                                                    <Package className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal('ADJUST_CREDITS', rest)}
                                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                    title="Ajustar Créditos OCR"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal('REGISTER_PAYMENT', rest)}
                                                    className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-white/10 rounded transition-colors"
                                                    title="Registrar Pago"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal('HISTORY', rest)}
                                                    className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                                                    title="Historial de Facturación"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {restaurants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                                        No hay restaurantes registrados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals Base Wrapper */}
            {actionModals !== 'NONE' && selectedRestaurant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col">

                        {/* --- MODAL: CHANGE PLAN --- */}
                        {actionModals === 'CHANGE_PLAN' && (
                            <>
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white text-lg">Gestionar Complementos</h3>
                                </div>
                                <div className="p-5 overflow-y-auto hidden-scrollbar">
                                    <p className="text-sm text-neutral-400 mb-4">
                                        Gestiona los complementos activos para <span className="font-bold text-white">{selectedRestaurant.name}</span>.<br />
                                        El plan base (<span className="text-white font-medium">{baseModule?.name || 'Base'}</span>) siempre está incluido por {formatCurrency(baseModule?.price_monthly || 0)}/mes.
                                    </p>

                                    <div className="space-y-3 mb-6">
                                        {billingConfigs.filter(m => !m.is_base && m.is_active).map(addon => {
                                            const addonId = addon.id as AddonId
                                            const isActive = selectedAddons.includes(addonId)

                                            return (
                                                <button
                                                    key={addon.id}
                                                    onClick={() => {
                                                        if (isActive) {
                                                            setSelectedAddons(prev => prev.filter(id => id !== addonId))
                                                        } else {
                                                            setSelectedAddons(prev => [...prev, addonId])
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                                                        isActive ? "bg-white/10 border-white/30" : "bg-black/20 border-white/5 hover:border-white/15"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                                                            isActive ? "bg-emerald-500 border-emerald-500" : "border-neutral-500"
                                                        )}>
                                                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{addon.name}</div>
                                                            <div className="text-xs text-neutral-500 mt-1">{addon.description}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-emerald-400">+{formatCurrency(addon.price_monthly)}</div>
                                                        <div className="text-[10px] text-neutral-500">/mes</div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                                        <div className="text-sm text-emerald-400 font-medium">Nuevo Total Mensual</div>
                                        <div className="text-xl font-bold text-emerald-400 tabular-nums">
                                            {formatCurrency(calculateDynamicMonthlyPrice(selectedAddons))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">Motivo / Observaciones (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                                            placeholder="Ej: Activación de módulo de personal a petición"
                                            value={reasonConcept}
                                            onChange={e => setReasonConcept(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="p-5 border-t border-white/5 flex items-center justify-end gap-3 bg-neutral-900/50">
                                    <button onClick={() => setActionModals('NONE')} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cancelar</button>
                                    <button
                                        disabled={isSubmitting || (selectedRestaurant && JSON.stringify([...selectedAddons].sort()) === JSON.stringify([...(selectedRestaurant.active_addons || [])].sort()))}
                                        onClick={handlePlanChange}
                                        className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Guardando...' : 'Actualizar Suscripción'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* --- MODAL: ADJUST CREDITS --- */}
                        {actionModals === 'ADJUST_CREDITS' && (
                            <>
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white text-lg">Ajustar Créditos OCR</h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-xs text-neutral-500 font-medium">Restaurante</p>
                                            <p className="text-sm text-white font-bold">{selectedRestaurant.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-neutral-500 font-medium">Créditos Actuales</p>
                                            <p className="text-sm text-emerald-400 font-bold tabular-nums">{selectedRestaurant.ocr_credits}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">Ajuste (Positivo o Negativo)</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setCreditAmount(prev => prev - 10)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 hover:bg-white/10">-10</button>
                                            <input
                                                type="number"
                                                aria-label="Cantidad de ajuste"
                                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xl font-bold text-center text-white focus:outline-none focus:border-white/30"
                                                value={creditAmount}
                                                onChange={e => setCreditAmount(parseInt(e.target.value) || 0)}
                                            />
                                            <button onClick={() => setCreditAmount(prev => prev + 10)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 hover:bg-white/10">+10</button>
                                        </div>
                                        <p className="text-[10px] text-center text-neutral-500 mt-2">
                                            Créditos Finales Resultantes: <span className="font-bold text-white">{Math.max(0, selectedRestaurant.ocr_credits + creditAmount)}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">Motivo (Obligatorio)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                                            placeholder="Ej: Bono de cortesía por problema técnico"
                                            value={reasonConcept}
                                            onChange={e => setReasonConcept(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="p-5 border-t border-white/5 flex items-center justify-end gap-3 bg-neutral-900/50">
                                    <button onClick={() => setActionModals('NONE')} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cancelar</button>
                                    <button disabled={isSubmitting || creditAmount === 0 || !reasonConcept.trim()} onClick={handleCreditAdjust} className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50">
                                        {isSubmitting ? 'Guardando...' : 'Aplicar Ajuste'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* --- MODAL: REGISTER PAYMENT --- */}
                        {actionModals === 'REGISTER_PAYMENT' && (
                            <>
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white text-lg">Registrar Pago Manual</h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    <p className="text-sm text-neutral-400">
                                        Registra pagos recibidos por transferencia o efectivo para <span className="text-white font-bold">{selectedRestaurant.name}</span>.
                                    </p>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">Monto en €</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">€</span>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-lg font-bold text-emerald-400 focus:outline-none focus:border-white/30"
                                                placeholder="0.00"
                                                value={paymentAmount || ''}
                                                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">Concepto (Obligatorio)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                                            placeholder="Ej: Pago subscripción PRO Enero 2026"
                                            value={reasonConcept}
                                            onChange={e => setReasonConcept(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="p-5 border-t border-white/5 flex items-center justify-end gap-3 bg-neutral-900/50">
                                    <button onClick={() => setActionModals('NONE')} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cancelar</button>
                                    <button disabled={isSubmitting || paymentAmount <= 0 || !reasonConcept.trim()} onClick={handlePaymentRegister} className="px-4 py-2 text-sm font-medium bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50">
                                        {isSubmitting ? 'Guardando...' : 'Registrar Cobro'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* --- MODAL: HISTORY --- */}
                        {actionModals === 'HISTORY' && (
                            <>
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white text-lg">Historial: {selectedRestaurant.name}</h3>
                                </div>
                                <div className="p-0 overflow-y-auto max-h-[60vh]">
                                    {history.length === 0 ? (
                                        <div className="p-10 text-center text-neutral-500">No hay registros de facturación.</div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-black/20 sticky top-0 backdrop-blur-md">
                                                <tr className="border-b border-white/5 text-neutral-500 text-left text-xs">
                                                    <th className="px-4 py-2 font-medium">Fecha</th>
                                                    <th className="px-4 py-2 font-medium">Evento</th>
                                                    <th className="px-4 py-2 font-medium">Detalles</th>
                                                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {history.map(evt => (
                                                    <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                                                            {formatDate(evt.created_at)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                                evt.event_type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                    evt.event_type === 'PLAN_CHANGE' ? 'bg-blue-500/10 text-blue-400' :
                                                                        evt.event_type === 'CREDIT_ADJUSTMENT' ? 'bg-amber-500/10 text-amber-400' :
                                                                            'bg-neutral-500/10 text-neutral-400'
                                                            )}>{evt.event_type}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-neutral-300">
                                                            {evt.event_type === 'PLAN_CHANGE' && `Módulos: ${(evt.details.newAddons || []).join(', ') || 'Ninguno'}`}
                                                            {evt.event_type === 'CREDIT_ADJUSTMENT' && `${(evt.details.creditChange || 0) > 0 ? '+' : ''}${evt.details.creditChange || 0}cr: ${evt.details.reason || ''}`}
                                                            {evt.event_type === 'PAYMENT' && evt.details.concept}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {evt.event_type === 'PAYMENT' || evt.event_type === 'PLAN_CHANGE' ? (
                                                                <span className={evt.event_type === 'PAYMENT' ? 'text-emerald-400 font-bold tabular-nums' : 'text-neutral-400 tabular-nums'}>
                                                                    {formatCurrency(evt.amount)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-neutral-500">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="p-4 border-t border-white/5 flex justify-end bg-neutral-900">
                                    <button onClick={() => setActionModals('NONE')} className="px-4 py-2 text-sm font-medium bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">Cerrar</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
