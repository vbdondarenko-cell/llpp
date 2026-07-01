// Event Image Upload Module
// Production-ready image upload with Supabase Storage

import { eventImagesStorage, type UploadProgress } from './storage';

export interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  imageUrl: string | null;
  error: string | null;
  isCancelling: boolean;
}

export interface UploadCallbacks {
  onStateChange: (state: UploadState) => void;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  onUploadCancel?: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class EventImageUploader {
  private currentUpload: AbortController | null = null;
  private retries = 0;
  private state: UploadState = {
    status: 'idle',
    progress: 0,
    imageUrl: null,
    error: null,
    isCancelling: false,
  };
  private callbacks: UploadCallbacks | null = null;
  private userId: string = '';

  /**
   * Initialize uploader with callbacks
   */
  init(callbacks: UploadCallbacks, userId: string): void {
    this.callbacks = callbacks;
    this.userId = userId;
  }

  /**
   * Start upload process
   */
  async startUpload(file: File): Promise<void> {
    if (this.state.status === 'uploading') {
      console.warn('Upload already in progress');
      return;
    }

    this.currentUpload = new AbortController();
    this.retries = 0;
    this.setState({
      status: 'uploading',
      progress: 0,
      error: null,
      isCancelling: false,
    });

    this.callbacks?.onUploadStart?.();

    try {
      await this.executeUpload(file);
    } catch (error) {
      if (this.state.isCancelling) {
        this.callbacks?.onUploadCancel?.();
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        this.setState({ status: 'error', error: errorMessage });
        this.callbacks?.onUploadError?.(errorMessage);
      }
    }
  }

  /**
   * Execute upload with retry logic
   */
  private async executeUpload(file: File): Promise<void> {
    while (this.retries <= MAX_RETRIES) {
      try {
        if (this.currentUpload?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const result = await eventImagesStorage.upload(
          this.userId,
          file,
          (progress) => {
            if (!this.currentUpload?.signal.aborted) {
              this.setState({ progress: progress.progress });
              this.callbacks?.onUploadProgress?.(progress);
            }
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Success
        this.setState({
          status: 'success',
          progress: 100,
          imageUrl: result.url || null,
        });
        this.callbacks?.onUploadSuccess?.(result.url || '');
        return;

      } catch (error) {
        this.retries++;

        if (this.currentUpload?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        if (this.retries <= MAX_RETRIES) {
          console.warn(`Upload failed, retrying (${this.retries}/${MAX_RETRIES})...`);
          await this.delay(RETRY_DELAY * this.retries);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Cancel ongoing upload
   */
  cancel(): void {
    if (this.currentUpload) {
      this.setState({ isCancelling: true });
      this.currentUpload.abort();
      this.currentUpload = null;
    }
  }

  /**
   * Reset uploader state
   */
  reset(): void {
    this.cancel();
    this.setState({
      status: 'idle',
      progress: 0,
      imageUrl: null,
      error: null,
      isCancelling: false,
    });
  }

  /**
   * Set uploaded image URL directly (for editing existing events)
   */
  setImageUrl(url: string): void {
    this.setState({
      status: 'success',
      progress: 100,
      imageUrl: url,
    });
  }

  /**
   * Delete uploaded image
   */
  async deleteImage(): Promise<void> {
    if (this.state.imageUrl) {
      // Extract path from URL or use direct path
      const pathMatch = this.state.imageUrl.match(/\/storage\/v1\/object\/public\/(.+)/);
      if (pathMatch) {
        await eventImagesStorage.delete(pathMatch[1]);
      }
    }
    this.reset();
  }

  /**
   * Retry failed upload
   */
  async retry(file: File): Promise<void> {
    this.reset();
    await this.startUpload(file);
  }

  /**
   * Get current state
   */
  getState(): UploadState {
    return { ...this.state };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Set state and notify callbacks
   */
  private setState(partial: Partial<UploadState>): void {
    this.state = { ...this.state, ...partial };
    this.callbacks?.onStateChange(this.state);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const eventImageUploader = new EventImageUploader();

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network online');
  });

  window.addEventListener('offline', () => {
    console.warn('Network offline - uploads will fail');
  });
}
