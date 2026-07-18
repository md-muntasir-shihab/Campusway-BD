import ExcelJS from 'exceljs';

/**
 * Parse an Excel buffer into an array of row objects (header → value).
 * Drop-in replacement for `XLSX.read` + `sheet_to_json` pattern.
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
    });

    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData: Record<string, unknown> = {};
        headers.forEach(h => { if (h) rowData[h] = ''; });
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = headers[colNumber];
            if (!header) return;
            let val: unknown = cell.value;
            if (val && typeof val === 'object' && 'formula' in (val as Record<string, unknown>)) {
                val = (val as { result?: unknown }).result;
            }
            rowData[header] = val ?? '';
        });
        rows.push(rowData);
    });
    return rows;
}

/**
 * Convert an array of row objects into an Excel (.xlsx) buffer.
 * Drop-in replacement for `XLSX.utils.json_to_sheet` + `XLSX.write` pattern.
 */
export async function rowsToExcelBuffer(
    rows: Record<string, unknown>[],
    sheetName = 'Sheet1',
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    if (rows.length > 0) {
        worksheet.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 18 }));
        rows.forEach(r => worksheet.addRow(r));
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
}

/**
 * Convert an array of row objects into a CSV buffer.
 * Drop-in replacement for `XLSX.utils.sheet_to_csv` pattern.
 */
export async function rowsToCsvBuffer(rows: Record<string, unknown>[], sheetName = 'Sheet1'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    if (rows.length > 0) {
        worksheet.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 18 }));
        rows.forEach(r => worksheet.addRow(r));
    }
    const buf = await workbook.csv.writeBuffer();
    return Buffer.from(buf);
}
