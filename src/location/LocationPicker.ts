// Location Picker - Fullscreen Map with Mapbox GL JS

import { initLocationService, type ReverseGeocodingResult } from './location-service';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  street: string;
  city: string;
  country: string;
  placeId: string;
}

export interface LocationPickerCallbacks {
  onLocationSelected: (location: SelectedLocation) => void;
  onCancel: () => void;
}

export interface LocationPickerOptions {
  accessToken: string;
  initialLocation?: { latitude: number; longitude: number };
  safeArea?: { top: number; bottom: number; left: number; right: number };
}

const DEFAULT_LOCATION = { latitude: 50.4501, longitude: 30.5234 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxInstance = any;

export class LocationPicker {
  private container: HTMLElement;
  private callbacks: LocationPickerCallbacks;
  private options: LocationPickerOptions;
  private map: MapboxInstance = null;
  private locationService: ReturnType<typeof initLocationService> | null = null;
  private currentAddress: ReverseGeocodingResult | null = null;
  private selectedLocation: { latitude: number; longitude: number } | null = null;
  private isUpdating = false;

  constructor(
    container: HTMLElement,
    callbacks: LocationPickerCallbacks,
    options: LocationPickerOptions
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.options = options;
    this.locationService = initLocationService(options.accessToken);
  }

  async init(): Promise<void> {
    this.render();
    await this.initMap();
    this.setupEventListeners();

    if (this.options.initialLocation) {
      this.selectedLocation = this.options.initialLocation;
      await this.updateAddress(this.options.initialLocation.latitude, this.options.initialLocation.longitude);
    } else {
      this.getCurrentLocation();
    }
  }

  private render(): void {
    const safeArea = this.options.safeArea || { top: 0, bottom: 0, left: 0, right: 0 };

    this.container.innerHTML = `
      <div class="location-picker" style="
        position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column;
        background: var(--bg-primary);
        padding-top: env(safe-area-inset-top, ${safeArea.top}px);
        padding-bottom: env(safe-area-inset-bottom, ${safeArea.bottom}px);
        padding-left: env(safe-area-inset-left, ${safeArea.left}px);
        padding-right: env(safe-area-inset-right, ${safeArea.right}px);
      ">
        <div class="picker-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
          <button class="cancel-btn" style="padding: 8px 16px; background: transparent; border: none; color: var(--text-secondary); font-size: 15px; cursor: pointer;">Cancel</button>
          <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">Choose Location</span>
          <div style="width: 60px;"></div>
        </div>
        <div class="search-container" style="padding: 12px 16px; background: var(--bg-secondary);">
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--bg-tertiary); border-radius: 12px; border: 1px solid var(--border-color);">
            <span style="font-size: 18px;">🔍</span>
            <input type="text" class="search-input" placeholder="Search address..." style="flex: 1; background: transparent; border: none; outline: none; font-size: 15px; color: var(--text-primary);" />
            <button class="clear-search" style="display: none; padding: 4px 8px; background: var(--bg-elevated); border: none; border-radius: 6px; color: var(--text-tertiary); font-size: 12px; cursor: pointer;">✕</button>
          </div>
          <div class="search-results" style="display: none; margin-top: 8px; background: var(--bg-tertiary); border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; max-height: 200px; overflow-y: auto;"></div>
        </div>
        <div class="map-container" style="flex: 1; position: relative; overflow: hidden;">
          <div id="picker-map" style="width: 100%; height: 100%;"></div>
          <div class="crosshair" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; pointer-events: none; z-index: 10;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; border: 2px solid var(--accent-primary); border-radius: 50%;"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 40px; background: var(--accent-primary);"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 2px; background: var(--accent-primary);"></div>
          </div>
          <button class="my-location-btn" style="position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">📍</button>
          <div class="loading-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 20;">
            <div style="width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
        </div>
        <div class="address-preview" style="padding: 16px; background: var(--bg-secondary); border-top: 1px solid var(--border-color); min-height: 80px;">
          <div class="address-skeleton" style="display: none;">
            <div style="height: 16px; width: 70%; background: var(--bg-tertiary); border-radius: 4px; margin-bottom: 8px; animation: pulse 1.5s ease-in-out infinite;"></div>
            <div style="height: 12px; width: 50%; background: var(--bg-tertiary); border-radius: 4px;"></div>
          </div>
          <div class="address-content" style="display: none;">
            <p class="address-main" style="font-size: 16px; font-weight: 500; color: var(--text-primary); margin: 0 0 4px 0;"></p>
            <p class="address-secondary" style="font-size: 14px; color: var(--text-secondary); margin: 0;"></p>
            <p class="coordinates" style="font-size: 12px; color: var(--text-tertiary); margin: 8px 0 0 0;"></p>
          </div>
          <div class="address-empty" style="color: var(--text-tertiary); font-size: 14px; text-align: center;">Move map or search for a location</div>
        </div>
        <div class="confirm-container" style="padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); background: var(--bg-secondary);">
          <button class="confirm-btn" disabled style="width: 100%; padding: 16px; background: var(--accent-primary); border: none; border-radius: 14px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; opacity: 0.5; transition: all 0.3s ease;">Confirm Location</button>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private async initMap(): Promise<void> {
    const mapContainer = this.container.querySelector('#picker-map') as HTMLElement;
    if (!mapContainer) return;

    // Load Mapbox GL JS
    if (!(window as unknown as { mapboxgl?: unknown }).mapboxgl) {
      await this.loadMapbox();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapboxgl = (window as unknown as { mapboxgl: any }).mapboxgl;
    mapboxgl.accessToken = this.options.accessToken;

    this.map = new mapboxgl.Map({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [
        this.options.initialLocation?.longitude || DEFAULT_LOCATION.longitude,
        this.options.initialLocation?.latitude || DEFAULT_LOCATION.latitude,
      ],
      zoom: 15,
      attributionControl: false,
    });

    this.map.on('load', () => {
      this.addMarker();
    });
  }

  private loadMapbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as unknown as { mapboxgl?: unknown }).mapboxgl) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
        document.head.appendChild(link);
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private addMarker(): void {
    const mapContainer = this.container.querySelector('#picker-map') as HTMLElement;
    if (!mapContainer) return;

    const markerEl = document.createElement('div');
    markerEl.className = 'picker-marker';
    markerEl.innerHTML = `
      <div style="width: 40px; height: 40px; background: var(--accent-primary); border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">📍</div>
      <div style="width: 4px; height: 20px; background: var(--accent-primary); margin-left: 18px; border-radius: 0 0 2px 2px;"></div>
    `;
    markerEl.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); z-index: 15; cursor: grab; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);';
    mapContainer.appendChild(markerEl);

    this.setupDrag(markerEl);
  }

  private setupDrag(markerEl: HTMLElement): void {
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const point = 'touches' in e ? e.touches[0] : e;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      currentX += dx;
      currentY += dy;
      markerEl.style.transform = `translate(calc(-50% + ${currentX}px), calc(-100% + ${currentY}px))`;
      startX = point.clientX;
      startY = point.clientY;
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      markerEl.style.transform = `translate(calc(-50% + ${currentX}px), calc(-100% + ${currentY}px))`;
      this.map?.panBy([-currentX, -currentY]);
      currentX = 0;
      currentY = 0;
      markerEl.style.transform = 'translate(-50%, -100%)';

      if (this.map) {
        const center = this.map.getCenter();
        this.selectedLocation = { latitude: center.lat, longitude: center.lng };
        this.updateAddress(center.lat, center.lng);
        this.triggerHaptic();
      }
    };

    markerEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
    });
    markerEl.addEventListener('touchstart', (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  }

  private async updateAddress(latitude: number, longitude: number): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const preview = this.container.querySelector('.address-preview');
    const skeleton = preview?.querySelector('.address-skeleton') as HTMLElement;
    const content = preview?.querySelector('.address-content') as HTMLElement;
    const empty = preview?.querySelector('.address-empty') as HTMLElement;
    const mainAddr = preview?.querySelector('.address-main');
    const secondaryAddr = preview?.querySelector('.address-secondary');
    const coords = preview?.querySelector('.coordinates');
    const confirmBtn = this.container.querySelector('.confirm-btn') as HTMLButtonElement;

    skeleton.style.display = 'block';
    content.style.display = 'none';
    empty.style.display = 'none';
    this.showLoading(true);

    try {
      const result = await this.locationService?.reverseGeocode(latitude, longitude);
      if (result) {
        this.currentAddress = result;
        skeleton.style.display = 'none';
        content.style.display = 'block';
        if (mainAddr) mainAddr.textContent = result.formattedAddress;
        if (secondaryAddr) secondaryAddr.textContent = `${result.city}${result.country ? ', ' + result.country : ''}`;
        if (coords) coords.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
      }
    } catch {
      skeleton.style.display = 'none';
      content.style.display = 'none';
      empty.style.display = 'block';
      if (empty) empty.textContent = 'Unable to get address. Please try again.';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';
    }

    this.showLoading(false);
    this.isUpdating = false;
  }

  private getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.useFallbackLocation();
      return;
    }

    this.showLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        this.selectedLocation = { latitude, longitude };
        this.map?.flyTo({ center: [longitude, latitude], zoom: 16 });
        await this.updateAddress(latitude, longitude);
        this.showLoading(false);
        this.triggerHaptic();
      },
      () => {
        this.showLoading(false);
        this.useFallbackLocation();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  private useFallbackLocation(): void {
    const { latitude, longitude } = DEFAULT_LOCATION;
    this.selectedLocation = { latitude, longitude };
    this.map?.flyTo({ center: [longitude, latitude], zoom: 15 });
    this.updateAddress(latitude, longitude);
  }

  private setupEventListeners(): void {
    this.container.querySelector('.cancel-btn')?.addEventListener('click', () => this.callbacks.onCancel());

    this.container.querySelector('.confirm-btn')?.addEventListener('click', () => {
      if (this.selectedLocation && this.currentAddress) {
        this.callbacks.onLocationSelected({
          latitude: this.selectedLocation.latitude,
          longitude: this.selectedLocation.longitude,
          formattedAddress: this.currentAddress.formattedAddress,
          street: this.currentAddress.street,
          city: this.currentAddress.city,
          country: this.currentAddress.country,
          placeId: this.currentAddress.placeId,
        });
      }
    });

    this.container.querySelector('.my-location-btn')?.addEventListener('click', () => this.getCurrentLocation());

    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement;
    const clearSearchBtn = this.container.querySelector('.clear-search');

    searchInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (clearSearchBtn) {
        (clearSearchBtn as HTMLElement).style.display = value ? 'block' : 'none';
      }
      if (value.length >= 2) this.searchAddress(value);
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) (clearSearchBtn as HTMLElement).style.display = 'none';
      this.hideSearchResults();
    });

    this.map?.on('moveend', () => {
      if (this.map && !this.isUpdating) {
        const center = this.map.getCenter();
        this.selectedLocation = { latitude: center.lat, longitude: center.lng };
        this.updateAddress(center.lat, center.lng);
      }
    });
  }

  private async searchAddress(query: string): Promise<void> {
    const resultsContainer = this.container.querySelector('.search-results') as HTMLElement;
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-tertiary);">Searching...</div>';

    try {
      const results = await this.locationService?.searchAddress(query);
      if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-tertiary);">No results found</div>';
        return;
      }

      resultsContainer.innerHTML = results.map((result) => `
        <div class="search-result-item" data-lat="${result.latitude}" data-lng="${result.longitude}" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
          <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${result.address}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-tertiary);">${result.city}${result.country ? ', ' + result.country : ''}</p>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
        item.addEventListener('click', async () => {
          const lat = parseFloat((item as HTMLElement).dataset.lat || '0');
          const lng = parseFloat((item as HTMLElement).dataset.lng || '0');
          this.selectedLocation = { latitude: lat, longitude: lng };
          this.map?.flyTo({ center: [lng, lat], zoom: 16 });
          await this.updateAddress(lat, lng);
          this.hideSearchResults();
        });
      });
    } catch {
      resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-tertiary);">Search failed</div>';
    }
  }

  private hideSearchResults(): void {
    const resultsContainer = this.container.querySelector('.search-results') as HTMLElement;
    if (resultsContainer) resultsContainer.style.display = 'none';
  }

  private showLoading(show: boolean): void {
    const overlay = this.container.querySelector('.loading-overlay') as HTMLElement;
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) navigator.vibrate(10);
  }

  private addStyles(): void {
    if (document.querySelector('#location-picker-styles')) return;
    const style = document.createElement('style');
    style.id = 'location-picker-styles';
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .search-result-item:hover { background: var(--bg-elevated); }
      .confirm-btn:not(:disabled):hover { transform: scale(1.02); }
      .confirm-btn:not(:disabled):active { transform: scale(0.98); }
      .my-location-btn:hover { transform: scale(1.1); }
    `;
    document.head.appendChild(style);
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.container.innerHTML = '';
  }
}
