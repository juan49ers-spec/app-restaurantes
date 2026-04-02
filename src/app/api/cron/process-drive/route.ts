import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listFilesInFolder, downloadFile, moveFile, getOrCreateDateFolder } from '@/lib/google-drive';
import { extractInvoiceData } from '@/lib/invoice-extractor';
import { extractMonthlyReport, reportToOperatingExpenses, reportToDailySalesSummary } from '@/lib/report-extractor';

// Usar el cliente admin porque esto corre en background (cron) sin usuario autenticado
const getSupabaseAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const maxDuration = 300; // 5 minutos máximo para Vercel Functions
// export const dynamic = 'force-dynamic'; // Asegura que siempre se ejecute si es llamado

export async function GET(request: Request) {
    // 1. Verificación de seguridad del Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Permitir ejecución manual en local si no hay secreto configurado, pero bloquear en prod
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        console.log('[DRIVE-SYNC] Iniciando sincronización de Inboxes...');

        // 2. Obtener TODAS las configuraciones activas de restaurantes
        const { data: configs, error: configError } = await getSupabaseAdmin()
            .from('drive_sync_config')
            .select(`
                id, restaurant_id, inbox_folder_id, processed_folder_id, review_folder_id
            `)
            .eq('is_active', true);

        if (configError) throw configError;

        if (!configs || configs.length === 0) {
            return NextResponse.json({ message: 'No active Google Drive configurations found.' });
        }

        const results = [];

        // 3. Procesar iterativamente cada restaurante
        for (const config of configs) {
            console.log(`[DRIVE-SYNC] Revisando inbox para restaurante ${config.restaurant_id}...`);
            let processedCount = 0;
            let reviewCount = 0;
            let errorCount = 0;

            try {
                // a. Listar archivos nuevos
                const files = await listFilesInFolder(config.inbox_folder_id);

                for (const file of files) {
                    try {
                        console.log(`[DRIVE-SYNC] Procesando archivo: ${file.name} (${file.id})`);

                        // b. Descargar contenido
                        const { buffer, mimeType } = await downloadFile(file.id);

                        // b2. Detectar si es un informe mensual PDF (por nombre o contenido)
                        const isMonthlyReport = mimeType === 'application/pdf' && (
                            /informe/i.test(file.name) ||
                            /reporte?\s*(mensual|de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))/i.test(file.name)
                        );

                        if (isMonthlyReport) {
                            console.log(`[DRIVE-SYNC] Detectado informe mensual: ${file.name}`);
                            const reportResult = await extractMonthlyReport(buffer, file.name);

                            if (reportResult.success && reportResult.data) {
                                const report = reportResult.data;
                                const expenses = reportToOperatingExpenses(report, config.restaurant_id);
                                const salesSummary = reportToDailySalesSummary(report, config.restaurant_id);

                                let reportErrors: string[] = [];

                                if (expenses.length > 0) {
                                    const { error: expErr } = await getSupabaseAdmin()
                                        .from('operating_expenses')
                                        .insert(expenses);
                                    if (expErr) reportErrors.push(`Expenses: ${expErr.message}`);
                                }

                                const { error: salesErr } = await getSupabaseAdmin()
                                    .from('daily_sales')
                                    .insert(salesSummary);
                                if (salesErr) reportErrors.push(`Sales: ${salesErr.message}`);

                                // Log in report_imports
                                try {
                                    await getSupabaseAdmin().from('report_imports').insert({
                                        restaurant_id: config.restaurant_id,
                                        month_key: report.month,
                                        file_name: file.name,
                                        source: 'drive',
                                        status: reportErrors.length === 0 ? 'completed' : 'partial',
                                        confidence: report.confidence,
                                        expenses_inserted: expenses.length,
                                        sales_inserted: !salesErr,
                                        extracted_data: report,
                                        drive_file_id: file.id,
                                        errors: reportErrors.length > 0 ? reportErrors : null,
                                    });
                                } catch { /* table may not exist */ }

                                // Move to processed
                                const today = new Date();
                                const targetFolder = await getOrCreateDateFolder(config.processed_folder_id, today);
                                await moveFile(file.id, config.inbox_folder_id, targetFolder);
                                processedCount++;
                            } else {
                                // Failed extraction → move to review
                                await moveFile(file.id, config.inbox_folder_id, config.review_folder_id);
                                reviewCount++;
                            }
                            continue; // Skip normal invoice processing
                        }

                        // c. Extraer datos con LLM Vision (facturas individuales)
                        const extraction = await extractInvoiceData(buffer, mimeType, file.name);

                        // Preparar registro base de Invoice
                        const invoiceRecord: Record<string, unknown> = {
                            restaurant_id: config.restaurant_id,
                            drive_file_id: file.id,
                            drive_file_name: file.name,
                            file_url: `https://drive.google.com/file/d/${file.id}/view`,
                            created_at: new Date().toISOString()
                        };

                        if (extraction.success && extraction.data) {
                            const data = extraction.data;
                            invoiceRecord.extracted_data = data;
                            invoiceRecord.confidence_score = data.confidence;
                            invoiceRecord.invoice_number = data.invoice_number;
                            invoiceRecord.date = data.date;
                            invoiceRecord.total_amount = data.total;

                            // Evaluar umbral de confianza
                            if (data.confidence >= 0.7) {
                                invoiceRecord.status = 'completed';

                                // INSERTAR EN TABLA CORRESPONDIENTE
                                if (data.type === 'GASTO') {
                                    const { error: insertError } = await getSupabaseAdmin()
                                        .from('operating_expenses')
                                        .insert({
                                            restaurant_id: config.restaurant_id,
                                            expense_date: data.date,
                                            category: data.expense_category || 'OTROS',
                                            amount: data.total,
                                            taxable_amount: data.subtotal,
                                            tax_rate: data.tax_rate,
                                            tax_amount: data.tax_amount,
                                            description: `Factura ${data.invoice_number || 'S/N'}`,
                                            provider_detail: data.supplier_name,
                                            payment_method: data.payment_method || 'bank',
                                            is_paid: true // Asumimos pagado si está facturado, o debería ir a cuentas por pagar
                                        });
                                    if (insertError) throw new Error(`DB Insert Error (Expense): ${insertError.message}`);
                                } else if (data.type === 'VENTA') {
                                    const { error: insertError } = await getSupabaseAdmin()
                                        .from('daily_sales')
                                        .insert({
                                            restaurant_id: config.restaurant_id,
                                            date: data.date,
                                            revenue_total: data.subtotal, // Usar base imponible
                                            iva_collected: data.tax_amount,
                                            source: 'Drive Upload'
                                        });
                                    if (insertError) throw new Error(`DB Insert Error (Sale): ${insertError.message}`);
                                }

                                // Mover archivo a PROCESADAS/{año}/{mes}
                                const today = new Date();
                                const targetFolder = await getOrCreateDateFolder(config.processed_folder_id, today);
                                await moveFile(file.id, config.inbox_folder_id, targetFolder);
                                processedCount++;

                            } else {
                                // Confianza baja -> Requiere revisión manual
                                invoiceRecord.status = 'review_required';
                                invoiceRecord.processing_error = 'Low confidence score requiring manual review.';

                                // Mover a REVISION
                                await moveFile(file.id, config.inbox_folder_id, config.review_folder_id);
                                reviewCount++;
                            }
                        } else {
                            // Falla la extracción completamente
                            invoiceRecord.status = 'error';
                            invoiceRecord.processing_error = extraction.error || 'Unknown extraction error';

                            // Mover a REVISION
                            await moveFile(file.id, config.inbox_folder_id, config.review_folder_id);
                            errorCount++;
                        }

                        // Guardar el registro de log de la factura
                        await getSupabaseAdmin().from('invoices').insert(invoiceRecord);

                    } catch (fileErr) {
                        const err = fileErr as Error;
                        console.error(`[DRIVE-SYNC] Error con archivo ${file.id}:`, err);
                        errorCount++;
                        // Intentar registrar el error crítico si es posible
                        try {
                            await getSupabaseAdmin().from('invoices').insert({
                                restaurant_id: config.restaurant_id,
                                drive_file_id: file.id,
                                drive_file_name: file.name,
                                status: 'error',
                                processing_error: `Crash: ${err.message}`
                            });
                        } catch { /* ignore */ }
                        
                        // Intentar mover a revisión
                        try {
                            await moveFile(file.id, config.inbox_folder_id, config.review_folder_id);
                        } catch { /* ignore */ }
                    }
                } // Fin for de archivos

                // Update last_sync_at
                await getSupabaseAdmin()
                    .from('drive_sync_config')
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq('id', config.id);

                results.push({
                    restaurant_id: config.restaurant_id,
                    success: true,
                    processed: processedCount,
                    review: reviewCount,
                    errors: errorCount
                });

            } catch (restErr) {
                const err = restErr as Error;
                console.error(`[DRIVE-SYNC] Error procesando restaurante ${config.restaurant_id}:`, err);
                results.push({
                    restaurant_id: config.restaurant_id,
                    success: false,
                    error: err.message
                });
            }
        } // Fin for configs restaurantes

        return NextResponse.json({
            message: 'Sync completed',
            results
        });

    } catch (error) {
        const err = error as Error;
        console.error('[DRIVE-SYNC] Critical Failure:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
