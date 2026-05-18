'use server'

import { createClient } from "@/lib/supabaseServer"
import { verifyRestaurantAccess } from "@/lib/verify-access"
import { subDays, getDay } from "date-fns"

// Realistic Staff Profiles
const MOCK_EMPLOYEES = [
    { first_name: 'Carlos', last_name: 'Gomez', role: 'manager', hourly_rate: 18.5 },
    { first_name: 'Lucia', last_name: 'Fernandez', role: 'chef', hourly_rate: 16.0 },
    { first_name: 'Marco', last_name: 'Rossi', role: 'chef', hourly_rate: 15.0 },
    { first_name: 'Sofia', last_name: 'Perez', role: 'waiter', hourly_rate: 12.0 },
    { first_name: 'David', last_name: 'Ruiz', role: 'waiter', hourly_rate: 12.0 },
    { first_name: 'Elena', last_name: 'Mayor', role: 'waiter', hourly_rate: 12.0 },
    { first_name: 'Pablo', last_name: 'Sanz', role: 'bartender', hourly_rate: 13.5 },
    { first_name: 'Ana', last_name: 'Torres', role: 'kitchen_porter', hourly_rate: 10.5 },
]

export async function seedShiftsAndEmployees(restaurantId: string) {
    await verifyRestaurantAccess(restaurantId)
    const supabase = await createClient()

    console.log(`🌱 Seeding Operations data for restaurant: ${restaurantId}`)

    // 1. Clean previous data (Optional: typically we'd check if exists, but for seed we reset)
    // Be careful in prod, but this is a seed tool.
    // For safety, let's just delete if we are re-seeding the same restaurant
    await supabase.from('shifts').delete().eq('restaurant_id', restaurantId)
    await supabase.from('employees').delete().eq('restaurant_id', restaurantId)

    // 2. Create Employees
    const employeesMap = new Map<string, string>() // ID -> Role
    const employeeIds: { id: string; role: string; hourly_rate: number }[] = []

    for (const emp of MOCK_EMPLOYEES) {
        const { data, error } = await supabase.from('employees').insert({
            restaurant_id: restaurantId,
            ...emp
        }).select().single()

        if (error) {
            console.error("Error creating employee:", error)
            continue
        }

        employeesMap.set(data.role, data.id) // Simple map, stores last one of role. 
        // Better: store in array
        employeeIds.push(data)
    }

    // 3. Generate Shifts for last 30 days
    const today = new Date()
    const shiftsToInsert = []

    for (let i = 0; i < 30; i++) {
        const date = subDays(today, i)
        const dayOfWeek = getDay(date) // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
        const isClosed = dayOfWeek === 1 // Monday closed

        if (isClosed) continue

        // Logic: Weekend = More Staff, More Hours

        // MANAGER (Always there)
        const manager = employeeIds.find(e => e.role === 'manager')
        if (manager) {
            shiftsToInsert.push(createShift(restaurantId, manager, date, 11, 23)) // 12h shift
        }

        // CHEFS
        const chefs = employeeIds.filter(e => e.role === 'chef')
        if (chefs.length > 0) {
            shiftsToInsert.push(createShift(restaurantId, chefs[0], date, 10, 16)) // Morning
            shiftsToInsert.push(createShift(restaurantId, chefs[0], date, 19, 23)) // Night split
            if (isWeekend && chefs[1]) {
                shiftsToInsert.push(createShift(restaurantId, chefs[1], date, 12, 24)) // Support
            }
        }

        // WAITERS
        const waiters = employeeIds.filter(e => e.role === 'waiter')
        // Weekday: 1 waiter lunch, 2 dinner. Weekend: 2 lunch, 3 dinner.
        if (waiters.length > 0) {
            // Lunch
            shiftsToInsert.push(createShift(restaurantId, waiters[0], date, 12, 17))
            if (isWeekend && waiters[1]) shiftsToInsert.push(createShift(restaurantId, waiters[1], date, 13, 17))

            // Dinner (INEFFICIENCY TRAP: Ensure we overstaff Tuesdays for the "Teaser")
            if (dayOfWeek === 2) { // Tuesday
                // Trap: 3 waiters on a slow Tuesday
                waiters.forEach(w => shiftsToInsert.push(createShift(restaurantId, w, date, 19, 23)))
            } else {
                shiftsToInsert.push(createShift(restaurantId, waiters[0], date, 20, 24))
                if (isWeekend) {
                    waiters.slice(1).forEach(w => shiftsToInsert.push(createShift(restaurantId, w, date, 20, 0.5))) // Until 00:30
                }
            }
        }
    }

    if (shiftsToInsert.length > 0) {
        const { error } = await supabase.from('shifts').insert(shiftsToInsert)
        if (error) console.error("Error inserting shifts:", error)
        else console.log(`✅ Automatically scheduled ${shiftsToInsert.length} shifts.`)
    }
}

function createShift(restaurantId: string, employee: { id: string; hourly_rate: number }, date: Date, startHour: number, endHour: number) {
    const start = new Date(date)
    start.setHours(startHour, 0, 0, 0)

    const end = new Date(date)
    if (endHour < startHour) {
        end.setDate(end.getDate() + 1) // Next day (e.g. 00:30)
    }
    // Handle decimal hours (e.g. 0.5 = 30 mins)
    const h = Math.floor(endHour)
    const m = (endHour - h) * 60
    end.setHours(h, m, 0, 0)

    // Calculate cost
    const hours = (end.getTime() - start.getTime()) / 3600000
    const cost = hours * employee.hourly_rate

    return {
        restaurant_id: restaurantId,
        employee_id: employee.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        break_minutes: hours > 6 ? 30 : 0,
        estimated_cost: cost,
        status: 'completed'
    }
}
