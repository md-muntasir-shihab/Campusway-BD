/**
 * Converts an Excel serial date number to a JavaScript Date object.
 * Excel serial dates count days from 1900-01-01 (with the Lotus 1-2-3 bug
 * that treats 1900 as a leap year). This helper handles the standard
 * conversion used by most spreadsheet applications.
 */
export function excelSerialToDate(serial: number): Date {
    const UTC_DAYS_TO_1970 = 25569;
    const MILLISECONDS_IN_DAY = 86400000;
    const ms = Math.round((serial - UTC_DAYS_TO_1970) * MILLISECONDS_IN_DAY);
    return new Date(ms);
}
