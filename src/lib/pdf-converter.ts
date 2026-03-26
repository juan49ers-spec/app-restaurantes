/**
 * PDF → PNG Converter
 * 
 * Contorno del problema de bundling de Next.js: ejecuta la conversión
 * en un proceso hijo de Node.js puro donde `@napi-rs/canvas` y `unpdf`
 * funcionan sin problemas de bundling.
 */

import { execFile } from 'child_process';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * Convierte la primera página de un PDF a un buffer PNG.
 * Ejecuta la conversión en un subproceso Node.js para evitar
 * problemas de bundling de Next.js/Turbopack con módulos nativos.
 */
export async function convertPdfToImage(
    pdfBuffer: Buffer,
    scale: number = 2.0
): Promise<Buffer> {
    const id = randomUUID();
    const tmpPdf = join(tmpdir(), `pdf-in-${id}.pdf`);
    const tmpPng = join(tmpdir(), `pdf-out-${id}.png`);
    
    try {
        // Escribir PDF temporal
        writeFileSync(tmpPdf, pdfBuffer);
        console.log(`[PDF→PNG] PDF temporal: ${tmpPdf} (${pdfBuffer.length} bytes)`);
        
        // Ejecutar conversión en proceso hijo de Node.js puro
        // Usar import.meta.url para obtener la ruta del script relativa al archivo actual
        const scriptsDir = join(process.cwd(), 'scripts');
        const scriptPath = join(scriptsDir, 'pdf-to-png.mjs');
        
        await new Promise<void>((resolve, reject) => {
            execFile('node', [scriptPath, tmpPdf, tmpPng, String(scale)], {
                timeout: 30000,
            }, (error, stdout, stderr) => {
                if (stdout) console.log('[PDF→PNG worker]', stdout);
                if (stderr) console.error('[PDF→PNG worker err]', stderr);
                if (error) {
                    reject(new Error(`PDF conversion failed: ${error.message}`));
                } else {
                    resolve();
                }
            });
        });
        
        // Leer PNG resultado
        const pngBuffer = readFileSync(tmpPng);
        console.log(`[PDF→PNG] PNG generado: ${pngBuffer.length} bytes`);
        return pngBuffer;
        
    } finally {
        // Limpiar temporales
        try { unlinkSync(tmpPdf); } catch { /* ignore */ }
        try { unlinkSync(tmpPng); } catch { /* ignore */ }
    }
}
