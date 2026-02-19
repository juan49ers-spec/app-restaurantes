import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold tracking-tight">ControlHub</span>
                    <span className="bg-red-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Super Admin</span>
                </div>
                <div className="text-sm text-slate-400">
                    Restricted Access
                </div>
            </header>
            <main className="container mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    )
}
