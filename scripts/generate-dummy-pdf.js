const fs = require('fs');

const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
50 700 Td
(Factura Demo: INV-DEMO-001) Tj
0 -40 Td
(Proveedor: Suministros Hosteleros Pepe SL) Tj
0 -40 Td
(Fecha: 25/11/2023) Tj
0 -60 Td
(10x Tomates Pera - 1.50 EUR/ud - Total: 15.00 EUR) Tj
0 -40 Td
(5x Aceite Oliva 5L - 25.00 EUR/ud - Total: 125.00 EUR) Tj
0 -60 Td
(Total Factura: 140.00 EUR) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000219 00000 n
0000000466 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

fs.writeFileSync('C:\\Users\\Usuario\\.gemini\\antigravity\\playground\\app finanzas restaurante\\dummy_invoice.pdf', pdfContent);
console.log('Dummy PDF created successfully.');
