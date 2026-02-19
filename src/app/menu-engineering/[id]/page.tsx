import { getMenuReport } from "@/app/actions/menu-engineering"
import ReportDetailClient from "./client"
import { notFound } from "next/navigation"

interface Props {
    params: Promise<{
        id: string
    }>
}

export default async function MenuReportPage({ params }: Props) {
    const { id } = await params
    const report = await getMenuReport(id)

    if (!report) {
        notFound()
    }

    return (
        <div className="container mx-auto py-8 max-w-7xl">
            <ReportDetailClient report={report} />
        </div>
    )
}
