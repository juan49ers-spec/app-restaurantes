"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface SmartNumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: number | undefined
    onValueChange: (val: number) => void
    allowNegative?: boolean
}

export function SmartNumberInput({
    value,
    onValueChange,
    allowNegative = false,
    className,
    ...props
}: SmartNumberInputProps) {
    const [localValue, setLocalValue] = useState<string>('')

    // Sync from parent if value changes externally significantly
    useEffect(() => {
        // If undefined or null, treat as empty
        if (value === undefined || value === null) {
            if (localValue !== '') setLocalValue('')
            return
        }

        const normalized = localValue.replace(/,/g, '.')
        const parsedLocal = parseFloat(normalized)
        const isLocalEmpty = localValue === '' || localValue === '-'

        // If parent value matches our parsed local value, do nothing (avoid cursor jumps)
        // If parent value is 0 and we are empty/-, do nothing
        if ((!isNaN(parsedLocal) && parsedLocal === value) || (value === 0 && isLocalEmpty)) {
            return
        }

        // Otherwise, parent changed significantly, sync up
        setLocalValue(value === 0 ? '' : value.toString())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawInput = e.target.value
        setLocalValue(rawInput)

        // Normalize comma to dot for parsing
        const normalized = rawInput.replace(/,/g, '.')

        // Allow negative signs and decimals to be typed without immediate parsing to 0
        if (normalized === '' || (allowNegative && normalized === '-')) {
            onValueChange(0)
            return
        }

        const parsed = parseFloat(normalized)
        if (!isNaN(parsed)) {
            onValueChange(parsed)
        }
    }

    return (
        <Input
            type="text" // Use text to allow full control over symbols
            inputMode="decimal"
            className={className}
            value={localValue}
            onChange={handleChange}
            {...props}
        />
    )
}
