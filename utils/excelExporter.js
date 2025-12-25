const ExcelJS = require('exceljs');

async function exportToExcel(data, columns, worksheetName = 'Data') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 20
    }));

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    worksheet.addRows(data);

    // Create buffer
    return await workbook.xlsx.writeBuffer();
}

module.exports = { exportToExcel };
