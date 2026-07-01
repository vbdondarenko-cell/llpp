// Create Event Details Component
import type { EventCategory } from './types';

export interface CreateEventDetailsCallbacks {
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onCategoryChange: (category: EventCategory | null) => void;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
}

export class CreateEventDetails {
  private container: HTMLElement;
  private callbacks: CreateEventDetailsCallbacks;
  private selectedCategory: EventCategory | null = null;
  private selectedDate: Date | null = null;
  private selectedTime: string = '18:00';
  private selectedDuration: number = 60;
  private titleCharCount: HTMLElement | null = null;
  private descCharCount: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: CreateEventDetailsCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
    this.setupDateShortcuts();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="details-section" style="
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      ">
        <!-- Event Title -->
        <div class="field-group">
          <div class="field-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          ">
            <label style="
              font-size: 14px;
              font-weight: 500;
              color: var(--text-secondary);
            ">Event Title</label>
            <span class="title-counter" style="
              font-size: 12px;
              color: var(--text-tertiary);
              transition: color 0.2s ease;
            ">0/80</span>
          </div>
          <input type="text" class="title-input" placeholder="Enter event title..." maxlength="80" style="
            width: 100%;
            padding: 14px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 16px;
            outline: none;
            transition: all 0.2s ease;
          " />
        </div>

        <!-- Description -->
        <div class="field-group">
          <div class="field-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          ">
            <label style="
              font-size: 14px;
              font-weight: 500;
              color: var(--text-secondary);
            ">Description</label>
            <span class="desc-counter" style="
              font-size: 12px;
              color: var(--text-tertiary);
              transition: color 0.2s ease;
            ">0/1000</span>
          </div>
          <textarea class="description-input" placeholder="Describe your event..." maxlength="1000" rows="3" style="
            width: 100%;
            padding: 14px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 16px;
            outline: none;
            resize: none;
            transition: all 0.2s ease;
            min-height: 80px;
            font-family: inherit;
          "></textarea>
        </div>

        <!-- Category -->
        <div class="field-group">
          <label style="
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 12px;
          ">Category</label>
          <div class="category-chips" style="
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          ">
            ${this.renderCategoryChips()}
          </div>
        </div>

        <!-- Date & Time -->
        <div class="field-group" style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        ">
          <div>
            <label style="
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: var(--text-secondary);
              margin-bottom: 8px;
            ">Date</label>
            <div class="date-shortcuts" style="
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
            ">
              <button class="date-shortcut" data-date="today" style="
                flex: 1;
                padding: 8px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Today</button>
              <button class="date-shortcut" data-date="tomorrow" style="
                flex: 1;
                padding: 8px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Tomorrow</button>
              <button class="date-shortcut" data-date="weekend" style="
                flex: 1;
                padding: 8px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Weekend</button>
            </div>
            <input type="date" class="date-input" style="
              width: 100%;
              padding: 12px 14px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-color);
              border-radius: 12px;
              color: var(--text-primary);
              font-size: 15px;
              outline: none;
              transition: all 0.2s ease;
              color-scheme: dark;
            " />
          </div>
          <div>
            <label style="
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: var(--text-secondary);
              margin-bottom: 8px;
            ">Time</label>
            <input type="time" class="time-input" value="18:00" style="
              width: 100%;
              padding: 12px 14px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-color);
              border-radius: 12px;
              color: var(--text-primary);
              font-size: 15px;
              outline: none;
              transition: all 0.2s ease;
              color-scheme: dark;
            " />
          </div>
        </div>

        <!-- Duration -->
        <div class="field-group">
          <label style="
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 12px;
          ">Duration</label>
          <div class="duration-chips" style="
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          ">
            ${this.renderDurationChips()}
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.addStyles();
  }

  private renderCategoryChips(): string {
    const categories: EventCategory[] = [
      'party', 'sport', 'food', 'music', 'art',
      'nature', 'games', 'networking', 'education', 'other'
    ];
    
    return categories.map(cat => {
      const config = this.getCategoryConfig(cat);
      return `
        <button class="category-chip" data-category="${cat}" style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <span>${config.icon}</span>
          <span>${config.label}</span>
        </button>
      `;
    }).join('');
  }

  private renderDurationChips(): string {
    const options = [
      { value: 30, label: '30 min' },
      { value: 60, label: '1 h' },
      { value: 120, label: '2 h' },
      { value: 180, label: '3 h' },
      { value: 240, label: '4 h' },
    ];

    return options.map(opt => `
      <button class="duration-chip ${opt.value === 60 ? 'selected' : ''}" data-duration="${opt.value}" style="
        padding: 10px 16px;
        background: ${opt.value === 60 ? 'var(--accent-primary)' : 'var(--bg-tertiary)'};
        border: 1px solid ${opt.value === 60 ? 'var(--accent-primary)' : 'var(--border-color)'};
        border-radius: 10px;
        color: ${opt.value === 60 ? 'white' : 'var(--text-secondary)'};
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">${opt.label}</button>
    `).join('');
  }

  private getCategoryConfig(cat: EventCategory): { icon: string; label: string; color: string } {
    const config: Record<string, { icon: string; label: string; color: string }> = {
      party: { icon: '🎉', label: 'Party', color: '#ec4899' },
      sport: { icon: '⚽', label: 'Sport', color: '#22c55e' },
      food: { icon: '🍕', label: 'Food', color: '#f97316' },
      music: { icon: '🎵', label: 'Music', color: '#8b5cf6' },
      art: { icon: '🎨', label: 'Art', color: '#ec4899' },
      nature: { icon: '🌿', label: 'Nature', color: '#22c55e' },
      games: { icon: '🎮', label: 'Games', color: '#6366f1' },
      networking: { icon: '🤝', label: 'Networking', color: '#0ea5e9' },
      education: { icon: '📚', label: 'Education', color: '#f59e0b' },
      other: { icon: '✨', label: 'Other', color: '#94a3b8' },
    };
    return config[cat] || config.other;
  }

  private setupEventListeners(): void {
    const titleInput = this.container.querySelector('.title-input') as HTMLInputElement;
    const descInput = this.container.querySelector('.description-input') as HTMLTextAreaElement;
    const dateInput = this.container.querySelector('.date-input') as HTMLInputElement;
    const timeInput = this.container.querySelector('.time-input') as HTMLInputElement;

    this.titleCharCount = this.container.querySelector('.title-counter');
    this.descCharCount = this.container.querySelector('.desc-counter');

    titleInput?.addEventListener('input', () => {
      const len = titleInput.value.length;
      this.callbacks.onTitleChange(titleInput.value);
      if (this.titleCharCount) {
        this.titleCharCount.textContent = `${len}/80`;
        this.titleCharCount.style.color = len > 70 ? 'var(--warning)' : 'var(--text-tertiary)';
      }
    });

    descInput?.addEventListener('input', () => {
      const len = descInput.value.length;
      this.callbacks.onDescriptionChange(descInput.value);
      this.autoGrow(descInput);
      if (this.descCharCount) {
        this.descCharCount.textContent = `${len}/1000`;
        this.descCharCount.style.color = len > 900 ? 'var(--warning)' : 'var(--text-tertiary)';
      }
    });

    dateInput?.addEventListener('change', () => {
      if (dateInput.value) {
        this.selectedDate = new Date(dateInput.value);
        this.callbacks.onDateChange(this.selectedDate);
      }
    });

    timeInput?.addEventListener('change', () => {
      this.selectedTime = timeInput.value;
      this.callbacks.onTimeChange(this.selectedTime);
    });

    this.setupCategoryListeners();
    this.setupDurationListeners();
  }

  private setupDateShortcuts(): void {
    // Will be called after render
  }

  private setupCategoryListeners(): void {
    const chips = this.container.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const category = (chip as HTMLElement).dataset.category as EventCategory;
        
        chips.forEach(c => {
          (c as HTMLElement).style.background = 'var(--bg-tertiary)';
          (c as HTMLElement).style.borderColor = 'var(--border-color)';
          (c as HTMLElement).style.color = 'var(--text-secondary)';
        });

        const config = this.getCategoryConfig(category);
        (chip as HTMLElement).style.background = config.color + '20';
        (chip as HTMLElement).style.borderColor = config.color;
        (chip as HTMLElement).style.color = config.color;

        this.selectedCategory = category;
        this.callbacks.onCategoryChange(category);
      });
    });
  }

  private setupDurationListeners(): void {
    const chips = this.container.querySelectorAll('.duration-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const duration = parseInt((chip as HTMLElement).dataset.duration || '60');
        
        chips.forEach(c => {
          (c as HTMLElement).style.background = 'var(--bg-tertiary)';
          (c as HTMLElement).style.borderColor = 'var(--border-color)';
          (c as HTMLElement).style.color = 'var(--text-secondary)';
        });

        (chip as HTMLElement).style.background = 'var(--accent-primary)';
        (chip as HTMLElement).style.borderColor = 'var(--accent-primary)';
        (chip as HTMLElement).style.color = 'white';

        this.selectedDuration = duration;
        this.callbacks.onDurationChange(duration);
      });
    });
  }

  private autoGrow(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .title-input:focus, .description-input:focus, .date-input:focus, .time-input:focus {
        border-color: var(--accent-primary) !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
      .date-shortcut:hover {
        background: var(--bg-elevated) !important;
        border-color: var(--accent-primary) !important;
      }
      .category-chip:hover, .duration-chip:hover {
        transform: translateY(-1px);
      }
      .category-chip:active, .duration-chip:active {
        transform: scale(0.97);
      }
    `;
    if (!document.querySelector('#create-event-details-styles')) {
      style.id = 'create-event-details-styles';
      document.head.appendChild(style);
    }
  }

  public setDateShortcuts(): void {
    const shortcuts = this.container.querySelectorAll('.date-shortcut');
    shortcuts.forEach(shortcut => {
      shortcut.addEventListener('click', () => {
        const type = (shortcut as HTMLElement).dataset.date;
        const dateInput = this.container.querySelector('.date-input') as HTMLInputElement;
        const date = new Date();
        
        switch (type) {
          case 'today':
            // Already today
            break;
          case 'tomorrow':
            date.setDate(date.getDate() + 1);
            break;
          case 'weekend':
            const dayOfWeek = date.getDay();
            const daysUntilWeekend = dayOfWeek === 0 ? 0 : 6 - dayOfWeek;
            date.setDate(date.getDate() + (daysUntilWeekend || 7));
            break;
        }
        
        dateInput.value = date.toISOString().split('T')[0];
        this.selectedDate = date;
        this.callbacks.onDateChange(this.selectedDate);

        shortcuts.forEach(s => {
          (s as HTMLElement).style.background = 'var(--bg-tertiary)';
          (s as HTMLElement).style.color = 'var(--text-secondary)';
        });
        (shortcut as HTMLElement).style.background = 'var(--accent-primary)';
        (shortcut as HTMLElement).style.color = 'white';
      });
    });
  }

  public getTitle(): string {
    return (this.container.querySelector('.title-input') as HTMLInputElement)?.value || '';
  }

  public getDescription(): string {
    return (this.container.querySelector('.description-input') as HTMLTextAreaElement)?.value || '';
  }

  public getCategory(): EventCategory | null {
    return this.selectedCategory;
  }

  public getDate(): Date | null {
    return this.selectedDate;
  }

  public getTime(): string {
    return this.selectedTime;
  }

  public getDuration(): number {
    return this.selectedDuration;
  }

  public reset(): void {
    const titleInput = this.container.querySelector('.title-input') as HTMLInputElement;
    const descInput = this.container.querySelector('.description-input') as HTMLTextAreaElement;
    const dateInput = this.container.querySelector('.date-input') as HTMLInputElement;
    const timeInput = this.container.querySelector('.time-input') as HTMLInputElement;

    if (titleInput) titleInput.value = '';
    if (descInput) { descInput.value = ''; descInput.style.height = 'auto'; }
    if (dateInput) dateInput.value = '';
    if (timeInput) timeInput.value = '18:00';

    this.selectedCategory = null;
    this.selectedDate = null;
    this.selectedTime = '18:00';
    this.selectedDuration = 60;

    const chips = this.container.querySelectorAll('.category-chip, .duration-chip');
    chips.forEach(c => {
      (c as HTMLElement).style.background = 'var(--bg-tertiary)';
      (c as HTMLElement).style.borderColor = 'var(--border-color)';
      (c as HTMLElement).style.color = 'var(--text-secondary)';
    });
  }
}
