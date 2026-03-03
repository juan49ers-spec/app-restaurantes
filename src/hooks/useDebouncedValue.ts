import { useState, useEffect, useRef } from "react"

/**
 * Hook que retorna un valor con debounce.
 * Útil para inputs de búsqueda que filtran listas grandes:
 * evita re-render en cada keystroke y solo actualiza tras la pausa.
 * 
 * @example
 * const [search, setSearch] = useState("")
 * const debouncedSearch = useDebouncedValue(search, 300)
 * const filtered = items.filter(i => i.name.includes(debouncedSearch))
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        timerRef.current = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [value, delay])

    return debouncedValue
}
