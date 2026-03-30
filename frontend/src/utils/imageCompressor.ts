import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload.
 * Falls back to the original file if compression fails.
 * 
 * @param file The original image file
 * @param maxSizeMB Maximum size in MB (defaults to 0.15MB / 150KB)
 * @returns A compressed File object
 */
export async function compressImage(file: File, maxSizeMB: number = 0.15): Promise<File> {
    try {
        const options = {
            maxSizeMB,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        // Ensure we return a File object, not just a Blob.
        const renamedFile = new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: Date.now(),
        });
        return renamedFile;
    } catch (error) {
        console.warn("Image compression failed, returning original file...", error);
        return file;
    }
}
