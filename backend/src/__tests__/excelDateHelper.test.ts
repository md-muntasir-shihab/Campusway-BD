import { expect, test } from 'vitest';
import { excelSerialToDate } from '../utils/excelDateHelper';

test('converts Excel serial number to JavaScript Date', () => {
    const serial = 44197; // 2021-01-01
    const result = excelSerialToDate(serial);
    expect(result.getFullYear()).toBe(2021);
    expect(result.getMonth()).toBe(0); // Jan is 0
    expect(result.getDate()).toBe(1);
});
