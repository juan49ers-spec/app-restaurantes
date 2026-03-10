'use client'

import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserIcon } from 'lucide-react'

export const Header = () => {
    const [user, setUser] = useState<User | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            const { data } = await supabase.auth.getUser()
            setUser(data.user)
        }
        fetchUser()
    }, [])

    const handleLogout = async () => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
            <div className="flex items-center">
                {/* Futuro soporte para Sidebar Móvil (Hambuger menu) */}
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-x-2 text-sm text-gray-600 font-medium">
                    <UserIcon className="w-4 h-4" />
                    {user?.email || 'Cargando...'}
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                    title="Cerrar sesión"
                >
                    <LogOut className="w-5 h-5 text-gray-600" />
                </button>
            </div>
        </div>
    )
}
