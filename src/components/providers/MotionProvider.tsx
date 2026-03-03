"use client"

import { LazyMotion, domAnimation } from "framer-motion"
import { ReactNode } from "react"

/**
 * LazyMotion provider that loads only the `domAnimation` feature set.
 * This reduces the framer-motion bundle from ~33KB to ~17KB by excluding
 * layout animations, SVG path animations, and other rarely-used features.
 * 
 * Wrap the entire app with this provider so all `m.*` components
 * can access animation features without each importing the full bundle.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    )
}
