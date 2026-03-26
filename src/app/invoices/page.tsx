import { getInvoices } from "@/app/actions/invoices"
import { InvoiceDashboard } from "@/components/invoices/InvoiceDashboard"

export default async function InvoicesPage() {
    const invoices = await getInvoices()

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <InvoiceDashboard invoices={invoices} />
        </div>
    )
}
