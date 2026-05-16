import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage } from '../imageCompressor';
import imageCompression from 'browser-image-compression';

vi.mock('browser-image-compression', () => {
    return {
        default: vi.fn(),
    };
});

describe('compressImage', () => {
    const mockFile = new File(['mock content'], 'test.png', { type: 'image/png' });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully compress an image and return a new File', async () => {
        const compressedBlob = new Blob(['compressed content'], { type: 'image/png' });
        vi.mocked(imageCompression).mockResolvedValue(compressedBlob as File);

        const result = await compressImage(mockFile, 0.15);

        expect(imageCompression).toHaveBeenCalledWith(mockFile, {
            maxSizeMB: 0.15,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        });
        expect(result).toBeInstanceOf(File);
        expect(result.name).toBe('test.png');
        expect(result.type).toBe('image/png');
        expect(result).not.toBe(mockFile); // Should be a new File object
    });

    it('should fallback to original file and log a warning if compression fails', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockError = new Error('Compression failed');
        vi.mocked(imageCompression).mockRejectedValue(mockError);

        const result = await compressImage(mockFile);

        expect(imageCompression).toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Image compression failed, returning original file...',
            mockError
        );
        expect(result).toBe(mockFile); // Should return the exact same original file

        consoleWarnSpy.mockRestore();
    });
});
