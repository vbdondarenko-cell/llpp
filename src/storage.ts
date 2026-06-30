// Supabase Storage for Event Photos
import { supabase } from './supabase';

const BUCKET_NAME = 'event-photos';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadEventPhoto(
  userId: string,
  eventId: string,
  blob: Blob,
  _onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Compress image before upload
    const compressedBlob = await compressImage(blob);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${eventId}/${timestamp}.webp`;
    
    // Convert blob to array buffer
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, uint8Array, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error('Upload exception:', err);
    return { success: false, error: 'Помилка завантаження' };
  }
}

export async function deleteEventPhoto(photoUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const filename = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filename]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete exception:', err);
    return false;
  }
}

export async function compressImage(
  blob: Blob,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Could not convert canvas to blob'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

export function createImagePreview(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function cropImage(
  blob: Blob,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Could not convert canvas to blob'));
          }
        },
        'image/webp',
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}
