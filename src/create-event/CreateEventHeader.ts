// Create Event Header Component

export interface CreateEventHeaderCallbacks {
  onBack: () => void;
  onDraftStatusChange?: (hasDraft: boolean) => void;
}

export class CreateEventHeader {
  private container: HTMLElement;
  private callbacks: CreateEventHeaderCallbacks;
  private draftIndicator: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: CreateEventHeaderCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="create-event-header" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 50;
      ">
        <button class="back-button" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
        " aria-label="Go back">
          ←
        </button>
        <div class="header-center" style="flex: 1; text-align: center;">
          <h1 style="
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          ">Create Event</h1>
          <span class="draft-indicator" style="
            display: none;
            font-size: 12px;
            color: var(--warning);
            margin-top: 2px;
          ">Draft saved</span>
        </div>
        <div class="header-right" style="width: 40px;"></div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const backButton = this.container.querySelector('.back-button');
    backButton?.addEventListener('click', () => {
      this.callbacks.onBack();
    });

    backButton?.addEventListener('mouseenter', () => {
      (backButton as HTMLElement).style.background = 'var(--bg-elevated)';
    });

    backButton?.addEventListener('mouseleave', () => {
      (backButton as HTMLElement).style.background = 'var(--bg-tertiary)';
    });

    backButton?.addEventListener('touchstart', () => {
      (backButton as HTMLElement).style.transform = 'scale(0.95)';
    });

    backButton?.addEventListener('touchend', () => {
      (backButton as HTMLElement).style.transform = 'scale(1)';
    });
  }

  public showDraftIndicator(hasDraft: boolean): void {
    this.draftIndicator = this.container.querySelector('.draft-indicator');
    if (this.draftIndicator) {
      this.draftIndicator.style.display = hasDraft ? 'block' : 'none';
    }
    this.callbacks.onDraftStatusChange?.(hasDraft);
  }

  public setLoading(isLoading: boolean): void {
    const backButton = this.container.querySelector('.back-button');
    if (backButton) {
      (backButton as HTMLElement).style.opacity = isLoading ? '0.5' : '1';
      (backButton as HTMLElement).style.pointerEvents = isLoading ? 'none' : 'auto';
    }
  }
}
