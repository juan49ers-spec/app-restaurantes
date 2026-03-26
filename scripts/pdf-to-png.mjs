/**
 * Worker script que convierte un PDF a PNG.
 * Ejecutado como proceso hijo de Node.js puro.
 * 
 * Uso: node pdf-to-png.mjs <input.pdf> <output.png> [scale]
 */

import { readFileSync, writeFileSync } from 'fs';

const [,, inputPath, outputPath, scaleStr] = process.argv;
const scale = parseFloat(scaleStr) || 2.0;

if (!inputPath || !outputPath) {
    console.error('Uso: node pdf-to-png.mjs <input.pdf> <output.png> [scale]');
    process.exit(1);
}

try {
    const { renderPageAsImage } = await import('unpdf');
    
    const pdfBuffer = readFileSync(inputPath);
    console.log(`Leyendo PDF: ${pdfBuffer.length} bytes`);
    
    const result = await renderPageAsImage(
        new Uint8Array(pdfBuffer),
        1,
        { scale, canvasImport: () => import('@napi-rs/canvas') }
    );
    
    const outputBuffer = Buffer.from(result);
    writeFileSync(outputPath, outputBuffer);
    console.log(`[Worker] PNG generado: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
