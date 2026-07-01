// Create Event Cover Image Component

export interface CreateEventCoverCallbacks {
  onImageSelect: (imageData: string) => void;
  onImageRemove: () => void;
}

export class CreateEventCover {
  private container: HTMLElement;
  private callbacks: CreateEventCoverCallbacks;
  private currentImage: string | null = null;
  private isUploading: boolean = false;

  constructor(container: HTMLElement, callbacks: CreateEventCoverCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
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
            " alt="Cover preview" />
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
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            " aria-label="Remove image">✕</button>
          </div>
          
          <div class="upload-loading" style="
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 48px;
              height: 48px;
              border: 3px solid var(--border-color);
              border-top-color: var(--accent-primary);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
          </div>
        </div>
        
        <input type="file" class="cover-input" accept="image/*" style="display: none;" />
      </div>
    `;

    this.setupEventListeners();
    this.setupDragAndDrop();
  }

  private setupEventListeners(): void {
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;
    const input = this.container.querySelector('.cover-input') as HTMLInputElement;
    const removeBtn = this.container.querySelector('.remove-cover-btn');

    uploadArea?.addEventListener('click', () => {
      if (!this.isUploading) {
        input?.click();
      }
    });

    input?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.processFile(file);
      }
    });

    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImage();
    });

    uploadArea?.addEventListener('mouseenter', () => {
      if (!this.currentImage && !this.isUploading) {
        (uploadArea as HTMLElement).style.borderColor = 'var(--accent-primary)';
        (uploadArea as HTMLElement).style.background = 'var(--bg-elevated)';
      }
    });

    uploadArea?.addEventListener('mouseleave', () => {
      if (!this.currentImage && !this.isUploading) {
        (uploadArea as HTMLElement).style.borderColor = 'var(--border-color)';
        (uploadArea as HTMLElement).style.background = 'var(--bg-tertiary)';
      }
    });
  }

  private setupDragAndDrop(): void {
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadArea && !this.isUploading) {
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
      if (file && file.type.startsWith('image/') && !this.isUploading) {
        this.processFile(file);
      }
    };

    uploadArea?.addEventListener('dragover', handleDragOver);
    uploadArea?.addEventListener('dragleave', handleDragLeave);
    uploadArea?.addEventListener('drop', handleDrop);
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      return;
    }

    this.setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.setPreviewImage(result);
      this.callbacks.onImageSelect(result);
      this.setLoading(false);
    };

    reader.onerror = () => {
      this.setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  private setPreviewImage(imageData: string): void {
    const placeholder = this.container.querySelector('.cover-placeholder') as HTMLElement;
    const preview = this.container.querySelector('.cover-preview') as HTMLElement;
    const img = this.container.querySelector('.preview-image') as HTMLImageElement;
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;

    if (placeholder && preview && img && uploadArea) {
      placeholder.style.display = 'none';
      preview.style.display = 'block';
      img.src = imageData;
      uploadArea.style.borderStyle = 'solid';
      uploadArea.style.borderColor = 'var(--accent-primary)';
      this.currentImage = imageData;
    }
  }

  private removeImage(): void {
    const placeholder = this.container.querySelector('.cover-placeholder') as HTMLElement;
    const preview = this.container.querySelector('.cover-preview') as HTMLElement;
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;
    const input = this.container.querySelector('.cover-input') as HTMLInputElement;

    if (placeholder && preview && uploadArea && input) {
      placeholder.style.display = 'flex';
      preview.style.display = 'none';
      uploadArea.style.borderStyle = 'dashed';
      uploadArea.style.borderColor = 'var(--border-color)';
      input.value = '';
      this.currentImage = null;
      this.callbacks.onImageRemove();
    }
  }

  private setLoading(loading: boolean): void {
    this.isUploading = loading;
    const loadingEl = this.container.querySelector('.upload-loading') as HTMLElement;
    const uploadArea = this.container.querySelector('.cover-upload-area') as HTMLElement;

    if (loadingEl) {
      loadingEl.style.display = loading ? 'flex' : 'none';
    }

    if (uploadArea) {
      uploadArea.style.cursor = loading ? 'wait' : 'pointer';
    }
  }

  public getImage(): string | null {
    return this.currentImage;
  }

  public setImage(imageData: string): void {
    this.currentImage = imageData;
    this.setPreviewImage(imageData);
  }

  public reset(): void {
    if (this.currentImage) {
      this.removeImage();
    }
  }
}
