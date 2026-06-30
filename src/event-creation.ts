// Event Creation Screen Component
import { telegramAuth } from './telegram-auth';
import { CATEGORIES } from './events';
import type { EventCategory } from './types';
import type { EventFormData, ValidationError } from './event-form';
import {
  INITIAL_FORM_DATA,
  validateEventForm,
  getFieldError,
  VALIDATION_RULES,
} from './event-form';
import { uploadEventPhoto, createImagePreview } from './storage';
import { createEvent } from './events';

export interface EventCreationCallbacks {
  onSuccess?: (eventId: string) => void;
  onCancel?: () => void;
}

let currentFormData: EventFormData = { ...INITIAL_FORM_DATA };
let currentErrors: ValidationError[] = [];
let callbacks: EventCreationCallbacks = {};
let previewUrl: string | null = null;

export function renderEventCreationScreen(
  container: HTMLElement,
  initialData?: Partial<EventFormData>,
  cb?: EventCreationCallbacks
): void {
  callbacks = cb || {};
  currentFormData = { ...INITIAL_FORM_DATA, ...initialData };
  currentErrors = [];

  if (initialData?.photoUrl) {
    currentFormData.photoUrl = initialData.photoUrl;
  }

  renderForm(container);
  attachFormListeners(container);
}

function renderForm(container: HTMLElement): void {
  const titleError = getFieldError(currentErrors, 'title');
  const descriptionError = getFieldError(currentErrors, 'description');
  const categoryError = getFieldError(currentErrors, 'category');
  const dateError = getFieldError(currentErrors, 'eventDate');
  const timeError = getFieldError(currentErrors, 'eventTime');
  const locationError = getFieldError(currentErrors, 'locationName');
  const participantsError = getFieldError(currentErrors, 'maxParticipants');

  container.innerHTML = `
    <div class="event-creation-screen">
      <!-- Header -->
      <header class="event-creation-header">
        <button class="back-btn" id="cancel-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <h1 class="header-title">Створити подію</h1>
        <button class="save-draft-btn" id="draft-btn">Чернетка</button>
      </header>

      <!-- Scrollable Content -->
      <div class="event-creation-content">
        <!-- Cover Photo Section -->
        <div class="form-section photo-section">
          <div class="photo-upload-container" id="photo-upload">
            ${currentFormData.photoUrl || previewUrl
              ? `<img src="${previewUrl || currentFormData.photoUrl}" alt="Cover" class="photo-preview">`
              : `<div class="photo-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <span>Додати фото</span>
                </div>`
            }
            <input type="file" id="photo-input" accept="image/*" hidden>
            ${currentFormData.photoUrl || previewUrl
              ? `<button class="remove-photo-btn" id="remove-photo">×</button>`
              : ''
            }
          </div>
          ${currentFormData.photoUrl || previewUrl ? `
            <div class="photo-actions">
              <button class="photo-action-btn" id="change-photo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                Змінити
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Title Section -->
        <div class="form-section">
          <label class="form-label">
            Назва
            <span class="char-counter">${currentFormData.title.length}/${VALIDATION_RULES.title.maxLength}</span>
          </label>
          <input
            type="text"
            class="form-input ${titleError ? 'error' : ''}"
            id="title-input"
            placeholder="Яка подія?"
            value="${currentFormData.title}"
            maxlength="${VALIDATION_RULES.title.maxLength}"
          >
          ${titleError ? `<span class="error-message">${titleError}</span>` : ''}
        </div>

        <!-- Category Section -->
        <div class="form-section">
          <label class="form-label">Категорії</label>
          <div class="category-grid">
            ${CATEGORIES.map(cat => `
              <button
                class="category-option ${currentFormData.category === cat.key ? 'selected' : ''}"
                data-category="${cat.key}"
                style="--cat-color: ${cat.color}"
              >
                <span class="cat-icon">${cat.icon}</span>
                <span class="cat-label">${cat.label}</span>
              </button>
            `).join('')}
          </div>
          ${categoryError ? `<span class="error-message">${categoryError}</span>` : ''}
        </div>

        <!-- Description Section -->
        <div class="form-section">
          <label class="form-label">
            Опис
            <span class="char-counter">${currentFormData.description.length}/${VALIDATION_RULES.description.maxLength}</span>
          </label>
          <textarea
            class="form-textarea ${descriptionError ? 'error' : ''}"
            id="description-input"
            placeholder="Опишіть вашу подію..."
            maxlength="${VALIDATION_RULES.description.maxLength}"
          >${currentFormData.description}</textarea>
          ${descriptionError ? `<span class="error-message">${descriptionError}</span>` : ''}
        </div>

        <!-- Date & Time Section -->
        <div class="form-section date-time-row">
          <div class="form-group">
            <label class="form-label">Дата</label>
            <input
              type="date"
              class="form-input ${dateError ? 'error' : ''}"
              id="date-input"
              value="${currentFormData.eventDate}"
              min="${new Date().toISOString().split('T')[0]}"
            >
            ${dateError ? `<span class="error-message">${dateError}</span>` : ''}
          </div>
          <div class="form-group">
            <label class="form-label">Час</label>
            <input
              type="time"
              class="form-input ${timeError ? 'error' : ''}"
              id="time-input"
              value="${currentFormData.eventTime}"
            >
            ${timeError ? `<span class="error-message">${timeError}</span>` : ''}
          </div>
        </div>

        <!-- Location Section -->
        <div class="form-section">
          <label class="form-label">Місце</label>
          <div class="location-input-group">
            <svg class="location-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <input
              type="text"
              class="form-input location-input ${locationError ? 'error' : ''}"
              id="location-input"
              placeholder="Назва місця"
              value="${currentFormData.locationName}"
            >
          </div>
          <button class="pick-location-btn" id="pick-location">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
            Вибрати на карті
          </button>
          ${locationError ? `<span class="error-message">${locationError}</span>` : ''}
          ${currentFormData.latitude && currentFormData.longitude ? `
            <span class="location-selected">
              ✓ Координати вибрано: ${currentFormData.latitude.toFixed(4)}, ${currentFormData.longitude.toFixed(4)}
            </span>
          ` : ''}
        </div>

        <!-- Participants Section -->
        <div class="form-section">
          <label class="form-label">
            Кількість учасників
            <span class="value-display">${currentFormData.maxParticipants}</span>
          </label>
          <div class="slider-container">
            <input
              type="range"
              class="participants-slider"
              id="participants-slider"
              min="${VALIDATION_RULES.maxParticipants.min}"
              max="${VALIDATION_RULES.maxParticipants.max}"
              value="${currentFormData.maxParticipants}"
              step="1"
            >
            <div class="slider-labels">
              <span>${VALIDATION_RULES.maxParticipants.min}</span>
              <span>${VALIDATION_RULES.maxParticipants.max}</span>
            </div>
          </div>
          ${participantsError ? `<span class="error-message">${participantsError}</span>` : ''}
        </div>

        <!-- Toggles Section -->
        <div class="form-section toggles-section">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Публічна подія</span>
              <span class="toggle-desc">Бачитимуть усі користувачі</span>
            </div>
            <label class="toggle">
              <input type="checkbox" id="public-toggle" ${currentFormData.isPublic ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Потребує схвалення</span>
              <span class="toggle-desc">Ви затверджуватимете заявки</span>
            </div>
            <label class="toggle">
              <input type="checkbox" id="approval-toggle" ${currentFormData.requiresApproval ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Submit Button -->
        <button class="submit-btn" id="submit-btn">
          <span>Створити подію</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add styles
  injectEventCreationStyles();
}

function injectEventCreationStyles(): void {
  if (document.getElementById('event-creation-styles')) return;

  const style = document.createElement('style');
  style.id = 'event-creation-styles';
  style.textContent = `
    .event-creation-screen {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .event-creation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .event-creation-header .header-title {
      font-size: 18px;
      font-weight: 600;
    }

    .event-creation-header .back-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .event-creation-header .back-btn svg {
      width: 20px;
      height: 20px;
    }

    .save-draft-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .save-draft-btn:hover {
      background: var(--bg-tertiary);
    }

    .event-creation-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-bottom: 100px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .char-counter {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-tertiary);
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 15px;
      transition: all 0.2s;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .form-input.error, .form-textarea.error {
      border-color: var(--error);
    }

    .form-textarea {
      min-height: 120px;
      resize: vertical;
    }

    .error-message {
      display: block;
      color: var(--error);
      font-size: 12px;
      margin-top: 4px;
    }

    .photo-section {
      text-align: center;
    }

    .photo-upload-container {
      position: relative;
      width: 100%;
      height: 200px;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      border: 2px dashed var(--border-color);
      transition: all 0.2s;
    }

    .photo-upload-container:hover {
      border-color: var(--accent-primary);
    }

    .photo-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .photo-placeholder svg {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .photo-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-photo-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,0.6);
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-actions {
      margin-top: 12px;
    }

    .photo-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
    }

    .photo-action-btn svg {
      width: 16px;
      height: 16px;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .category-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .category-option:hover {
      background: var(--bg-elevated);
    }

    .category-option.selected {
      border-color: var(--cat-color);
      background: color-mix(in srgb, var(--cat-color) 15%, transparent);
    }

    .category-option .cat-icon {
      font-size: 20px;
    }

    .category-option .cat-label {
      font-size: 13px;
      font-weight: 500;
    }

    .date-time-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .location-input-group {
      position: relative;
    }

    .location-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    .location-input {
      padding-left: 44px;
    }

    .pick-location-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pick-location-btn:hover {
      background: var(--bg-elevated);
    }

    .pick-location-btn svg {
      width: 20px;
      height: 20px;
      color: var(--accent-primary);
    }

    .location-selected {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      color: var(--success);
    }

    .slider-container {
      padding: 8px 0;
    }

    .participants-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--bg-tertiary);
      appearance: none;
      cursor: pointer;
    }

    .participants-slider::-webkit-slider-thumb {
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--accent-primary);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .value-display {
      background: var(--accent-primary);
      color: white;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 13px;
    }

    .toggles-section {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 16px;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
    }

    .toggle-row:first-child {
      padding-top: 0;
    }

    .toggle-row:last-child {
      padding-bottom: 0;
      border-top: 1px solid var(--border-color);
      margin-top: 4px;
      padding-top: 16px;
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .toggle-desc {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .toggle {
      position: relative;
      width: 52px;
      height: 28px;
    }

    .toggle input {
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
      background: var(--bg-tertiary);
      border-radius: 14px;
      transition: all 0.3s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: all 0.3s;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--accent-primary);
    }

    .toggle input:checked + .toggle-slider::before {
      transform: translateX(24px);
    }

    .submit-btn {
      position: fixed;
      bottom: 24px;
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      border-radius: 16px;
      border: none;
      background: var(--accent-gradient);
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      transition: all 0.2s;
      max-width: 400px;
      margin: 0 auto;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(99, 102, 241, 0.5);
    }

    .submit-btn:active {
      transform: translateY(0);
    }

    .submit-btn svg {
      width: 20px;
      height: 20px;
    }

    .submit-btn.loading {
      opacity: 0.7;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function attachFormListeners(container: HTMLElement): void {
  // Cancel button
  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    callbacks.onCancel?.();
  });

  // Draft button
  document.getElementById('draft-btn')?.addEventListener('click', () => {
    saveDraft();
  });

  // Photo upload
  const photoUpload = document.getElementById('photo-upload');
  const photoInput = document.getElementById('photo-input') as HTMLInputElement;

  photoUpload?.addEventListener('click', () => photoInput?.click());

  photoInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await handlePhotoSelect(file);
    }
  });

  document.getElementById('remove-photo')?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFormData.photoUrl = null;
    currentFormData.photoBlob = null;
    previewUrl = null;
    renderForm(container);
  });

  document.getElementById('change-photo')?.addEventListener('click', () => {
    photoInput?.click();
  });

  // Title input
  const titleInput = document.getElementById('title-input') as HTMLInputElement;
  titleInput?.addEventListener('input', () => {
    currentFormData.title = titleInput.value;
    liveValidate('title');
    updateCharCounter('title-input', titleInput.value.length);
  });

  // Category selection
  document.querySelectorAll('.category-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category') as EventCategory;
      currentFormData.category = category;
      telegramAuth.hapticFeedback('light');
      document.querySelectorAll('.category-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Description input
  const descInput = document.getElementById('description-input') as HTMLTextAreaElement;
  descInput?.addEventListener('input', () => {
    currentFormData.description = descInput.value;
    updateCharCounter('description-input', descInput.value.length);
  });

  // Date input
  const dateInput = document.getElementById('date-input') as HTMLInputElement;
  dateInput?.addEventListener('change', () => {
    currentFormData.eventDate = dateInput.value;
    liveValidate('eventDate');
  });

  // Time input
  const timeInput = document.getElementById('time-input') as HTMLInputElement;
  timeInput?.addEventListener('change', () => {
    currentFormData.eventTime = timeInput.value;
    liveValidate('eventTime');
  });

  // Location input
  const locationInput = document.getElementById('location-input') as HTMLInputElement;
  locationInput?.addEventListener('input', () => {
    currentFormData.locationName = locationInput.value;
    liveValidate('locationName');
  });

  // Pick location button
  document.getElementById('pick-location')?.addEventListener('click', () => {
    pickLocationOnMap();
  });

  // Participants slider
  const slider = document.getElementById('participants-slider') as HTMLInputElement;
  const valueDisplay = document.querySelector('.value-display');
  slider?.addEventListener('input', () => {
    currentFormData.maxParticipants = parseInt(slider.value, 10);
    if (valueDisplay) {
      valueDisplay.textContent = slider.value;
    }
  });

  // Public toggle
  const publicToggle = document.getElementById('public-toggle') as HTMLInputElement;
  publicToggle?.addEventListener('change', () => {
    currentFormData.isPublic = publicToggle.checked;
  });

  // Approval toggle
  const approvalToggle = document.getElementById('approval-toggle') as HTMLInputElement;
  approvalToggle?.addEventListener('change', () => {
    currentFormData.requiresApproval = approvalToggle.checked;
  });

  // Submit button
  document.getElementById('submit-btn')?.addEventListener('click', () => {
    submitForm(container);
  });

  // Autosave
  setupAutosave(container);
}

async function handlePhotoSelect(file: File): Promise<void> {
  try {
    // Create preview
    previewUrl = await createImagePreview(file);
    currentFormData.photoBlob = file;
    currentFormData.photoUrl = null;

    // Refresh UI
    const container = document.querySelector('.event-creation-screen');
    if (container) {
      renderForm(container as HTMLElement);
    }

    telegramAuth.hapticNotification('success');
  } catch (error) {
    console.error('Error handling photo:', error);
    telegramAuth.showAlert('Помилка обробки фото');
  }
}

function liveValidate(field: keyof EventFormData): void {
  const validation = validateEventForm(currentFormData);
  currentErrors = validation.errors;
  
  const input = document.getElementById(`${field}-input`) || 
    document.querySelector(`.category-option[data-category="${currentFormData.category}"]`);
  
  if (input) {
    const errorEl = input.parentElement?.querySelector('.error-message');
    const fieldError = getFieldError(currentErrors, field);
    
    if (errorEl) {
      errorEl.textContent = fieldError || '';
      (errorEl as HTMLElement).style.display = fieldError ? 'block' : 'none';
    }
  }
}

function updateCharCounter(inputId: string, length: number): void {
  const input = document.getElementById(inputId);
  const counter = input?.parentElement?.querySelector('.char-counter');
  
  if (counter) {
    const max = inputId === 'title-input' 
      ? VALIDATION_RULES.title.maxLength 
      : VALIDATION_RULES.description.maxLength;
    counter.textContent = `${length}/${max}`;
  }
}

function pickLocationOnMap(): void {
  // For now, use browser geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentFormData.latitude = position.coords.latitude;
        currentFormData.longitude = position.coords.longitude;
        
        const container = document.querySelector('.event-creation-screen');
        if (container) {
          liveValidate('locationName');
        }
        
        telegramAuth.hapticNotification('success');
      },
      () => {
        telegramAuth.showAlert('Не вдалося отримати геолокацію');
      }
    );
  } else {
    telegramAuth.showAlert('Геолокація недоступна');
  }
}

let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

function setupAutosave(container: HTMLElement): void {
  const inputs = container.querySelectorAll('input, textarea, .category-option');
  
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
      }
      autosaveTimeout = setTimeout(() => {
        saveDraft();
      }, 2000);
    });
  });
}

function saveDraft(): void {
  const draft = {
    ...currentFormData,
    photoUrl: previewUrl, // Save preview URL for demo
    photoBlob: null, // Can't save blob to localStorage
  };
  
  localStorage.setItem('event-draft', JSON.stringify(draft));
  telegramAuth.hapticFeedback('light');
}

export function loadDraft(): Partial<EventFormData> | null {
  const draft = localStorage.getItem('event-draft');
  if (draft) {
    try {
      return JSON.parse(draft);
    } catch {
      return null;
    }
  }
  return null;
}

async function submitForm(container: HTMLElement): Promise<void> {
  const submitBtn = document.getElementById('submit-btn');
  if (!submitBtn) return;

  // Validate
  const validation = validateEventForm(currentFormData);
  currentErrors = validation.errors;

  if (!validation.isValid) {
    telegramAuth.hapticNotification('error');
    renderForm(container);
    return;
  }

  // Show loading
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span>Створення...</span>';

  try {
    // Combine date and time
    const eventDateTime = `${currentFormData.eventDate}T${currentFormData.eventTime}:00+02:00`;

    // Upload photo if exists
    let photoUrl = currentFormData.photoUrl;
    
    if (currentFormData.photoBlob) {
      // Note: In real implementation, you'd need user ID from auth
      const userId = 'temp-user-id';
      const eventId = `temp-${Date.now()}`;
      
      const uploadResult = await uploadEventPhoto(userId, eventId, currentFormData.photoBlob);
      if (uploadResult.success && uploadResult.url) {
        photoUrl = uploadResult.url;
      }
    }

    // Create event
    const eventId = await createEvent({
      title: currentFormData.title,
      description: currentFormData.description || undefined,
      category: currentFormData.category!,
      latitude: currentFormData.latitude || undefined,
      longitude: currentFormData.longitude || undefined,
      locationName: currentFormData.locationName || undefined,
      eventDate: eventDateTime,
      maxParticipants: currentFormData.maxParticipants,
      photoUrl: photoUrl || undefined,
    });

    if (eventId) {
      // Clear draft
      localStorage.removeItem('event-draft');
      previewUrl = null;
      
      telegramAuth.hapticNotification('success');
      callbacks.onSuccess?.(eventId);
    } else {
      throw new Error('Failed to create event');
    }
  } catch (error) {
    console.error('Submit error:', error);
    telegramAuth.showAlert('Помилка створення події');
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = `
      <span>Створити подію</span>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
  }
}
