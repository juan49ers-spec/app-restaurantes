import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
        404
      </p>
      <h1 className="text-3xl font-black text-slate-900">
        Página no encontrada
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        La página que buscas no existe o ya no está disponible.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
