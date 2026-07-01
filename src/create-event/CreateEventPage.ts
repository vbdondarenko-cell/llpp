// Create Event Page - Main Component
import type { EventDraft } from './types';
import { DRAFT_STORAGE_KEY } from './types';
import { CreateEventHeader } from './CreateEventHeader';
import { CreateEventCover } from './CreateEventCover';
import { CreateEventDetails } from './CreateEventDetails';
import { CreateEventLocation } from './CreateEventLocation';
import { CreateEventSettings } from './CreateEventSettings';
import { CreateEventValidation } from './CreateEventValidation';
import { CreateEventService } from '../events/index';

export interface CreateEventPageCallbacks {
  onBack: () => void;
  onEventCreated?: (eventId: string) => void;
  onError?: (error: string) => void;
}

export class CreateEventPage {
  private container: HTMLElement;
  private callbacks: CreateEventPageCallbacks;
  private header: CreateEventHeader | null = null;
  private coverComponent: CreateEventCover | null = null;
  private detailsComponent: CreateEventDetails | null = null;
  private locationComponent: CreateEventLocation | null = null;
  private settingsComponent: CreateEventSettings | null = null;
  private validationComponent: CreateEventValidation | null = null;
  private submitButton: HTMLButtonElement | null = null;
  
  private draft: EventDraft = this.getEmptyDraft();
  private isValid: boolean = false;
  private hasUnsavedChanges: boolean = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, callbacks: CreateEventPageCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
    this.setupComponents();
    this.setupDraftAutosave();
    this.checkForExistingDraft();
  }

  private getEmptyDraft(): EventDraft {
    return {
      coverImage: null,
      title: '',
      description: '',
      category: null,
      date: null,
      time: '18:00',
      duration: 60,
      location: null,
      maxParticipants: 10,
      price: 0,
      isPaid: false,
      currency: 'UAH',
      requiresApproval: false,
      isPrivate: false,
      premiumOnly: false,
      allowGuests: true,
    };
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="create-event-page" style="
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary);
      ">
        <div class="create-event-header-container"></div>
        
        <div class="create-event-content" style="
          flex: 1;
          overflow-y: auto;
          padding-bottom: 100px;
          -webkit-overflow-scrolling: touch;
        ">
          <div class="cover-section"></div>
          <div class="details-section"></div>
          <div class="location-section"></div>
          <div class="settings-section"></div>
          <div class="validation-section"></div>
        </div>
        
        <div class="submit-button-container" style="
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          padding-bottom: calc(16px + var(--safe-area-bottom, 0px));
          background: linear-gradient(transparent, var(--bg-primary) 30%);
          z-index: 100;
        ">
          <button class="submit-button" disabled style="
            width: 100%;
            padding: 16px;
            background: var(--bg-tertiary);
            border: none;
            border-radius: 16px;
            color: var(--text-tertiary);
            font-size: 16px;
            font-weight: 600;
            cursor: not-allowed;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          ">
            <span class="button-text">Create Event</span>
            <span class="button-loading" style="display: none;">
              <span style="
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid var(--border-color);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
              "></span>
              Creating...
            </span>
          </button>
        </div>
      </div>
    `;

    this.submitButton = this.container.querySelector('.submit-button');
    this.setupSubmitButton();
    this.addStyles();
  }

  private setupComponents(): void {
    const headerContainer = this.container.querySelector('.create-event-header-container');
    const coverSection = this.container.querySelector('.cover-section');
    const detailsSection = this.container.querySelector('.details-section');
    const locationSection = this.container.querySelector('.location-section');
    const settingsSection = this.container.querySelector('.settings-section');
    const validationSection = this.container.querySelector('.validation-section');

    if (headerContainer) {
      this.header = new CreateEventHeader(headerContainer as HTMLElement, {
        onBack: () => this.handleBack(),
      });
    }

    if (coverSection) {
      this.coverComponent = new CreateEventCover(coverSection as HTMLElement, {
        onImageSelect: (imageData) => {
          this.draft.coverImage = imageData;
          this.markAsChanged();
          this.validateForm();
        },
        onImageRemove: () => {
          this.draft.coverImage = null;
          this.markAsChanged();
          this.validateForm();
        },
        onUploadStart: () => {
          // Disable submit while uploading
        },
        onUploadComplete: (url) => {
          this.draft.coverImage = url;
          this.validateForm();
        },
        onUploadError: (error) => {
          console.error('Upload error:', error);
        },
        onValidationChange: (hasImage) => {
          // Update validation based on image upload status
          if (hasImage) {
            this.validateForm();
          }
        },
      });
      
      // Set userId for storage path (use telegram_id or temp id)
      const telegramId = localStorage.getItem('telegram_id') || 'temp';
      this.coverComponent.setUserId(telegramId);
    }

    if (detailsSection) {
      this.detailsComponent = new CreateEventDetails(detailsSection as HTMLElement, {
        onTitleChange: (title) => {
          this.draft.title = title;
          this.markAsChanged();
          this.validateForm();
        },
        onDescriptionChange: (description) => {
          this.draft.description = description;
          this.markAsChanged();
        },
        onCategoryChange: (category) => {
          this.draft.category = category;
          this.markAsChanged();
          this.validateForm();
        },
        onDateChange: (date) => {
          this.draft.date = date;
          this.markAsChanged();
          this.validateForm();
        },
        onTimeChange: (time) => {
          this.draft.time = time;
          this.markAsChanged();
          this.validateForm();
        },
        onDurationChange: (duration) => {
          this.draft.duration = duration;
          this.markAsChanged();
        },
      });
      this.detailsComponent.setDateShortcuts();
    }

    if (locationSection) {
      this.locationComponent = new CreateEventLocation(locationSection as HTMLElement, {
        onLocationChange: (location) => {
          this.draft.location = location;
          this.markAsChanged();
          this.validateForm();
        },
        onUseCurrentLocation: () => this.handleUseCurrentLocation(),
      });
    }

    if (settingsSection) {
      this.settingsComponent = new CreateEventSettings(settingsSection as HTMLElement, {
        onSettingsChange: (settings) => {
          this.draft.requiresApproval = settings.requiresApproval;
          this.draft.isPrivate = settings.isPrivate;
          this.draft.premiumOnly = settings.premiumOnly;
          this.draft.allowGuests = settings.allowGuests;
          this.markAsChanged();
        },
      });
    }

    if (validationSection) {
      this.validationComponent = new CreateEventValidation(validationSection as HTMLElement, {
        onValidationChange: (isValid) => {
          this.isValid = isValid;
        },
        onSubmit: () => this.handleSubmit(),
      });
    }
  }

  private setupSubmitButton(): void {
    this.submitButton?.addEventListener('click', () => {
      if (this.isValid && !this.submitButton?.disabled) {
        this.handleSubmit();
      }
    });
  }

  private validateForm(): void {
    const errors: string[] = [];

    if (!this.draft.coverImage) {
      errors.push('Cover image is required');
    }

    if (!this.draft.title || this.draft.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (this.draft.title.length > 80) {
      errors.push('Title must be 80 characters or less');
    }

    if (!this.draft.category) {
      errors.push('Category is required');
    }

    if (!this.draft.date) {
      errors.push('Date is required');
    }

    if (!this.draft.time) {
      errors.push('Time is required');
    }

    if (!this.draft.location) {
      errors.push('Location is required');
    }

    this.isValid = errors.length === 0;
    this.updateSubmitButton();
  }

  private updateSubmitButton(): void {
    if (!this.submitButton) return;
    
    if (this.isValid) {
      this.submitButton.disabled = false;
      this.submitButton.style.background = 'var(--accent-gradient)';
      this.submitButton.style.color = 'white';
      this.submitButton.style.cursor = 'pointer';
      this.submitButton.style.boxShadow = 'var(--shadow-glow)';
    } else {
      this.submitButton.disabled = true;
      this.submitButton.style.background = 'var(--bg-tertiary)';
      this.submitButton.style.color = 'var(--text-tertiary)';
      this.submitButton.style.cursor = 'not-allowed';
      this.submitButton.style.boxShadow = 'none';
    }
  }

  private markAsChanged(): void {
    this.hasUnsavedChanges = true;
    this.scheduleAutosave();
  }

  private setupDraftAutosave(): void {
    // Autosave every 5 seconds if there are changes
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(() => {
      this.saveDraft();
    }, 5000);
  }

  private saveDraft(): void {
    if (this.hasUnsavedChanges) {
      try {
        const draftData = JSON.stringify({
          ...this.draft,
          date: this.draft.date?.toISOString() || null,
        });
        localStorage.setItem(DRAFT_STORAGE_KEY, draftData);
        this.hasUnsavedChanges = false;
        this.header?.showDraftIndicator(true);
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }
  }

  private checkForExistingDraft(): void {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.date) {
          parsed.date = new Date(parsed.date);
        }
        
        // Only restore if draft has some content
        if (parsed.title || parsed.coverImage) {
          this.restoreDraft(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  }

  private restoreDraft(draft: EventDraft): void {
    this.draft = draft;
    
    if (this.coverComponent && draft.coverImage) {
      this.coverComponent.setImage(draft.coverImage);
    }
    
    if (this.detailsComponent) {
      // Will need to set values programmatically if needed
    }
    
    if (this.locationComponent && draft.location) {
      // Will need to restore location if needed
    }
    
    this.header?.showDraftIndicator(true);
    this.validateForm();
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      this.header?.showDraftIndicator(false);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }

  private handleBack(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save your draft before leaving?')) {
        this.saveDraft();
      }
    }
    this.callbacks.onBack();
  }

  private handleUseCurrentLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode (simplified - in production use actual geocoding API)
          const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          this.locationComponent?.setCurrentLocation(latitude, longitude, address);
        },
        (error) => {
          console.error('Geolocation error:', error);
          this.locationComponent?.setLocationError();
          this.callbacks.onError?.('Failed to get location. Please try again or enter manually.');
        },
        { timeout: 10000 }
      );
    } else {
      this.callbacks.onError?.('Geolocation is not supported by your browser.');
    }
  }

  private async handleSubmit(): Promise<void> {
    if (!this.isValid) return;

    this.setLoading(true);

    try {
      const result = await CreateEventService.createEvent({
        draft: this.draft,
        onProgress: (stage: string) => {
          this.updateProgress(stage);
        },
      });

      if (result.success) {
        this.showSuccess();
        this.clearDraft();

        // Notify parent with created event
        this.callbacks.onEventCreated?.(result.eventId || '');

        // Navigate back after showing success
        setTimeout(() => {
          this.callbacks.onBack();
        }, 2000);
      } else {
        this.callbacks.onError?.(result.error || 'Failed to create event');
        this.setLoading(false);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      this.callbacks.onError?.('Failed to create event. Please try again.');
      this.setLoading(false);
    }
  }

  private updateProgress(stage: string): void {
    const progressElement = this.container.querySelector('.submit-progress-text');
    if (progressElement) {
      progressElement.textContent = stage;
    }
  }

  private setLoading(loading: boolean): void {
    const buttonText = this.submitButton?.querySelector('.button-text');
    const buttonLoading = this.submitButton?.querySelector('.button-loading');
    
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      
      if (loading) {
        if (buttonText) (buttonText as HTMLElement).style.display = 'none';
        if (buttonLoading) (buttonLoading as HTMLElement).style.display = 'inline-flex';
        this.submitButton.style.background = 'var(--accent-primary)';
      } else {
        if (buttonText) (buttonText as HTMLElement).style.display = 'inline';
        if (buttonLoading) (buttonLoading as HTMLElement).style.display = 'none';
      }
    }
  }

  private showSuccess(): void {
    if (!this.submitButton) return;
    
    const buttonText = this.submitButton.querySelector('.button-text');
    const buttonLoading = this.submitButton.querySelector('.button-loading');
    
    if (buttonText) buttonText.textContent = '✓ Event Created!';
    if (buttonLoading) (buttonLoading as HTMLElement).style.display = 'none';
    this.submitButton.style.background = 'var(--success)';
    this.submitButton.style.color = 'white';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .create-event-content::-webkit-scrollbar {
        width: 4px;
      }
      
      .create-event-content::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .create-event-content::-webkit-scrollbar-thumb {
        background: var(--bg-elevated);
        border-radius: 2px;
      }
      
      .submit-button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-glow);
      }
      
      .submit-button:not(:disabled):active {
        transform: translateY(0);
      }
    `;
    if (!document.querySelector('#create-event-page-styles')) {
      style.id = 'create-event-page-styles';
      document.head.appendChild(style);
    }
  }

  public destroy(): void {
    // Save draft before destroying
    if (this.hasUnsavedChanges) {
      this.saveDraft();
    }
    
    // Clear autosave timer
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    
    // Clear container
    this.container.innerHTML = '';
  }

  public reset(): void {
    this.draft = this.getEmptyDraft();
    this.isValid = false;
    this.hasUnsavedChanges = false;
    
    this.coverComponent?.reset();
    this.detailsComponent?.reset();
    this.locationComponent?.reset();
    this.settingsComponent?.reset();
    this.validationComponent?.reset();
    
    this.updateSubmitButton();
    this.header?.showDraftIndicator(false);
  }
}
