const PDFDocument = require('pdfkit');

function exportToPDF(data, columns, title, res) {
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(res);

    // Font setup for Arabic support is tricky without fonts provided
    // For this prototype, we'll try to use a standard font or just ASCII to verify functionality
    // In production with Arabic content, we MUST register a font like 'Cairo'
    // doc.font('path/to/font.ttf');

    // Title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Table Header parameters
    const startX = 50;
    let currentY = doc.y;
    const colWidth = 150;

    // Draw Headers
    doc.fontSize(12);
    columns.forEach((col, i) => {
        doc.text(col.header, startX + (i * colWidth), currentY, { width: colWidth, align: 'left' });
    });

    doc.moveDown();
    doc.moveTo(startX, doc.y).lineTo(550, doc.y).stroke();
    currentY = doc.y + 10;

    // Draw Rows
    doc.fontSize(10);
    data.forEach(row => {
        if (currentY > 700) { // New page
            doc.addPage();
            currentY = 50;
        }

        columns.forEach((col, i) => {
            const val = row[col.key] ? String(row[col.key]) : '-';
            doc.text(val, startX + (i * colWidth), currentY, { width: colWidth, align: 'left' });
        });
        currentY += 20;
    });

    doc.end();
}

module.exports = { exportToPDF };
