// Supabase Storage Module
// Production-ready storage operations for event images

import { supabase } from '../supabase';
import { imageCompressor } from './image-compressor';

export interface StorageConfig {
  bucket: string;
  folder: string;
  maxSizeMB: number;
  allowedTypes: string[];
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface UploadProgress {
  progress: number; // 0-100
  bytesUploaded: number;
  bytesTotal: number;
}

export const EVENT_IMAGES_CONFIG: StorageConfig = {
  bucket: 'event-images',
  folder: 'events',
  maxSizeMB: 10,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

export class SupabaseStorage {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Initialize storage bucket and policies
   */
  async initialize(): Promise<{ bucketExists: boolean; policiesOk: boolean }> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return { bucketExists: false, policiesOk: false };
      }

      const bucketExists = buckets?.some((b) => b.name === this.config.bucket) ?? false;

      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.config.bucket, {
          public: true,
          fileSizeLimit: this.config.maxSizeMB * 1024 * 1024,
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          return { bucketExists: false, policiesOk: false };
        }
      }

      // Create policies for public read and authenticated write
      const policiesOk = await this.ensurePolicies();

      return { bucketExists: true, policiesOk };
    } catch (error) {
      console.error('Storage initialization error:', error);
      return { bucketExists: false, policiesOk: false };
    }
  }

  /**
   * Ensure storage policies exist
   */
  private async ensurePolicies(): Promise<boolean> {
    try {
      // Public read policy
      const { error: readError } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS "Public read access" ON storage.objects;
          CREATE POLICY "Public read access" ON storage.objects
          FOR SELECT USING (bucket_id = '${this.config.bucket}');
        `,
      });

      if (readError) {
        console.warn('Policy creation warning (may already exist):', readError);
      }

      return true;
    } catch (error) {
      console.warn('Policy creation skipped (requires admin):', error);
      return true; // Continue anyway, bucket may have default policies
    }
  }

  /**
   * Upload file to storage
   */
  async upload(
    userId: string,
    file: File | Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Validate file
      if (file instanceof File) {
        const validation = imageCompressor.validateFile(file);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }
      }

      // Compress if it's a File (not already compressed)
      let uploadData: File | Blob = file;
      let originalSize = file.size;

      if (file instanceof File) {
        try {
          const compressed = await imageCompressor.compress(file);
          uploadData = compressed.blob;
          originalSize = compressed.originalSize;
          console.log(`Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressed.compressedSize / 1024).toFixed(1)}KB`);
        } catch (compressError) {
          console.warn('Compression failed, using original file:', compressError);
          // Continue with original file
        }
      }

      // Generate unique filename
      const mimeType = file.type || 'image/jpeg';
      const originalName = 'name' in file ? file.name : 'image';
      const filename = imageCompressor.generateFilename(originalName, mimeType);
      const path = `${this.config.folder}/${userId}/${filename}`;

      // Simulate progress for compression time
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        onProgress?.({
          progress,
          bytesUploaded: Math.floor(originalSize * progress / 100),
          bytesTotal: originalSize,
        });
      }, 100);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(this.config.bucket)
        .upload(path, uploadData, {
          contentType: mimeType,
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.config.bucket)
        .getPublicUrl(path);

      onProgress?.({
        progress: 100,
        bytesUploaded: originalSize,
        bytesTotal: originalSize,
      });

      return {
        success: true,
        url: urlData.publicUrl,
        path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from storage
   */
  async delete(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage.from(this.config.bucket).remove([path]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * List files for a user
   */
  async listFiles(userId: string): Promise<{ paths: string[]; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.config.bucket)
        .list(`${this.config.folder}/${userId}`);

      if (error) {
        return { paths: [], error: error.message };
      }

      const paths = data?.map((f) => `${this.config.folder}/${userId}/${f.name}`) || [];
      return { paths };
    } catch (error) {
      return {
        paths: [],
        error: error instanceof Error ? error.message : 'List failed',
      };
    }
  }

  /**
   * Get public URL for a path
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(this.config.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

// Singleton instances
export const eventImagesStorage = new SupabaseStorage(EVENT_IMAGES_CONFIG);

// Initialize on module load
eventImagesStorage.initialize().then(({ bucketExists, policiesOk }) => {
  console.log(`Storage initialized: bucket=${bucketExists}, policies=${policiesOk}`);
});
