// Create Event Settings Component

export interface CreateEventSettingsCallbacks {
  onSettingsChange: (settings: EventSettings) => void;
}

export interface EventSettings {
  requiresApproval: boolean;
  isPrivate: boolean;
  premiumOnly: boolean;
  allowGuests: boolean;
}

export class CreateEventSettings {
  private container: HTMLElement;
  private callbacks: CreateEventSettingsCallbacks;
  private settings: EventSettings = {
    requiresApproval: false,
    isPrivate: false,
    premiumOnly: false,
    allowGuests: true,
  };

  constructor(container: HTMLElement, callbacks: CreateEventSettingsCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="settings-section" style="
        padding: 16px;
      ">
        <label style="
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 12px;
        ">Settings</label>

        <div class="settings-list" style="
          background: var(--bg-tertiary);
          border-radius: 12px;
          overflow: hidden;
        ">
          <!-- Approval Required -->
          <div class="setting-item" data-setting="requiresApproval" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.2s ease;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 20px;">✅</span>
              <div>
                <p style="font-size: 15px; font-weight: 500; color: var(--text-primary); margin: 0;">Approval Required</p>
                <p style="font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0 0;">Review requests before accepting</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="setting-toggle" data-setting="requiresApproval">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Private Event -->
          <div class="setting-item" data-setting="isPrivate" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.2s ease;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 20px;">🔒</span>
              <div>
                <p style="font-size: 15px; font-weight: 500; color: var(--text-primary); margin: 0;">Private Event</p>
                <p style="font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0 0;">Only invited users can see</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="setting-toggle" data-setting="isPrivate">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Premium Only -->
          <div class="setting-item" data-setting="premiumOnly" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.2s ease;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 20px;">⭐</span>
              <div>
                <p style="font-size: 15px; font-weight: 500; color: var(--text-primary); margin: 0;">Premium Only</p>
                <p style="font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0 0;">Only premium members can join</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="setting-toggle" data-setting="premiumOnly">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Allow Guests -->
          <div class="setting-item" data-setting="allowGuests" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            transition: background 0.2s ease;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 20px;">👥</span>
              <div>
                <p style="font-size: 15px; font-weight: 500; color: var(--text-primary); margin: 0;">Allow Guests</p>
                <p style="font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0 0;">Let users bring friends</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="setting-toggle" data-setting="allowGuests" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.addStyles();
  }

  private setupEventListeners(): void {
    const toggles = this.container.querySelectorAll('.setting-toggle');
    
    toggles.forEach(toggle => {
      toggle.addEventListener('change', () => {
        const setting = (toggle as HTMLInputElement).dataset.setting as keyof EventSettings;
        this.settings[setting] = (toggle as HTMLInputElement).checked;
        this.animateToggle(toggle as HTMLElement);
        this.callbacks.onSettingsChange(this.settings);
      });
    });

    const items = this.container.querySelectorAll('.setting-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'var(--bg-elevated)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.background = 'transparent';
      });
    });
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 52px;
        height: 28px;
      }
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg-elevated);
        border-radius: 28px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .toggle-slider::before {
        position: absolute;
        content: "";
        height: 22px;
        width: 22px;
        left: 3px;
        bottom: 3px;
        background: var(--text-tertiary);
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .toggle-switch input:checked + .toggle-slider {
        background: var(--accent-primary);
      }
      .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(24px);
        background: white;
      }
      .toggle-switch input:focus + .toggle-slider {
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
      }
      @keyframes toggleOn {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    if (!document.querySelector('#create-event-settings-styles')) {
      style.id = 'create-event-settings-styles';
      document.head.appendChild(style);
    }
  }

  private animateToggle(toggle: HTMLElement): void {
    const slider = toggle.parentElement?.querySelector('.toggle-slider') as HTMLElement;
    if (slider) {
      slider.style.animation = 'none';
      slider.offsetHeight;
      slider.style.animation = 'toggleOn 0.3s ease';
    }
  }

  public getSettings(): EventSettings {
    return { ...this.settings };
  }

  public reset(): void {
    this.settings = {
      requiresApproval: false,
      isPrivate: false,
      premiumOnly: false,
      allowGuests: true,
    };

    const toggles = this.container.querySelectorAll('.setting-toggle');
    toggles.forEach(toggle => {
      const setting = (toggle as HTMLInputElement).dataset.setting as keyof EventSettings;
      (toggle as HTMLInputElement).checked = this.settings[setting];
    });
  }
}
