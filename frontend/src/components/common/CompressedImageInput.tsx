import React, { InputHTMLAttributes, forwardRef } from 'react';
import { compressImage } from '../../utils/imageCompressor';

export interface CompressedImageInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
    onChange: (file: File | null) => void;
    maxSizeMB?: number;
    onCompressionStart?: () => void;
    onCompressionEnd?: () => void;
}

/**
 * A drop-in replacement for `<input type="file" accept="image/*">` 
 * that automatically compresses images before passing the File object to the parent.
 */
export const CompressedImageInput = forwardRef<HTMLInputElement, CompressedImageInputProps>(({ 
    onChange, 
    maxSizeMB = 0.15, 
    onCompressionStart, 
    onCompressionEnd, 
    accept = "image/*",
    ...props 
}, ref) => {
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            onChange(null);
            return;
        }

        try {
            if (onCompressionStart) onCompressionStart();
            const compressedFile = await compressImage(file, maxSizeMB);
            onChange(compressedFile);
        } catch (error) {
            console.error("Failed to process image:", error);
            onChange(file); // fallback to original
        } finally {
            if (onCompressionEnd) onCompressionEnd();
            // Reset input value so the same file could be selected again if needed
            event.target.value = '';
        }
    };

    return (
        <input
            {...props}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            ref={ref}
        />
    );
});

CompressedImageInput.displayName = 'CompressedImageInput';

export default CompressedImageInput;
