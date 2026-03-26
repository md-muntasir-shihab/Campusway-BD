import { normalizeObjectId, normalizeObjectIdString } from '../../src/cron/dashboardJobs';

describe('dashboardJobs ObjectId normalization', () => {
    const sampleId = '69a32fcd5f716c52881e5cf8';

    test('normalizes malformed stringified array payloads from cron logs', () => {
        const raw = `[ { '"$oid"': '${sampleId}' } ]`;
        expect(normalizeObjectIdString(raw)).toBe(sampleId);
    });

    test('normalizes malformed object payloads with quoted $oid keys', () => {
        const raw = { '"$oid"': sampleId };
        expect(normalizeObjectIdString(raw)).toBe(sampleId);
    });

    test('returns ObjectId instances for recoverable malformed payloads', () => {
        const raw = { '"$oid"': sampleId };
        expect(String(normalizeObjectId(raw))).toBe(sampleId);
    });

    test('rejects null-like or invalid values', () => {
        expect(normalizeObjectIdString(null)).toBeNull();
        expect(normalizeObjectIdString('not-an-object-id')).toBeNull();
        expect(normalizeObjectId('not-an-object-id')).toBeNull();
    });
});
