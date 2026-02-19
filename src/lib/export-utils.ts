import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { EXPENSE_CATEGORIES } from './financial-constants'

// Export utilities for expenses
export interface ExpenseExportData {
    date: string
    category: string
    description: string
    provider_detail: string
    amount: number
    tag: string
    payment_method: string
    is_paid: boolean
    taxable_amount?: number
    tax_rate?: number
    tax_amount?: number
    withholding_rate?: number
    withholding_amount?: number
}

export const isPersonalCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.PERSONAL as readonly string[]).includes(category)

export const isCOGSCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.COGS as readonly string[]).includes(category)

export const isInvestmentCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.INVESTMENTS as readonly string[]).includes(category)

export function exportExpensesToCSV(expenses: ExpenseExportData[], filename: string = 'gastos.csv') {
    // Define CSV headers
    const headers = [
        'Fecha',
        'Categoría',
        'Descripción',
        'Proveedor/Detalle',
        'Etiqueta',
        'Importe',
        'Forma de Pago',
        'Estado',
        'Base Imponible',
        'Tipo IVA',
        'Cuota IVA',
        'Retención IRPF',
        'Cuota IRPF'
    ]

    // Convert expenses to CSV rows
    const rows = expenses.map(exp => [
        exp.date,
        exp.category,
        `"${(exp.description || '').replace(/"/g, '""')}"`, // Escape quotes
        `"${(exp.provider_detail || '').replace(/"/g, '""')}"`,
        exp.tag || '',
        exp.amount.toFixed(2),
        exp.payment_method,
        exp.is_paid ? 'Pagado' : 'Pendiente',
        exp.taxable_amount?.toFixed(2) || '',
        exp.tax_rate?.toString() || '',
        exp.tax_amount?.toFixed(2) || '',
        exp.withholding_rate?.toString() || '',
        exp.withholding_amount?.toFixed(2) || ''
    ])

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Create download link
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

interface DailyStats {
    date: string
    cogs?: number
    revenue?: number
    totalSales?: number
    laborCost?: number
    otherExpenses?: number
}

interface PnLData {
    revenue: {
        total: number
        dineIn: number
        takeout: number
        delivery: number
    }
    totalExpenses: number
    netProfit: number
    netProfitMargin: number
    reportExpenses: { id: string; label: string; amount: number; pct: number }[]
    chartData: DailyStats[]
}

// Format currency for PDF/Excel
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)

const formatPct = (value: number) => `${value.toFixed(1)}% `

/**
 * Generates a high-end professional PDF P&L Report
 */
export const exportPnLToPDF = (data: PnLData, period: string, restaurantName: string = 'Mi Restaurante') => {
    const doc = new jsPDF()
    const brandColor = [63, 81, 181] // Indigo

    // --- HEADER WITH LOGO/COLORED BAR ---
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2])
    doc.rect(0, 0, 210, 40, 'F')

    doc.setFontSize(22)
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.text(restaurantName.toUpperCase(), 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`ESTADO DE RESULTADOS (P&L) | ${period}`, 14, 30)
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 170, 30)

    // --- METRIC SUMMARY CARDS ---
    const drawMetricCard = (x: number, y: number, label: string, val: string, isPositive: boolean = true) => {
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(x, y, 60, 25, 3, 3, 'F')
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(label, x + 5, y + 8)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(isPositive ? 40 : 220, 40, 40)
        doc.text(val, x + 5, y + 18)
    }

    drawMetricCard(14, 50, 'INGRESOS TOTALES', formatCurrency(data.revenue.total))
    drawMetricCard(79, 50, 'GASTOS TOTALES', formatCurrency(data.totalExpenses), false)
    drawMetricCard(144, 50, 'BENEFICIO NETO', formatCurrency(data.netProfit), data.netProfit >= 0)

    // --- TABLE DATA ---
    const cogs = data.chartData ? data.chartData.reduce((sum, day) => sum + (day.cogs || 0), 0) : 0
    const grossMargin = data.revenue.total - cogs

    interface TableRow {
        content: string;
        styles?: {
            fontStyle?: 'normal' | 'bold';
            fillColor?: [number, number, number];
            textColor?: [number, number, number];
            fontSize?: number;
            halign?: 'left' | 'center' | 'right';
        };
        colSpan?: number;
    }

    const tableBody: (string | TableRow)[][] = [
        [{ content: 'INGRESOS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, formatCurrency(data.revenue.total), '100%'],
        ['  Ventas Sala/Barra', formatCurrency(data.revenue.dineIn), formatPct((data.revenue.dineIn / data.revenue.total) * 100)],
        ['  Ventas Takeaway/Delivery', formatCurrency(data.revenue.takeout + data.revenue.delivery), formatPct(((data.revenue.takeout + data.revenue.delivery) / data.revenue.total) * 100)],
        [{ content: 'COSTE DE VENTAS (COGS)', styles: { fontStyle: 'bold', textColor: [185, 28, 28] } }, formatCurrency(cogs), formatPct((cogs / data.revenue.total) * 100)],
        [{ content: 'MARGEN BRUTO', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, formatCurrency(grossMargin), formatPct((grossMargin / data.revenue.total) * 100)],
        [{ content: 'GASTOS OPERATIVOS', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] } }],
    ]

    data.reportExpenses.forEach((exp) => {
        tableBody.push([`  ${exp.label}`, formatCurrency(exp.amount), formatPct(exp.pct)])
    })

    tableBody.push([{ content: 'TOTAL GASTOS', styles: { fontStyle: 'bold', textColor: [185, 28, 28] } }, formatCurrency(data.totalExpenses), formatPct((data.totalExpenses / data.revenue.total) * 100)])

    const isProfit = data.netProfit >= 0
    tableBody.push([
        { content: 'RESULTADO NETO (EBITDA)', styles: { fontStyle: 'bold', fontSize: 11, fillColor: isProfit ? [240, 253, 244] : [254, 242, 242], textColor: isProfit ? [21, 128, 61] : [185, 28, 28] } },
        { content: formatCurrency(data.netProfit), styles: { fontStyle: 'bold', fontSize: 11, textColor: isProfit ? [21, 128, 61] : [185, 28, 28] } },
        { content: formatPct((data.netProfit / data.revenue.total) * 100), styles: { fontStyle: 'bold', fontSize: 11, textColor: isProfit ? [21, 128, 61] : [185, 28, 28] } }
    ])

    autoTable(doc, {
        startY: 85,
        head: [['CONCEPTO', 'IMPORTE', '% VENTAS']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: brandColor as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 45, halign: 'right' },
            2: { cellWidth: 35, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [252, 252, 252] }
    })

    doc.save(`Reporte_PnL_${restaurantName.replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.pdf`)
}

/**
 * Generates a detailed Excel Export
 */
export const exportPnLToExcel = (data: PnLData, period: string) => {
    const cogs = data.chartData ? data.chartData.reduce((sum, day) => sum + (day.cogs || 0), 0) : 0
    const grossMargin = data.revenue.total - cogs

    // 1. Prepare Summary Data
    const summaryData = [
        ['Concepto', 'Importe', '% Ventas'],
        ['INGRESOS', data.revenue.total, 1],
        ['COGS', cogs, cogs / data.revenue.total],
        ['MARGEN BRUTO', grossMargin, grossMargin / data.revenue.total],
        ['', '', ''],
        ['GASTOS OPERATIVOS', '', ''],
        ...data.reportExpenses.map((exp) => [exp.label, exp.amount, exp.amount / data.revenue.total]),
        ['TOTAL GASTOS', data.totalExpenses, data.totalExpenses / data.revenue.total],
        ['', '', ''],
        ['NET PROFIT', data.netProfit, data.netProfit / data.revenue.total]
    ]

    // 2. Create Workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(summaryData)

    // 3. Formatting (Basic Widths)
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }]

    // 4. Append Sheet
    XLSX.utils.book_append_sheet(wb, ws, "Estado Resultados")

    // 5. Download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
    saveAs(blob, `PnL_Export_${period.replace(/\s/g, '_')}.xlsx`)
}

/**
 * Generates an aesthetic, premium PDF for a single metric
 */
export const exportMetricToPDF = (
    title: string,
    value: string,
    trend: number,
    data: number[],
    restaurantName: string = 'Mi Restaurante'
) => {
    const doc = new jsPDF()
    const brandColor = [79, 70, 229] // Indigo primary

    // --- HEADER ---
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2])
    doc.rect(0, 0, 210, 40, 'F')

    doc.setFontSize(22)
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.text(restaurantName.toUpperCase(), 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`INFORME DETALLADO: ${title.toUpperCase()}`, 14, 30)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 170, 30)

    // --- KPI CARDS ---
    const maxVal = Math.max(...data)
    const avgVal = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0

    const drawKpiCard = (x: number, y: number, label: string, val: string, trendVal?: number) => {
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(x, y, 45, 30, 3, 3, 'F')
        doc.setFontSize(7)
        doc.setTextColor(107, 114, 128)
        doc.text(label, x + 5, y + 8)
        doc.setFontSize(11)
        doc.setTextColor(31, 41, 55)
        doc.setFont('helvetica', 'bold')
        doc.text(val, x + 5, y + 18)

        if (trendVal !== undefined) {
            doc.setFontSize(8)
            const isPos = trendVal > 0
            doc.setTextColor(isPos ? 22 : 220, isPos ? 163 : 38, isPos ? 74 : 38)
            doc.text(`${isPos ? '↑' : '↓'} ${Math.abs(trendVal)}%`, x + 5, y + 25)
        }
    }

    drawKpiCard(14, 50, 'VALOR ACTUAL', value, trend)
    drawKpiCard(63, 50, 'PROMEDIO DIARIO', formatCurrency(avgVal))
    drawKpiCard(112, 50, 'MÁXIMO PERIODO', formatCurrency(maxVal))
    drawKpiCard(161, 50, 'PUNTOS DE DATOS', data.length.toString())

    // --- DATA TABLE ---
    const tableBody = data.map((val, i) => [`Día ${i + 1}`, formatCurrency(val)])

    autoTable(doc, {
        startY: 90,
        head: [['INTERVALO', 'VALOR REGISTRADO']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: brandColor as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 60, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] }
    })

    // --- FOOTER ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).internal?.getNumberOfPages?.() || 1
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text(`Documento confidencial generado por ControlHub Pro para ${restaurantName}. Página ${i} de ${pageCount}`, 14, 285)
    }

    doc.save(`Reporte_${title.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`)
}
