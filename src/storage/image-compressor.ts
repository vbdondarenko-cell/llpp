// Image Compressor Module
// Production-ready image compression for event uploads

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  mimeType: string;
}

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

export class ImageCompressor {
  private options: CompressionOptions;

  constructor(options: Partial<CompressionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Compress an image file
   */
  async compress(file: File): Promise<CompressedImage> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const { maxWidth, maxHeight } = this.options;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Apply blur for placeholder effect during upload
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size,
                mimeType: this.options.mimeType,
              });
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          this.options.mimeType,
          this.options.quality
        );

        // Clean up
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compress multiple images
   */
  async compressMultiple(files: File[]): Promise<CompressedImage[]> {
    return Promise.all(files.map((file) => this.compress(file)));
  }

  /**
   * Validate file before compression
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 10 MB',
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName: string, mimeType: string): string {
    const uuid = this.generateUUID();
    const ext = this.getExtension(mimeType);
    const sanitized = this.sanitizeFilename(originalName);
    const timestamp = Date.now();
    return `${uuid}-${timestamp}-${sanitized}.${ext}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return map[mimeType.toLowerCase()] || 'jpg';
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄүҮөӨ]/g, '-') // Replace special chars
      .replace(/-+/g, '-') // Replace multiple dashes
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      .substring(0, 50); // Limit length
  }
}

// Singleton instance
export const imageCompressor = new ImageCompressor();
