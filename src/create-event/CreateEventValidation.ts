// Create Event Validation Component
import type { EventDraft } from './types';

export interface CreateEventValidationCallbacks {
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  onSubmit: () => void;
}

export class CreateEventValidation {
  private container: HTMLElement;
  private callbacks: CreateEventValidationCallbacks;

  constructor(container: HTMLElement, callbacks: CreateEventValidationCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  public validate(draft: Partial<EventDraft>): void {
    const errors: string[] = [];

    if (!draft.coverImage) {
      errors.push('Cover image is required');
    }

    if (!draft.title || draft.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (draft.title.length > 80) {
      errors.push('Title must be 80 characters or less');
    }

    if (!draft.category) {
      errors.push('Category is required');
    }

    if (!draft.date) {
      errors.push('Date is required');
    }

    if (!draft.time) {
      errors.push('Time is required');
    }

    if (!draft.location) {
      errors.push('Location is required');
    }

    const isValid = errors.length === 0;
    this.updateUI(isValid, errors);
    this.callbacks.onValidationChange(isValid, errors);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="validation-section" style="
        padding: 16px;
      ">
        <!-- Participants -->
        <div class="field-group" style="margin-bottom: 24px;">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          ">
            <label style="
              font-size: 14px;
              font-weight: 500;
              color: var(--text-secondary);
            ">Max Participants</label>
            <span class="participants-count" style="
              font-size: 24px;
              font-weight: 700;
              color: var(--accent-primary);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">10</span>
          </div>
          <input type="range" class="participants-slider" min="2" max="50" value="10" style="
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: var(--bg-elevated);
            border-radius: 3px;
            outline: none;
          " />
          <div style="
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
          ">
            <span style="font-size: 12px; color: var(--text-tertiary);">2</span>
            <span style="font-size: 12px; color: var(--text-tertiary);">50</span>
          </div>
        </div>

        <!-- Price -->
        <div class="field-group" style="margin-bottom: 24px;">
          <label style="
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 12px;
          ">Price</label>
          <div class="price-toggle" style="
            display: flex;
            gap: 12px;
          ">
            <button class="price-option selected" data-price="free" style="
              flex: 1;
              padding: 14px;
              background: var(--accent-primary);
              border: 1px solid var(--accent-primary);
              border-radius: 12px;
              color: white;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">Free</button>
            <button class="price-option" data-price="paid" style="
              flex: 1;
              padding: 14px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-color);
              border-radius: 12px;
              color: var(--text-secondary);
              font-size: 15px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">Paid</button>
          </div>
          <div class="price-input-container" style="
            display: none;
            margin-top: 12px;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
            ">
              <input type="number" class="price-input" placeholder="0" min="0" step="1" style="
                flex: 1;
                padding: 14px 16px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                color: var(--text-primary);
                font-size: 16px;
                outline: none;
                transition: all 0.2s ease;
              " />
              <span style="
                font-size: 15px;
                font-weight: 500;
                color: var(--text-secondary);
              ">UAH</span>
            </div>
          </div>
        </div>

        <!-- Validation Errors -->
        <div class="validation-errors" style="
          display: none;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        ">
          <div class="errors-list" style="
            display: flex;
            flex-direction: column;
            gap: 8px;
          "></div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.addStyles();
  }

  private setupEventListeners(): void {
    const slider = this.container.querySelector('.participants-slider') as HTMLInputElement;
    const countEl = this.container.querySelector('.participants-count');
    const priceOptions = this.container.querySelectorAll('.price-option');
    const priceInputContainer = this.container.querySelector('.price-input-container');
    const priceInput = this.container.querySelector('.price-input') as HTMLInputElement;

    slider?.addEventListener('input', () => {
      const value = parseInt(slider.value);
      if (countEl) {
        countEl.textContent = value.toString();
        (countEl as HTMLElement).style.transform = 'scale(1.2)';
        setTimeout(() => {
          (countEl as HTMLElement).style.transform = 'scale(1)';
        }, 100);
      }
    });

    priceOptions.forEach(option => {
      option.addEventListener('click', () => {
        const priceType = (option as HTMLElement).dataset.price;
        
        priceOptions.forEach(o => {
          (o as HTMLElement).style.background = 'var(--bg-tertiary)';
          (o as HTMLElement).style.borderColor = 'var(--border-color)';
          (o as HTMLElement).style.color = 'var(--text-secondary)';
        });

        (option as HTMLElement).style.background = 'var(--accent-primary)';
        (option as HTMLElement).style.borderColor = 'var(--accent-primary)';
        (option as HTMLElement).style.color = 'white';

        if (priceInputContainer) {
          (priceInputContainer as HTMLElement).style.display = priceType === 'paid' ? 'block' : 'none';
        }
      });
    });

    priceInput?.addEventListener('input', () => {
      priceInput.style.borderColor = parseInt(priceInput.value) > 0 ? 'var(--accent-primary)' : 'var(--border-color)';
    });
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .participants-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 24px;
        height: 24px;
        background: var(--accent-primary);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        transition: transform 0.2s ease;
      }
      .participants-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      .participants-slider::-webkit-slider-thumb:active {
        transform: scale(0.95);
      }
      .participants-slider::-moz-range-thumb {
        width: 24px;
        height: 24px;
        background: var(--accent-primary);
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
      .price-option:hover {
        transform: translateY(-1px);
      }
      .price-option:active {
        transform: scale(0.98);
      }
      .price-input:focus {
        border-color: var(--accent-primary) !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
    `;
    if (!document.querySelector('#create-event-validation-styles')) {
      style.id = 'create-event-validation-styles';
      document.head.appendChild(style);
    }
  }

  private updateUI(_isValid: boolean, errors: string[]): void {
    const errorsContainer = this.container.querySelector('.validation-errors') as HTMLElement;
    const errorsList = this.container.querySelector('.errors-list');

    if (errorsContainer && errorsList) {
      if (errors.length > 0) {
        errorsContainer.style.display = 'block';
        errorsList.innerHTML = errors.map(error => `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--error);">
            <span>⚠️</span>
            <span>${error}</span>
          </div>
        `).join('');
      } else {
        errorsContainer.style.display = 'none';
      }
    }
  }

  public getMaxParticipants(): number {
    const slider = this.container.querySelector('.participants-slider') as HTMLInputElement;
    return slider ? parseInt(slider.value) : 10;
  }

  public isPaid(): boolean {
    const paidOption = this.container.querySelector('.price-option[data-price="paid"]');
    return paidOption !== null && (paidOption as HTMLElement).style.background.includes('accent-primary');
  }

  public getPrice(): number {
    const priceInput = this.container.querySelector('.price-input') as HTMLInputElement;
    return priceInput ? parseInt(priceInput.value) || 0 : 0;
  }

  public reset(): void {
    const slider = this.container.querySelector('.participants-slider') as HTMLInputElement;
    const countEl = this.container.querySelector('.participants-count');
    const priceOptions = this.container.querySelectorAll('.price-option');
    const priceInputContainer = this.container.querySelector('.price-input-container');
    const priceInput = this.container.querySelector('.price-input') as HTMLInputElement;

    if (slider) slider.value = '10';
    if (countEl) countEl.textContent = '10';
    
    priceOptions.forEach((o, i) => {
      (o as HTMLElement).style.background = i === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)';
      (o as HTMLElement).style.borderColor = i === 0 ? 'var(--accent-primary)' : 'var(--border-color)';
      (o as HTMLElement).style.color = i === 0 ? 'white' : 'var(--text-secondary)';
    });

    if (priceInputContainer) (priceInputContainer as HTMLElement).style.display = 'none';
    if (priceInput) priceInput.value = '';
  }
}
