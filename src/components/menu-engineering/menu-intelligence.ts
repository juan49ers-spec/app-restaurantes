"use client"

import { SimulatedMenuItem } from "./MenuEngineeringContext"

export interface MenuAdvice {
    id: string
    title: string
    description: string
    impact?: string
    actionLabel?: string
    type: 'opportunity' | 'warning' | 'info' | 'success'
    category: 'PRICE' | 'LAYOUT' | 'PROMOTION' | 'RECIPE' | 'PSYCHOLOGY'
    score: number // Priority score (0-100)
}

/**
 * Core Intelligence Engine for Menu Engineering
 * Generates specific, data-driven advice for each menu item.
 */
export const MenuIntelligence = {

    /**
     * Analyzes a single item and returns a list of prioritized advice.
     */
    analyzeItem(item: SimulatedMenuItem, avgMargin: number, avgPopularity: number, allItems: SimulatedMenuItem[] = []): MenuAdvice[] {
        const advice: MenuAdvice[] = []
        const name = item.name || 'Plato'
        const margin = Number(item.contribution_margin)
        const price = Number(item.price)
        const cost = Number(item.cost)
        const foodCostPct = price > 0 ? (cost / price) * 100 : 0
        const classification = item.classification || 'DOG'

        // --- 1. PRICING STRATEGY ---

        // High Food Cost Alert (General)
        if (foodCostPct > 35) {
            advice.push({
                id: `fc-${item.id}`,
                title: `"${name}" — Coste de Materia Prima Crítico`,
                description: `El coste (${foodCostPct.toFixed(1)}%) es peligroso. Reduce la porción o renegocia los ingredientes principales.`,
                impact: "Mejora directa de margen",
                type: 'warning',
                category: 'RECIPE',
                score: 80
            })
        }

        // Star: Premium Pricing Opportunity
        if (classification === 'STAR' && price < avgMargin * 1.5) { // Arbitrary threshold logic
            advice.push({
                id: `star-price-${item.id}`,
                title: `"${name}" — Precio Premium`,
                description: `Es estrella pero con precio contenido. Tienes margen para subirlo sin perder volumen.`,
                impact: `+€${(price * 0.1).toFixed(2)} por plato`,
                actionLabel: "Subir 10%",
                type: 'opportunity',
                category: 'PRICE',
                score: 90
            })
        }

        // Plowhorse: Margin Improvement
        if (classification === 'PLOWHORSE') {
            advice.push({
                id: `plow-margin-${item.id}`,
                title: `"${name}" → Convertir en Estrella`,
                description: `Se vende mucho pero deja poco dinero. Sube el precio o reduce el coste para convertirlo en Estrella.`,
                impact: "Alto impacto en beneficio total",
                type: 'opportunity',
                category: 'PRICE',
                score: 95
            })
        }

        // --- 2. MENU PSYCHOLOGY (NEURO-MARKETING) ---

        // Golden Triangle (Top Right)
        if (classification === 'STAR' || (classification === 'PUZZLE' && margin > avgMargin * 1.2)) {
            advice.push({
                id: `geo-golden-${item.id}`,
                title: `"${name}" — Triángulo de Oro`,
                description: `Coloca "${name}" en la esquina superior derecha de tu carta física. Es donde primero miran los ojos.`,
                type: 'info',
                category: 'LAYOUT',
                score: 70
            })
        }

        // Decoy Pricing (Efecto Señuelo)
        if (classification === 'STAR' && price > avgMargin) {
            advice.push({
                id: `psych-decoy-${item.id}`,
                title: `"${name}" — Efecto Señuelo`,
                description: `Coloca un plato similar pero mucho más caro al lado de "${name}". Hará que parezca una ganga.`,
                type: 'info',
                category: 'PSYCHOLOGY',
                score: 60
            })
        }

        // Visual Highlight (Box/Photo) - For Puzzles (High Margin, Low Sales)
        if (classification === 'PUZZLE') {
            advice.push({
                id: `viz-puzzle-${item.id}`,
                title: `"${name}" — Destacado Visual`,
                description: `"${name}" es muy rentable pero nadie lo pide. Ponle una caja alrededor o una foto profesional en la carta.`,
                impact: "+20% Ventas estimadas",
                type: 'opportunity',
                category: 'PROMOTION',
                score: 85
            })
        }

        // --- 3. INVENTORY & COMBOS ---

        // Dog: Combo Candidate
        if (classification === 'DOG') {
            const pairing = this.suggestPairing(item, allItems)
            const pairingText = pairing ? `Sugerencia: Empaquétalo con "${pairing.recipe?.name}" (Estrella) para traccionar ventas.` : "Únelo a una bebida o entrante popular."

            advice.push({
                id: `dog-combo-${item.id}`,
                title: `"${name}" — Candidato a Combo`,
                description: `"${name}" no se vende solo. ${pairingText}`,
                type: 'warning',
                category: 'PROMOTION',
                score: 50
            })
        }

        return advice.sort((a, b) => b.score - a.score)
    },

    /**
     * Calculates the potential impact of a price change using advanced price elasticity.
     * Includes:
     * - Psychological Barriers (Left-Digit Effect)
     * - Category Sensitivity (Desserts vs Mains)
     * - Anchor Effect (Deviation from category average)
     */
    simulatePriceChange(item: SimulatedMenuItem, newPrice: number, avgCategoryPrice: number = 0): {
        newMargin: number,
        newVolume: number,
        profitChange: number
    } {
        const currentPrice = Number(item.price)
        const currentCost = Number(item.cost)
        const currentVol = Number(item.quantity_sold)

        if (currentPrice === 0) return { newMargin: 0, newVolume: 0, profitChange: 0 }

        const priceChangePct = (newPrice - currentPrice) / currentPrice

        // 1. BASE ELASTICITY
        // Dynamic based on price point (Cheaper = less elastic, Expensive = more elastic)
        let elasticity = -1.2 // Default restaurant elasticity
        if (currentPrice < 8) elasticity = -0.8
        else if (currentPrice > 25) elasticity = -1.8

        // 2. CATEGORY SENSITIVITY
        const cat = item.category?.toUpperCase() || ''
        if (cat.includes('POSTRE') || cat.includes('DESSERT')) elasticity *= 1.2 // High impulse, sensitive
        if (cat.includes('BEBIDA') || cat.includes('DRINK') || cat.includes('WINE')) elasticity *= 1.5 // Very sensitive (commoditized)
        if (cat.includes('PRINCIPAL') || cat.includes('MAIN')) elasticity *= 0.9 // Destination items, less sensitive

        // 3. PSYCHOLOGICAL BARRIERS (The "Left-Digit Effect")
        // Check if we crossed integer thresholds (e.g. 9.90 -> 10.50)
        const oldInteger = Math.floor(currentPrice)
        const newInteger = Math.floor(newPrice)

        // Critical barriers: 10, 15, 20, 25, 30...
        if (newPrice > currentPrice && newInteger > oldInteger) {
            // Crossed a barrier upwards (Bad for demand)
            elasticity *= 1.3 // 30% penalty boost

            // Double penalty for "Decade Crossing" (9->10, 19->20)
            if (newInteger % 10 === 0) elasticity *= 1.2
        }

        // 4. ANCHOR EFFECT (Comparison to Category Average)
        // If pricing way above average, elasticity increases
        if (avgCategoryPrice > 0 && newPrice > avgCategoryPrice * 1.5) {
            elasticity *= 1.15
        }

        const volumeChangePct = priceChangePct * elasticity
        // Volume cannot go below 0
        const newVolume = Math.max(0, currentVol * (1 + volumeChangePct))

        const oldTotalProfit = (currentPrice - currentCost) * currentVol
        const newTotalProfit = (newPrice - currentCost) * newVolume

        return {
            newMargin: newPrice - currentCost,
            newVolume,
            profitChange: newTotalProfit - oldTotalProfit
        }
    },

    /**
     * Finds the best pairing for a "Dog" item to help sell it.
     * Returns a "Star" item to pair it with.
     */
    suggestPairing(dogItem: SimulatedMenuItem, allItems: SimulatedMenuItem[]): SimulatedMenuItem | null {
        // Find a STAR item with high popularity to carry the DOG
        const stars = allItems.filter(i => i.classification === 'STAR')
        if (stars.length === 0) return null

        // Return the most popular Star
        return stars.sort((a, b) => Number(b.quantity_sold) - Number(a.quantity_sold))[0]
    }
}
