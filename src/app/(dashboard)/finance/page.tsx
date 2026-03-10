export default function FinanceDashboard() {
    return (
        <div className="flex flex-col gap-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finanzas</h1>
            <p className="text-gray-500">Módulo de ventas, facturación y márgenes operativos.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                {/* Placeholder cards */}
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-32 flex items-center justify-center text-gray-400">Card 1</div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-32 flex items-center justify-center text-gray-400">Card 2</div>
            </div>
        </div>
    )
}
