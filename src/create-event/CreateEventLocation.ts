// Create Event Location Component
import type { EventLocation } from './types';
import { LocationPicker, type SelectedLocation } from '../location';

export interface CreateEventLocationCallbacks {
  onLocationChange: (location: EventLocation | null) => void;
  onUseCurrentLocation: () => void;
}

export class CreateEventLocation {
  private container: HTMLElement;
  private callbacks: CreateEventLocationCallbacks;
  private currentLocation: EventLocation | null = null;
  private locationPicker: LocationPicker | null = null;
  private pickerContainer: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: CreateEventLocationCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="location-section" style="
        padding: 16px;
      ">
        <label style="
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 12px;
        ">Location</label>

        <!-- Current Location Button -->
        <button class="current-location-btn" style="
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 16px;
        ">
          <span style="font-size: 18px;">📍</span>
          <span>Use Current Location</span>
        </button>

        <!-- Search Input -->
        <div class="search-container" style="
          position: relative;
          margin-bottom: 16px;
        ">
          <input type="text" class="location-search" placeholder="Search address..." style="
            width: 100%;
            padding: 14px 16px 14px 42px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 15px;
            outline: none;
            transition: all 0.2s ease;
          " />
          <span style="
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 16px;
          ">🔍</span>
        </div>

        <!-- Choose on Map Button -->
        <button class="map-picker-btn" style="
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 16px;
        ">
          <span style="font-size: 18px;">🗺️</span>
          <span>Choose on Map</span>
        </button>

        <!-- Selected Location Preview -->
        <div class="location-preview" style="
          display: none;
          background: var(--bg-tertiary);
          border-radius: 12px;
          overflow: hidden;
        ">
          <div class="map-preview" style="
            height: 120px;
            background: var(--bg-elevated);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <div style="
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-tertiary) 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <div style="
                position: absolute;
                width: 40px;
                height: 40px;
                background: var(--accent-primary);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
              ">📍</div>
            </div>
          </div>
          <div class="location-info" style="
            padding: 12px;
          ">
            <p class="location-name" style="
              font-size: 15px;
              font-weight: 500;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            "></p>
            <p class="location-address" style="
              font-size: 13px;
              color: var(--text-secondary);
              margin: 0;
            "></p>
          </div>
          <button class="remove-location-btn" style="
            width: 100%;
            padding: 12px;
            background: transparent;
            border: none;
            border-top: 1px solid var(--border-color);
            color: var(--error);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Remove Location</button>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.addStyles();
  }

  private setupEventListeners(): void {
    const currentLocBtn = this.container.querySelector('.current-location-btn');
    const mapPickerBtn = this.container.querySelector('.map-picker-btn');
    const removeLocBtn = this.container.querySelector('.remove-location-btn');
    const searchInput = this.container.querySelector('.location-search') as HTMLInputElement;

    currentLocBtn?.addEventListener('click', () => {
      this.setLoading(true);
      this.callbacks.onUseCurrentLocation();
    });

    mapPickerBtn?.addEventListener('click', () => {
      this.openLocationPicker();
    });

    removeLocBtn?.addEventListener('click', () => {
      this.clearLocation();
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // TODO: Implement address search
        console.log('Search for:', searchInput.value);
      }
    });

    // Hover effects
    [currentLocBtn, mapPickerBtn].forEach(btn => {
      btn?.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.background = 'var(--bg-elevated)';
        (btn as HTMLElement).style.borderColor = 'var(--accent-primary)';
      });
      btn?.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.background = 'var(--bg-tertiary)';
        (btn as HTMLElement).style.borderColor = 'var(--border-color)';
      });
    });
  }

  private openLocationPicker(): void {
    this.pickerContainer = document.createElement('div');
    document.body.appendChild(this.pickerContainer);

    const mapToken = (import.meta as { env: { VITE_MAPBOX_TOKEN?: string } }).env.VITE_MAPBOX_TOKEN || '';

    this.locationPicker = new LocationPicker(
      this.pickerContainer,
      {
        onLocationSelected: (location: SelectedLocation) => {
          this.setLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.formattedAddress,
            name: location.street,
            formattedAddress: location.formattedAddress,
            city: location.city,
            country: location.country,
            placeId: location.placeId,
          });
          this.closeLocationPicker();
        },
        onCancel: () => {
          this.closeLocationPicker();
        },
      },
      {
        accessToken: mapToken,
        initialLocation: this.currentLocation ? {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
        } : undefined,
      }
    );

    this.locationPicker.init();
  }

  private closeLocationPicker(): void {
    if (this.locationPicker) {
      this.locationPicker.destroy();
      this.locationPicker = null;
    }
    if (this.pickerContainer) {
      this.pickerContainer.remove();
      this.pickerContainer = null;
    }
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .location-search:focus {
        border-color: var(--accent-primary) !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
      .remove-location-btn:hover {
        background: rgba(239, 68, 68, 0.1);
      }
    `;
    if (!document.querySelector('#create-event-location-styles')) {
      style.id = 'create-event-location-styles';
      document.head.appendChild(style);
    }
  }

  public setCurrentLocation(latitude: number, longitude: number, address: string): void {
    this.setLoading(false);
    this.setLocation({ latitude, longitude, address });
  }

  public setLocation(location: EventLocation): void {
    this.setLoading(false);
    this.currentLocation = location;
    this.updateLocationPreview();
    this.callbacks.onLocationChange(this.currentLocation);
  }

  public setLocationError(): void {
    this.setLoading(false);
  }

  public getLocation(): EventLocation | null {
    return this.currentLocation;
  }

  private setLoading(loading: boolean): void {
    const btn = this.container.querySelector('.current-location-btn');
    if (btn) {
      if (loading) {
        btn.innerHTML = `
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color);
            border-top-color: var(--accent-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span>Getting location...</span>
        `;
        (btn as HTMLElement).style.opacity = '0.7';
      } else {
        btn.innerHTML = `
          <span style="font-size: 18px;">📍</span>
          <span>Use Current Location</span>
        `;
        (btn as HTMLElement).style.opacity = '1';
      }
    }
  }

  private updateLocationPreview(): void {
    const preview = this.container.querySelector('.location-preview') as HTMLElement;
    const nameEl = this.container.querySelector('.location-name');
    const addrEl = this.container.querySelector('.location-address');

    if (preview && nameEl && addrEl && this.currentLocation) {
      preview.style.display = 'block';
      nameEl.textContent = this.currentLocation.name || 'Selected Location';
      addrEl.textContent = this.currentLocation.formattedAddress || this.currentLocation.address;
    }
  }

  public clearLocation(): void {
    this.currentLocation = null;
    const preview = this.container.querySelector('.location-preview') as HTMLElement;
    if (preview) {
      preview.style.display = 'none';
    }
    this.callbacks.onLocationChange(null);
  }

  public reset(): void {
    this.clearLocation();
    const searchInput = this.container.querySelector('.location-search') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
  }
}
