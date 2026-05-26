import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const restaurant = await getCurrentRestaurant()
  if (!restaurant) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/portal" className="text-sm font-semibold text-slate-950">
            Portal cliente
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <Link href="/portal" className="hover:text-slate-950">Inicio</Link>
            <Link href="/reports" className="hover:text-slate-950">Volver a ControlHub</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">
          {restaurant.name} · Área cliente ControlHub · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
