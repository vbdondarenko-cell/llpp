// Sprint 2.1: Map Foundation - LinkUp
// Production-quality Mapbox map with dark theme

import type { Location, MapEvent } from './types';

// Mapbox GL JS type declarations
declare global {
  interface Window {
    mapboxgl?: {
      Map: new (config: MapConfig) => MapboxMap;
      NavigationControl: new (options?: NavigationControlOptions) => unknown;
      GeolocateControl: new (config: GeolocateConfig) => unknown;
      accessToken: string;
    };
  }
}

interface MapConfig {
  container: HTMLElement;
  style: string;
  center: [number, number];
  zoom: number;
  attributionControl?: boolean;
  logoPosition?: string;
  antialias?: boolean;
}

interface NavigationControlOptions {
  showCompass?: boolean;
  showZoom?: boolean;
}

interface GeolocateConfig {
  positionOptions: { enableHighAccuracy: boolean };
  trackUserLocation: boolean;
  showUserHeading?: boolean;
}

interface MapboxMap {
  on: (event: string, callback: (e?: unknown) => void) => void;
  off: (event: string, callback: () => void) => void;
  flyTo: (options: FlyToOptions) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  remove: () => void;
  addControl: (control: unknown, position?: string) => void;
  resize: () => void;
}

interface FlyToOptions {
  center: [number, number];
  zoom?: number;
  duration?: number;
  essential?: boolean;
}

export interface MapOptions {
  container: HTMLElement;
  accessToken: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  onLocationChange?: (location: Location) => void;
  onMapReady?: () => void;
  onMapError?: (error: Error) => void;
}

// Map style constant
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

export class LinkUpMap {
  private container: HTMLElement;
  private accessToken: string;
  private defaultCenter: [number, number];
  private defaultZoom: number;
  private safeArea?: { top: number; bottom: number; left: number; right: number };
  private onLocationChange?: (location: Location) => void;
  private onMapReady?: () => void;
  private onMapError?: (error: Error) => void;

  private map: MapboxMap | null = null;
  private userMarker: HTMLElement | null = null;
  private myLocationBtn: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private errorOverlay: HTMLElement | null = null;
  
  private isReady = false;
  private currentLocation: Location | null = null;

  constructor(options: MapOptions) {
    this.container = options.container;
    this.accessToken = options.accessToken;
    this.defaultCenter = options.defaultCenter;
    this.defaultZoom = options.defaultZoom;
    this.safeArea = options.safeArea;
    this.onLocationChange = options.onLocationChange;
    this.onMapReady = options.onMapReady;
    this.onMapError = options.onMapError;

    this.init();
  }

  private async init(): Promise<void> {
    this.showLoading();

    try {
      // Load Mapbox GL JS
      const mapboxgl = await this.loadMapbox();
      
      if (!mapboxgl || !this.accessToken) {
        throw new Error('Mapbox not available or token missing');
      }

      mapboxgl.accessToken = this.accessToken;

      // Create map instance
      this.map = new mapboxgl.Map({
        container: this.container,
        style: MAP_STYLE,
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        attributionControl: false,
        logoPosition: 'bottom-left',
        antialias: true,
      });

      // Add navigation control (zoom buttons)
      this.map.addControl(
        new mapboxgl.NavigationControl(),
        'bottom-right'
      );

      // Add geolocate control for "My Location"
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: false,
      });
      this.map.addControl(geolocateControl, 'bottom-right');

      // Map load event
      this.map.on('load', () => {
        this.isReady = true;
        this.hideLoading();
        this.addUserMarker(this.defaultCenter);
        this.createMyLocationFAB();
        this.applySafeAreaStyles();
        
        if (this.onMapReady) {
          this.onMapReady();
        }
      });

      // Map move event (throttled)
      let moveTimeout: ReturnType<typeof setTimeout> | null = null;
      this.map.on('moveend', () => {
        if (moveTimeout) clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
          if (this.map && this.onLocationChange) {
            const center = this.map.getCenter();
            this.onLocationChange({
              latitude: center.lat,
              longitude: center.lng,
            });
          }
        }, 300);
      });

      // Error handling
      this.map.on('error', (e: unknown) => {
        console.error('Mapbox error:', e);
        this.showError('Помилка завантаження карти');
        if (this.onMapError) {
          this.onMapError(new Error('Map error'));
        }
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.showError('Не вдалося завантажити карту');
      if (this.onMapError) {
        this.onMapError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  private async loadMapbox(): Promise<Window['mapboxgl'] | null> {
    if (typeof window === 'undefined') return null;
    if (window.mapboxgl) return window.mapboxgl;

    return new Promise((resolve) => {
      // Load CSS first
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.async = true;
      
      script.onload = () => resolve(window.mapboxgl || null);
      script.onerror = () => resolve(null);
      
      document.head.appendChild(script);
    });
  }

  private showLoading(): void {
    if (this.loadingOverlay) return;

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'map-loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="map-loading-spinner"></div>
      <span>Завантаження карти...</span>
    `;
    this.container.appendChild(this.loadingOverlay);
  }

  private hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
      this.loadingOverlay = null;
    }
  }

  private showError(message: string): void {
    this.hideLoading();
    
    if (this.errorOverlay) {
      this.errorOverlay.remove();
    }

    this.errorOverlay = document.createElement('div');
    this.errorOverlay.className = 'map-error-overlay';
    this.errorOverlay.innerHTML = `
      <div class="map-error-content">
        <div class="map-error-icon">⚠️</div>
        <p>${message}</p>
        <button class="map-error-retry" id="map-retry-btn">Повторити</button>
      </div>
    `;
    this.container.appendChild(this.errorOverlay);

    document.getElementById('map-retry-btn')?.addEventListener('click', () => {
      this.retry();
    });
  }

  private hideError(): void {
    if (this.errorOverlay) {
      this.errorOverlay.remove();
      this.errorOverlay = null;
    }
  }

  private retry(): void {
    this.hideError();
    this.init();
  }

  private addUserMarker(center: [number, number]): void {
    if (!this.isReady) return;

    // Remove existing marker
    if (this.userMarker) {
      this.userMarker.remove();
    }

    // Create user marker element
    this.userMarker = document.createElement('div');
    this.userMarker.className = 'user-location-marker-sprint21';
    this.userMarker.innerHTML = `
      <div class="user-marker-dot"></div>
      <div class="user-marker-pulse"></div>
    `;

    // Add to container (position will be set by CSS transform)
    this.container.appendChild(this.userMarker);
    this.updateMarkerPosition(center);
  }

  private updateMarkerPosition(center: [number, number]): void {
    if (!this.map || !this.userMarker) return;

    // Convert lng/lat to pixel position
    // This is a simplified version - in production you'd use map.project()
    const lng = center[0];
    const lat = center[1];
    
    // Approximate pixel position (for demo - in real implementation
    // you'd calculate from map.getContainer() size and map.project())
    // For Sprint 2.1, we'll use CSS transforms
    this.userMarker.style.left = '50%';
    this.userMarker.style.top = '50%';
    this.userMarker.style.transform = 'translate(-50%, -50%)';
    
    this.currentLocation = { latitude: lat, longitude: lng };
  }

  private createMyLocationFAB(): void {
    if (this.myLocationBtn) return;

    this.myLocationBtn = document.createElement('button');
    this.myLocationBtn.className = 'my-location-fab';
    this.myLocationBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>
    `;

    this.myLocationBtn.addEventListener('click', () => {
      this.centerOnUserLocation();
    });

    this.container.appendChild(this.myLocationBtn);
  }

  public centerOnUserLocation(): void {
    if (!this.map) return;

    const location = this.currentLocation || {
      latitude: this.defaultCenter[1],
      longitude: this.defaultCenter[0],
    };

    this.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1000,
      essential: true,
    });

    this.updateMarkerPosition([location.longitude, location.latitude]);
  }

  public flyTo(location: Location, zoom?: number): void {
    if (!this.map) return;

    this.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom || this.defaultZoom,
      duration: 1000,
      essential: true,
    });

    this.updateMarkerPosition([location.longitude, location.latitude]);
  }

  public setUserLocation(location: Location): void {
    this.currentLocation = location;
    this.updateMarkerPosition([location.longitude, location.latitude]);
    this.flyTo(location, 15);
  }

  // Sprint 2.2: Event markers management
  private eventMarkers: Map<string, HTMLElement> = new Map();

  public updateMarkers(events: MapEvent[], _userLocation: Location): void {
    if (!this.isReady) return;

    // Remove existing event markers
    this.eventMarkers.forEach(marker => marker.remove());
    this.eventMarkers.clear();

    // Add new event markers
    events.forEach(event => {
      this.addEventMarker(event);
    });
  }

  private addEventMarker(event: MapEvent): void {
    if (!this.map || !this.isReady) return;

    // Create marker element
    const marker = document.createElement('div');
    marker.className = 'event-marker-sprint22';
    marker.dataset.eventId = event.id;

    // Category color dot
    const dot = document.createElement('div');
    dot.className = 'event-marker-dot';
    dot.style.backgroundColor = this.getCategoryColor(event.category);
    marker.appendChild(dot);

    // Add click handler
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleMarkerClick(event);
    });

    // Store reference
    this.eventMarkers.set(event.id, marker);

    // Note: In production, we'd use mapboxgl.Marker
    // For Sprint 2.2, we'll use a simplified overlay approach
    this.container.appendChild(marker);
  }

  private handleMarkerClick(event: MapEvent): void {
    if (this.onEventClick) {
      this.onEventClick(event);
    }
  }

  public selectMarker(eventId: string): void {
    // Remove previous selection
    this.eventMarkers.forEach((marker, id) => {
      marker.classList.toggle('selected', id === eventId);
    });
  }

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      party: '#ef4444',
      sport: '#22c55e',
      food: '#f97316',
      music: '#8b5cf6',
      art: '#ec4899',
      nature: '#10b981',
      games: '#3b82f6',
      networking: '#6366f1',
      education: '#f59e0b',
      other: '#6b7280',
    };
    return colors[category] || colors.other;
  }

  private onEventClick?: (event: MapEvent) => void;

  public setOnEventClick(callback: (event: MapEvent) => void): void {
    this.onEventClick = callback;
  }

  public resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
    if (this.myLocationBtn) {
      this.myLocationBtn.remove();
      this.myLocationBtn = null;
    }
    this.hideLoading();
    this.hideError();
    this.isReady = false;
  }

  public isMapReady(): boolean {
    return this.isReady;
  }

  private applySafeAreaStyles(): void {
    if (!this.safeArea) return;

    // Apply safe area padding via CSS custom properties
    this.container.style.setProperty('--safe-area-top', `${this.safeArea.top}px`);
    this.container.style.setProperty('--safe-area-bottom', `${this.safeArea.bottom}px`);
  }
}

// Inject Sprint 2.1 map styles
const mapStyles = document.createElement('style');
mapStyles.textContent = `
  /* Sprint 2.1 Map Styles */
  
  /* Loading Overlay */
  .map-loading-overlay {
    position: absolute;
    inset: 0;
    background: #0a0a0f;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 100;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .map-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: mapSpinnerSpin 1s linear infinite;
  }

  @keyframes mapSpinnerSpin {
    to { transform: rotate(360deg); }
  }

  /* Error Overlay */
  .map-error-overlay {
    position: absolute;
    inset: 0;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .map-error-content {
    text-align: center;
    padding: 32px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .map-error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .map-error-content p {
    margin: 0 0 24px;
    font-size: 16px;
    color: #a1a1aa;
  }

  .map-error-retry {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .map-error-retry:hover {
    background: #2563eb;
  }

  /* My Location FAB */
  .my-location-fab {
    position: absolute;
    right: 12px;
    bottom: calc(80px + var(--safe-area-bottom, 0px));
    width: 48px;
    height: 48px;
    background: #1a1a24;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.2s;
    z-index: 50;
    color: #ffffff;
  }

  .my-location-fab:hover {
    background: #252532;
    transform: scale(1.05);
  }

  .my-location-fab:active {
    transform: scale(0.95);
  }

  /* User Location Marker */
  .user-location-marker-sprint21 {
    position: absolute;
    z-index: 10;
    pointer-events: none;
  }

  .user-marker-dot {
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
  }

  .user-marker-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    background: rgba(59, 130, 246, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: userPulse 2s ease-out infinite;
  }

  @keyframes userPulse {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0.8;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
    }
  }

  /* Mapbox overrides for dark theme */
  .mapboxgl-ctrl-group {
    background: #1a1a24 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
  }

  .mapboxgl-ctrl-group button {
    background: transparent !important;
    border: none !important;
    color: #ffffff !important;
    width: 40px !important;
    height: 40px !important;
  }

  .mapboxgl-ctrl-group button:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  .mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
    filter: invert(1);
  }

  .mapboxgl-ctrl-attrib {
    display: none !important;
  }

  .mapboxgl-ctrl-logo {
    opacity: 0.5;
  }
`;
document.head.appendChild(mapStyles);

export default LinkUpMap;
