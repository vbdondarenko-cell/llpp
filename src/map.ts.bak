// Mapbox Map Integration
import type { MapEvent, Location, EventCategory } from './types';
import { CATEGORY_COLORS } from './events';

declare global {
  interface Window {
    mapboxgl?: {
      Map: new (config: unknown) => MapInstance;
      NavigationControl: new () => unknown;
      GeolocateControl: new (config: unknown) => unknown;
      accessToken: string;
    };
  }
}

interface MapInstance {
  on: (event: string, callback: () => void) => void;
  flyTo: (options: { center: [number, number]; zoom?: number; duration?: number; essential?: boolean }) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  remove: () => void;
  addControl: (control: unknown, position?: string) => void;
}

export interface MapConfig {
  container: HTMLElement;
  center: [number, number];
  zoom: number;
  accessToken: string;
}

export interface MarkerData {
  id: string;
  event: MapEvent;
  marker: MarkerElement | null;
}

export class MarkerElement {
  private element: HTMLElement;
  private category: EventCategory;
  private selected: boolean = false;

  constructor(category: EventCategory, onClick?: () => void) {
    this.category = category;
    this.element = this.createElement();
    if (onClick) {
      this.element.addEventListener('click', onClick);
    }
  }

  private createElement(): HTMLElement {
    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.style.cssText = `
      width: 40px;
      height: 40px;
      background: ${CATEGORY_COLORS[this.category]};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: markerAppear 0.3s ease-out;
    `;
    
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${CATEGORY_COLORS[this.category]};
      opacity: 0.4;
      animation: markerPulse 2s ease-out infinite;
    `;
    
    marker.appendChild(pulse);
    
    const icon = document.createElement('span');
    icon.style.cssText = `
      position: relative;
      z-index: 1;
      font-size: 18px;
    `;
    marker.appendChild(icon);
    
    return marker;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  isSelected(): boolean {
    return this.selected;
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    if (selected) {
      this.element.style.transform = 'scale(1.2)';
      this.element.style.zIndex = '10';
    } else {
      this.element.style.transform = 'scale(1)';
      this.element.style.zIndex = '1';
    }
  }

  updatePosition(_lngLat: { lng: number; lat: number }): void {
    this.element.style.animation = 'none';
    this.element.offsetHeight;
    this.element.style.animation = 'markerAppear 0.3s ease-out';
  }
}

export class LinkUpMap {
  private container: HTMLElement;
  private accessToken: string;
  private map: MapInstance | null = null;
  private markers: Map<string, MarkerElement> = new Map();
  private markersContainer: HTMLElement | null = null;
  private userMarker: HTMLElement | null = null;
  private onEventClick?: (event: MapEvent) => void;
  private onLocationChange?: (location: Location) => void;
  private isMapReady: boolean = false;

  constructor(container: HTMLElement, accessToken: string) {
    this.container = container;
    this.accessToken = accessToken;
    this.initMap();
  }

  private async initMap(): Promise<void> {
    try {
      const mapboxgl = await this.loadMapbox();
      if (!mapboxgl) {
        this.initFallbackMap();
        return;
      }

      mapboxgl.accessToken = this.accessToken;

      this.map = new mapboxgl.Map({
        container: this.container,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [30.5234, 50.4501],
        zoom: 13,
        attributionControl: false,
        logoPosition: 'bottom-left',
      });

      this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      this.map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }), 'bottom-right');

      this.map.on('load', () => {
        this.isMapReady = true;
        this.createMarkersContainer();
        this.addMapStyles();
      });

      this.map.on('moveend', () => {
        if (this.map && this.onLocationChange) {
          const center = this.map.getCenter();
          this.onLocationChange({
            latitude: center.lat,
            longitude: center.lng,
          });
        }
      });
    } catch (error) {
      console.error('Failed to initialize Mapbox:', error);
      this.initFallbackMap();
    }
  }

  private async loadMapbox(): Promise<Window['mapboxgl'] | null> {
    if (typeof window === 'undefined') return null;
    
    if (window.mapboxgl) {
      return window.mapboxgl;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
        document.head.appendChild(link);
        resolve(window.mapboxgl || null);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  private initFallbackMap(): void {
    this.container.innerHTML = `
      <div class="map-fallback">
        <div class="map-placeholder">
          <div class="map-grid"></div>
          <div class="map-controls">
            <button class="map-control-btn" id="recenter-btn">📍</button>
            <button class="map-control-btn" id="zoom-in-btn">+</button>
            <button class="map-control-btn" id="zoom-out-btn">−</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('recenter-btn')?.addEventListener('click', () => {
      if (this.onLocationChange) {
        this.onLocationChange({ latitude: 50.4501, longitude: 30.5234 });
      }
    });

    this.isMapReady = true;
    this.createMarkersContainer();
  }

  private createMarkersContainer(): void {
    this.markersContainer = document.createElement('div');
    this.markersContainer.className = 'markers-container';
    this.markersContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    `;
    this.container.appendChild(this.markersContainer);
  }

  private addMapStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes markerAppear {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes markerPulse {
        0% { transform: scale(1); opacity: 0.4; }
        100% { transform: scale(2); opacity: 0; }
      }
      .map-marker {
        position: absolute;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  }

  public setOnEventClick(callback: (event: MapEvent) => void): void {
    this.onEventClick = callback;
  }

  public setOnLocationChange(callback: (location: Location) => void): void {
    this.onLocationChange = callback;
  }

  public updateMarkers(events: MapEvent[], _userLocation: Location): void {
    if (!this.isMapReady) return;

    const existingIds = new Set(this.markers.keys());
    const newIds = new Set(events.map(e => e.id));

    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        this.removeMarker(id);
      }
    });

    events.forEach((event, index) => {
      if (this.markers.has(event.id)) {
        this.updateMarkerPosition(event);
      } else {
        this.addMarker(event, index * 50);
      }
    });
  }

  private addMarker(event: MapEvent, delay: number): void {
    if (!this.markersContainer) return;

    const marker = new MarkerElement(event.category, () => {
      if (this.onEventClick) {
        this.onEventClick(event);
      }
    });

    setTimeout(() => {
      marker.updatePosition({ lng: event.longitude, lat: event.latitude });
    }, delay);

    this.markers.set(event.id, marker);
    this.markersContainer.appendChild(marker.getElement());
  }

  private updateMarkerPosition(event: MapEvent): void {
    const marker = this.markers.get(event.id);
    if (marker) {
      marker.updatePosition({ lng: event.longitude, lat: event.latitude });
    }
  }

  private removeMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.getElement().remove();
      this.markers.delete(id);
    }
  }

  public setUserLocation(_location: Location): void {
    if (!this.markersContainer) return;

    if (this.userMarker) {
      this.userMarker.style.animation = 'none';
      this.userMarker.offsetHeight;
    }

    this.userMarker = document.createElement('div');
    this.userMarker.className = 'user-location-marker';
    this.userMarker.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      transform: translate(-50%, -50%);
      animation: userMarkerPulse 2s ease-out infinite;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes userMarkerPulse {
        0%, 100% { box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5); }
        50% { box-shadow: 0 2px 16px rgba(59, 130, 246, 0.8); }
      }
    `;
    if (!document.querySelector('#user-marker-style')) {
      style.id = 'user-marker-style';
      document.head.appendChild(style);
    }

    this.markersContainer.appendChild(this.userMarker);
  }

  public flyTo(location: Location, zoom?: number): void {
    if (this.map) {
      this.map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: zoom || this.map.getZoom(),
        duration: 1000,
        essential: true,
      });
    }
  }

  public selectMarker(eventId: string): void {
    this.markers.forEach((marker, id) => {
      marker.setSelected(id === eventId);
    });
  }

  public clearMarkers(): void {
    this.markers.forEach(marker => marker.getElement().remove());
    this.markers.clear();
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers.clear();
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
  }
}
