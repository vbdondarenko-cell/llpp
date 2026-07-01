// Create Event Cover Image Component
import { EventImageUploader } from '../storage/event-image-upload';
import { imageCompressor } from '../storage/image-compressor';
import type { UploadState } from '../storage/event-image-upload';

export interface CreateEventCoverCallbacks {
  onImageSelect: (imageData: string) => void;
  onImageRemove: () => void;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  onValidationChange?: (hasImage: boolean) => void;
}

export class CreateEventCover {
  private container: HTMLElement;
  private callbacks: CreateEventCoverCallbacks;
  private currentImage: string | null = null;
  private uploadedUrl: string | null = null;
  private uploader: EventImageUploader;
  private userId: string = '';
  private pendingFile: File | null = null;

  constructor(container: HTMLElement, callbacks: CreateEventCoverCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.uploader = new EventImageUploader();
    this.render();
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    this.uploader.init({
      onStateChange: (state: UploadState) => this.handleStateChange(state),
      onUploadStart: () => this.callbacks.onUploadStart?.(),
      onUploadSuccess: (url: string) => {
        this.uploadedUrl = url;
        this.callbacks.onUploadComplete?.(url);
        this.callbacks.onValidationChange?.(true);
      },
      onUploadError: (error: string) => {
        this.callbacks.onUploadError?.(error);
      },
    }, userId);
  }

  private handleStateChange(state: UploadState): void {
    switch (state.status) {
      case 'uploading':
        this.showUploading(state.progress);
        break;
      case 'success':
        this.hideUploading();
        if (state.imageUrl) {
          this.setPreviewFromUrl(state.imageUrl);
        }
        break;
      case 'error':
        this.hideUploading();
        this.showError(state.error || 'Upload failed');
        break;
      case 'idle':
        this.hideUploading();
        break;
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="cover-section" style="
        padding: 16px;
      ">
        <label class="cover-label" style="
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 12px;
        ">Cover Image</label>
        
        <div class="cover-upload-area" style="
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: var(--bg-tertiary);
          border: 2px dashed var(--border-color);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        ">
          <div class="cover-placeholder" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            color: var(--text-tertiary);
          ">
            <div class="upload-icon" style="
              width: 64px;
              height: 64px;
              background: var(--bg-elevated);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
            ">📷</div>
            <div style="text-align: center;">
              <p style="font-size: 15px; font-weight: 500; color: var(--text-secondary); margin: 0;">
                Tap to upload
              </p>
              <p style="font-size: 13px; margin: 4px 0 0 0;">
                or drag & drop
              </p>
            </div>
          </div>
          
          <div class="cover-preview" style="
            display: none;
            width: 100%;
            height: 100%;
            position: relative;
          ">
            <img class="preview-image" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 0;
              transition: opacity 0.3s ease;
            " alt="Cover preview" />
            <div class="preview-overlay" style="
              position: absolute;
              inset: 0;
              background: var(--bg-tertiary);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div class="preview-loading" style="
                width: 32px;
                height: 32px;
                border: 3px solid var(--border-color);
                border-top-color: var(--accent-primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
              "></div>
            </div>
            <button class="replace-cover-btn" style="
              position: absolute;
              top: 8px;
              left: 8px;
              padding: 8px 12px;
              background: rgba(0, 0, 0, 0.7);
              border: none;
              border-radius: 8px;
              color: white;
              font-size: 13px;
              cursor: pointer;
              display: none;
              align-items: center;
              gap: 4px;
              transition: all 0.2s ease;
            ">
              🔄 Replace
            </button>
            <button class="remove-cover-btn" style="
              position: absolute;
              top: 8px;
              right: 8px;
              width: 32px;
              height: 32px;
              background: rgba(0, 0, 0, 0.7);
              border: none;
              border-radius: 50%;
              color: white;
              font-size: 16px;
              cursor: pointer;
              display: none;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            " aria-label="Remove image">✕</button>
          </div>
          
          <div class="upload-progress" style="
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
          ">
            <div class="progress-spinner" style="
              width: 48px;
              height: 48px;
              border: 3px solid var(--border-color);
              border-top-color: var(--accent-primary);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            <div class="progress-bar-container" style="
              width: 70%;
              height: 6px;
              background: var(--bg-elevated);
              border-radius: 3px;
              overflow: hidden;
            ">
              <div class="progress-bar" style="
                height: 100%;
                background: var(--accent-gradient);
                border-radius: 3px;
                transition: width 0.2s ease;
                width: 0%;
              "></div>
            </div>
            <span class="progress-text" style="
              font-size: 14px;
              color: var(--text-secondary);
            ">Uploading...</span>
            <button class="cancel-upload-btn" style="
              padding: 8px 16px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-color);
              border-radius: 8px;
              color: var(--text-secondary);
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Cancel</button>
          </div>

          <div class="upload-error" style="
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
          ">
            <span style="font-size: 32px;">⚠️</span>
            <span class="error-message" style="
              font-size: 14px;
              color: var(--text-secondary);
              text-align: center;
              padding: 0 20px;
            ">Upload failed</span>
            <button class="retry-upload-btn" style="
              padding: 10px 20px;
              background: var(--accent-primary);
              border: none;
              border-radius: 10px;
              color: white;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Retry</button>
          </div>
        </div>
        
        <div class="upload-info" style="
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-tertiary);
        ">
          <span>JPG, PNG, WebP • Max 10MB</span>
          <span class="compression-info"></span>
        </div>
        
        <input type="file" class="cover-input" accept="image/jpeg,image/jpg,image/png,image/webp" style="display: none;" />
      </div>
    `;

    this.setupEventListeners();
    this.setupDragAndDrop();
    this.addStyles();
  }

  private setupEventListeners(): void {
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;
    const input = this.container.querySelector('.cover-input') as HTMLInputElement;
    const removeBtn = this.container.querySelector('.remove-cover-btn');
    const replaceBtn = this.container.querySelector('.replace-cover-btn');
    const cancelBtn = this.container.querySelector('.cancel-upload-btn');
    const retryBtn = this.container.querySelector('.retry-upload-btn');

    uploadArea?.addEventListener('click', () => {
      if (this.currentImage && !this.pendingFile) {
        // Show replace option
        (replaceBtn as HTMLElement)?.style.setProperty('display', 'flex');
        (removeBtn as HTMLElement)?.style.setProperty('display', 'flex');
      }
    });

    uploadArea?.addEventListener('click', () => {
      if (this.uploadedUrl) {
        // Already uploaded, show options
        return;
      }
      input?.click();
    });

    input?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.pendingFile = file;
        this.startUpload(file);
      }
    });

    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImage();
    });

    replaceBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      input?.click();
    });

    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uploader.cancel();
      this.pendingFile = null;
      this.hideUploading();
    });

    retryBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.pendingFile) {
        this.uploader.retry(this.pendingFile);
      }
    });

    uploadArea?.addEventListener('mouseenter', () => {
      if (!this.currentImage) {
        uploadArea.style.borderColor = 'var(--accent-primary)';
        uploadArea.style.background = 'var(--bg-elevated)';
      }
    });

    uploadArea?.addEventListener('mouseleave', () => {
      if (!this.currentImage) {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'var(--bg-tertiary)';
      }
    });

    // Click outside to hide buttons
    document.addEventListener('click', (e) => {
      if (!uploadArea?.contains(e.target as Node)) {
        (replaceBtn as HTMLElement)?.style.setProperty('display', 'none');
        (removeBtn as HTMLElement)?.style.setProperty('display', 'none');
      }
    });
  }

  private setupDragAndDrop(): void {
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadArea && !this.uploadedUrl) {
        uploadArea.style.borderColor = 'var(--accent-primary)';
        uploadArea.style.background = 'var(--bg-elevated)';
        uploadArea.style.transform = 'scale(1.02)';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadArea && !this.currentImage) {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'var(--bg-tertiary)';
        uploadArea.style.transform = 'scale(1)';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadArea) {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'var(--bg-tertiary)';
        uploadArea.style.transform = 'scale(1)';
      }

      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/') && !this.uploadedUrl) {
        this.pendingFile = file;
        this.startUpload(file);
      }
    };

    uploadArea?.addEventListener('dragover', handleDragOver);
    uploadArea?.addEventListener('dragleave', handleDragLeave);
    uploadArea?.addEventListener('drop', handleDrop);
  }

  private async startUpload(file: File): Promise<void> {
    // Validate file
    const validation = imageCompressor.validateFile(file);
    if (!validation.valid) {
      this.showError(validation.error || 'Invalid file');
      return;
    }

    // Show preview with blur placeholder
    this.showPreviewPlaceholder();

    // Start upload
    if (!this.userId) {
      // Use a temp user ID for demo
      this.userId = 'temp-' + Date.now();
    }

    this.uploader.init({
      onStateChange: (state: UploadState) => this.handleStateChange(state),
      onUploadStart: () => {
        this.callbacks.onUploadStart?.();
      },
      onUploadSuccess: (url: string) => {
        this.uploadedUrl = url;
        this.currentImage = url;
        this.pendingFile = null;
        this.callbacks.onImageSelect(url);
        this.callbacks.onUploadComplete?.(url);
        this.callbacks.onValidationChange?.(true);
      },
      onUploadError: (error: string) => {
        this.callbacks.onUploadError?.(error);
      },
    }, this.userId);

    await this.uploader.startUpload(file);
  }

  private showPreviewPlaceholder(): void {
    const placeholder = this.container.querySelector('.cover-placeholder') as HTMLElement;
    const preview = this.container.querySelector('.cover-preview') as HTMLElement;
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;

    if (placeholder && preview && uploadArea) {
      placeholder.style.display = 'none';
      preview.style.display = 'block';
      uploadArea.style.borderStyle = 'solid';
      uploadArea.style.borderColor = 'var(--accent-primary)';
    }
  }

  private setPreviewFromUrl(url: string): void {
    const preview = this.container.querySelector('.cover-preview') as HTMLElement;
    const img = this.container.querySelector('.preview-image') as HTMLImageElement;
    const overlay = this.container.querySelector('.preview-overlay') as HTMLElement;

    if (preview && img) {
      img.onload = () => {
        img.style.opacity = '1';
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => {
            overlay.style.display = 'none';
          }, 300);
        }
      };
      img.src = url;
    }
  }

  private showUploading(progress: number): void {
    const progressEl = this.container.querySelector('.upload-progress') as HTMLElement;
    const progressBar = this.container.querySelector('.progress-bar') as HTMLElement;
    const progressText = this.container.querySelector('.progress-text');

    if (progressEl) {
      progressEl.style.display = 'flex';
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `Uploading... ${progress}%`;
    }
  }

  private hideUploading(): void {
    const progressEl = this.container.querySelector('.upload-progress') as HTMLElement;
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }

  private showError(error: string): void {
    const errorEl = this.container.querySelector('.upload-error') as HTMLElement;
    const errorMessage = this.container.querySelector('.error-message');

    if (errorEl) {
      errorEl.style.display = 'flex';
    }

    if (errorMessage) {
      errorMessage.textContent = error;
    }
  }

  private hideError(): void {
    const errorEl = this.container.querySelector('.upload-error') as HTMLElement;
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  private removeImage(): void {
    const placeholder = this.container.querySelector('.cover-placeholder') as HTMLElement;
    const preview = this.container.querySelector('.cover-preview') as HTMLElement;
    const overlay = this.container.querySelector('.preview-overlay') as HTMLElement;
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;
    const input = this.container.querySelector('.cover-input') as HTMLInputElement;

    // Delete from storage if uploaded
    if (this.uploadedUrl) {
      this.uploader.deleteImage();
    }

    if (placeholder && preview && uploadArea && input) {
      placeholder.style.display = 'flex';
      preview.style.display = 'none';
      uploadArea.style.borderStyle = 'dashed';
      uploadArea.style.borderColor = 'var(--border-color)';
      input.value = '';
      
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
      }
    }

    this.currentImage = null;
    this.uploadedUrl = null;
    this.pendingFile = null;
    this.hideError();
    this.callbacks.onImageRemove();
    this.callbacks.onValidationChange?.(false);
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .cover-upload-area.drag-over {
        border-color: var(--accent-primary) !important;
        background: var(--bg-elevated) !important;
      }
      .replace-cover-btn:hover, .remove-cover-btn:hover {
        transform: scale(1.1);
      }
      .cancel-upload-btn:hover, .retry-upload-btn:hover {
        background: var(--bg-elevated) !important;
        color: var(--text-primary) !important;
      }
    `;
    if (!document.querySelector('#create-event-cover-styles')) {
      style.id = 'create-event-cover-styles';
      document.head.appendChild(style);
    }
  }

  public getImage(): string | null {
    return this.uploadedUrl || this.currentImage;
  }

  public getUploadedUrl(): string | null {
    return this.uploadedUrl;
  }

  public setImage(imageUrl: string): void {
    this.uploadedUrl = imageUrl;
    this.currentImage = imageUrl;
    this.setPreviewFromUrl(imageUrl);
    this.callbacks.onValidationChange?.(true);
  }

  public isUploading(): boolean {
    return this.uploader.getState().status === 'uploading';
  }

  public isReady(): boolean {
    return this.uploader.getState().status === 'success';
  }

  public reset(): void {
    this.uploader.reset();
    this.removeImage();
  }
}
