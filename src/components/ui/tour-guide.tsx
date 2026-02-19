'use client'

import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useRouter, usePathname } from 'next/navigation'
import { SCENARIOS } from '@/lib/tour-scenarios'

interface TourGuideProps {
    scenarioId: string | null
    onClose: () => void
}

export function TourGuide({ scenarioId, onClose }: TourGuideProps) {
    const router = useRouter()
    const pathname = usePathname()
    const driverObj = useRef<import('driver.js').Driver | null>(null)

    useEffect(() => {
        if (!scenarioId) return

        const scenario = SCENARIOS.find(s => s.id === scenarioId)
        if (!scenario) return

        // Route check
        if (pathname !== scenario.startUrl) {
            router.push(scenario.startUrl)
            // Wait for navigation before starting (simple timeout for simplicity in this MVP)
            setTimeout(() => startTour(scenario.steps), 500)
        } else {
            startTour(scenario.steps)
        }

        function startTour(steps: import('driver.js').DriveStep[]) {
            driverObj.current = driver({
                showProgress: true,
                steps: steps,
                onDestroyStarted: () => {
                    driverObj.current?.destroy()
                    onClose()
                },
                popoverClass: 'driverjs-theme',
                nextBtnText: 'Siguiente',
                prevBtnText: 'Anterior',
                doneBtnText: 'Hecho',
            })

            driverObj.current.drive()
        }

        return () => {
            if (driverObj.current) {
                driverObj.current.destroy()
            }
        }
    }, [scenarioId, router, pathname, onClose])

    return null // Logic only component
}
