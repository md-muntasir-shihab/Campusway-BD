type DownloadableResponse =
    | Blob
    | ArrayBuffer
    | ArrayBufferView
    | string
    | {
        data: Blob | ArrayBuffer | ArrayBufferView | string;
        headers?: Record<string, unknown> | { get?: (name: string) => unknown };
    };

type DownloadOptions = {
    filename?: string;
    contentType?: string;
};

type HeaderBag = Record<string, unknown> | { get?: (name: string) => unknown } | undefined;

function getHeader(headers: HeaderBag, key: string): string {
    if (!headers) return '';
    if (typeof (headers as { get?: (name: string) => unknown }).get === 'function') {
        const viaGet = (headers as { get: (name: string) => unknown }).get(key);
        if (typeof viaGet === 'string') return viaGet;
    }
    const direct = (headers as Record<string, unknown>)[key];
    if (typeof direct === 'string') return direct;
    const lowerKey = key.toLowerCase();
    const entry = Object.entries(headers as Record<string, unknown>).find(([headerKey]) => headerKey.toLowerCase() === lowerKey);
    return typeof entry?.[1] === 'string' ? entry[1] : '';
}

function extFromContentType(contentType?: string): string {
    const value = String(contentType || '').toLowerCase();
    if (value.includes('text/csv')) return 'csv';
    if (value.includes('spreadsheetml') || value.includes('application/vnd.ms-excel')) return 'xlsx';
    if (value.includes('application/pdf')) return 'pdf';
    if (value.includes('application/json')) return 'json';
    if (value.includes('text/plain')) return 'txt';
    return 'bin';
}

export function getFilenameFromDisposition(disposition?: string): string {
    const raw = String(disposition || '').trim();
    if (!raw) return '';

    const utf8Match = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1].replace(/^["']|["']$/g, ''));
        } catch {
            return utf8Match[1].replace(/^["']|["']$/g, '');
        }
    }

    const quotedMatch = raw.match(/filename\s*=\s*"([^"]+)"/i);
    if (quotedMatch?.[1]) return quotedMatch[1];

    const plainMatch = raw.match(/filename\s*=\s*([^;]+)/i);
    return plainMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || '';
}

function toBlob(data: Blob | ArrayBuffer | ArrayBufferView | string, contentType?: string): Blob {
    if (data instanceof Blob) return data;
    if (ArrayBuffer.isView(data)) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        return new Blob([bytes as unknown as BlobPart], { type: contentType || 'application/octet-stream' });
    }
    return new Blob([data], { type: contentType || 'application/octet-stream' });
}

export function downloadFile(input: DownloadableResponse, options: DownloadOptions = {}): string {
    const payload = typeof input === 'object' && input !== null && 'data' in input
        ? input
        : { data: input };
    const headers = payload.headers as HeaderBag;
    const contentType = options.contentType || getHeader(headers, 'content-type') || undefined;
    const filename = options.filename
        || getFilenameFromDisposition(getHeader(headers, 'content-disposition'))
        || `download.${extFromContentType(contentType)}`;
    const blob = toBlob(payload.data, contentType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return filename;
}
