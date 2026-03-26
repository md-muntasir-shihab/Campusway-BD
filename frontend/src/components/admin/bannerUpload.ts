import { adminSignBannerUpload } from '../../services/api';

export async function uploadSignedBannerAsset(file: File): Promise<string> {
    const { data: signed } = await adminSignBannerUpload(file.name, file.type || 'application/octet-stream');

    if (signed.provider === 's3' && signed.method === 'PUT') {
        const response = await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: signed.headers || { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
        });
        if (!response.ok) {
            throw new Error('S3 upload failed');
        }
        return signed.publicUrl;
    }

    const token = sessionStorage.getItem('campusway-token') || localStorage.getItem('campusway-token') || '';
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(signed.uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
    });
    if (!response.ok) {
        throw new Error('Local upload failed');
    }
    const result = await response.json();
    const uploadedUrl = String(result?.url || signed.publicUrl || '').trim();
    if (!uploadedUrl) {
        throw new Error('Upload URL missing');
    }
    return uploadedUrl;
}
