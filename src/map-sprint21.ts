// Sprint 2.3: Interactive Event Markers - LinkUp Map
// Premium interactive markers with clustering on Mapbox

import type { Location, MapEvent } from './types';

// Mapbox GL JS type declarations with full API support
declare global {
  interface Window {
    mapboxgl?: {
      Map: new (config: MapConfig) => MapboxMap;
      NavigationControl: new (options?: NavigationControlOptions) => unknown;
      GeolocateControl: new (config: GeolocateConfig) => unknown;
      Marker: new (options?: MarkerOptions) => MapboxMarker;
      Popup: new (options?: PopupOptions) => MapboxPopup;
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

interface MarkerOptions {
  element?: HTMLElement;
  anchor?: string;
  offset?: [number, number];
}

interface PopupOptions {
  closeButton?: boolean;
  closeOnClick?: boolean;
  offset?: number;
  className?: string;
}

interface MapboxMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (type: any, ...args: any[]) => void;
  off: (type: string, callback: () => void) => void;
  flyTo: (options: FlyToOptions) => void;
  easeTo: (options: FlyToOptions) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  getContainer: () => HTMLElement;
  remove: () => void;
  addControl: (control: unknown, position?: string) => void;
  resize: () => void;
  loadImage: (name: string, image: HTMLImageElement | ImageBitmap, pixelRatio?: number) => void;
  addSource: (id: string, source: GeoJSONSource) => void;
  getSource: (id: string) => GeoJSONSource | undefined;
  addLayer: (layer: MapLayer) => void;
  getLayer: (id: string) => MapLayer | undefined;
  removeLayer: (id: string) => void;
  setLayoutProperty: (layer: string, property: string, value: unknown) => void;
  setPaintProperty: (layer: string, property: string, value: unknown) => void;
  project: (coord: [number, number]) => { x: number; y: number };
  queryRenderedFeatures: (point?: { x: number; y: number }, options?: { layers?: string[] }) => MapFeature[];
}

interface GeoJSONSource {
  type: string;
  data: GeoJSON.FeatureCollection;
  cluster?: boolean;
  clusterMaxZoom?: number;
  clusterRadius?: number;
}

interface MapFeature {
  properties: Record<string, unknown>;
  geometry: GeoJSON.Geometry;
}

interface MapLayer {
  id: string;
  type: string;
  source?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown[];
}

interface FlyToOptions {
  center: [number, number];
  zoom?: number;
  duration?: number;
  essential?: boolean;
}

interface MapboxMarker {
  setLngLat: (lnglat: [number, number]) => MapboxMarker;
  setPopup: (popup: MapboxPopup) => MapboxMarker;
  addTo: (map: MapboxMap) => MapboxMarker;
  remove: () => void;
  getElement: () => HTMLElement;
  togglePopup: () => void;
}

interface MapboxPopup {
  setHTML: (html: string) => MapboxPopup;
  setDOMContent: (element: HTMLElement) => MapboxPopup;
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
  onEventClick?: (event: MapEvent) => void;
}

// Sprint 2.3: Category colors as specified
const CATEGORY_COLORS: Record<string, string> = {
  party: '#a855f7',      // Purple
  sport: '#22c55e',      // Green
  food: '#f97316',       // Orange
  coffee: '#92400e',     // Brown (mapped from party/food)
  music: '#ec4899',      // Pink
  travel: '#3b82f6',     // Blue
  games: '#06b6d4',      // Cyan
  education: '#eab308',  // Yellow
  nature: '#10b981',     // Emerald
  art: '#ef4444',        // Red
  technology: '#6366f1', // Indigo
  networking: '#8b5cf6', // Purple (tech/business)
  other: '#6b7280',      // Gray
};

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS = 50;

export class LinkUpMap {
  private container: HTMLElement;
  private accessToken: string;
  private defaultCenter: [number, number];
  private defaultZoom: number;
  private safeArea?: { top: number; bottom: number; left: number; right: number };
  private onLocationChange?: (location: Location) => void;
  private onMapReady?: () => void;
  private onMapError?: (error: Error) => void;
  private onEventClick?: (event: MapEvent) => void;

  private map: MapboxMap | null = null;
  private mapboxgl: Window['mapboxgl'] | null = null;
  private events: MapEvent[] = [];
  
  private isReady = false;
  private currentLocation: Location | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private errorOverlay: HTMLElement | null = null;
  private emptyStateOverlay: HTMLElement | null = null;

  constructor(options: MapOptions) {
    this.container = options.container;
    this.accessToken = options.accessToken;
    this.defaultCenter = options.defaultCenter;
    this.defaultZoom = options.defaultZoom;
    this.safeArea = options.safeArea;
    this.onLocationChange = options.onLocationChange;
    this.onMapReady = options.onMapReady;
    this.onMapError = options.onMapError;
    this.onEventClick = options.onEventClick;

    this.init();
  }

  private async init(): Promise<void> {
    this.showLoading();

    try {
      this.mapboxgl = await this.loadMapbox();
      
      if (!this.mapboxgl || !this.accessToken) {
        throw new Error('Mapbox not available or token missing');
      }

      this.mapboxgl.accessToken = this.accessToken;

      this.map = new this.mapboxgl.Map({
        container: this.container,
        style: MAP_STYLE,
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        attributionControl: false,
        logoPosition: 'bottom-left',
        antialias: true,
      });

      this.map.addControl(
        new this.mapboxgl.NavigationControl({ showCompass: false }),
        'bottom-right'
      );

      const geolocateControl = new this.mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: false,
      });
      this.map.addControl(geolocateControl, 'bottom-right');

      this.map.on('load', () => {
        this.isReady = true;
        this.hideLoading();
        this.applySafeAreaStyles();
        this.setupEventsSource();
        
        if (this.onMapReady) {
          this.onMapReady();
        }
      });

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
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.async = true;
      
      script.onload = () => resolve(window.mapboxgl || null);
      script.onerror = () => resolve(null);
      
      document.head.appendChild(script);
    });
  }

  private setupEventsSource(): void {
    if (!this.map || !this.mapboxgl) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.events.map(event => ({
        type: 'Feature' as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          participants: event.current_participants,
          maxParticipants: event.max_participants,
          distance: event.distance,
          isPremium: event.is_premium_only,
          color: this.getCategoryColor(event.category),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [event.longitude, event.latitude],
        },
      })),
    };

    this.map.addSource('events', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });

    // Cluster circles
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'events',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#6366f1',  // < 10
          10, '#8b5cf6',  // 10-50
          50, '#a855f7',  // 50-100
          100, '#d946ef', // 100+
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10, 25,
          50, 30,
          100, 40,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Cluster count labels
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'events',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Individual event markers
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'events',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'case',
          ['get', 'isPremium'],
          12,
          10,
        ],
        'circle-stroke-width': [
          'case',
          ['get', 'isPremium'],
          3,
          2,
        ],
        'circle-stroke-color': [
          'case',
          ['get', 'isPremium'],
          '#fbbf24', // Gold for premium
          '#ffffff',
        ],
        'circle-opacity': 0.95,
      },
    });

    // Participant count on markers
    this.map.addLayer({
      id: 'marker-labels',
      type: 'symbol',
      source: 'events',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'participants'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 9,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Click on cluster to zoom
    this.map.on('click', 'clusters', (e: { point: { x: number; y: number } }) => {
      if (!this.map) return;
      
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      
      this.map.easeTo({
        center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
        zoom: (this.map.getZoom() + 2),
        duration: 500,
      });
    });

    // Click on individual marker
    this.map.on('click', 'unclustered-point', (e: { features?: MapFeature[] }) => {
      if (!e.features?.length || !this.map) return;
      
      const feature = e.features[0];
      const eventId = String(feature.properties?.id);
      const event = this.events.find(ev => ev.id === eventId);
      
      if (!event) return;

      // Animate marker
      this.animateMarkerSelection(eventId);

      // Center map
      this.map.flyTo({
        center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
        zoom: Math.max(this.map.getZoom(), 15),
        duration: 800,
        essential: true,
      });

      // Fire callback
      if (this.onEventClick) {
        this.onEventClick(event);
      }
    });

    // Change cursor on hover
    this.map.on('mouseenter', 'clusters', () => {
      if (this.map) this.map.getContainer().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'clusters', () => {
      if (this.map) this.map.getContainer().style.cursor = '';
    });
    this.map.on('mouseenter', 'unclustered-point', () => {
      if (this.map) this.map.getContainer().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'unclustered-point', () => {
      if (this.map) this.map.getContainer().style.cursor = '';
    });
  }

  private animateMarkerSelection(eventId: string): void {
    if (!this.map) return;

    // Update paint properties for selection effect
    this.map.setPaintProperty('unclustered-point', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], eventId],
      16,
      [
        'case',
        ['get', 'isPremium'],
        12,
        10,
      ],
    ]);
  }

  private getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.other;
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

  private showEmptyState(): void {
    if (this.emptyStateOverlay) return;

    this.emptyStateOverlay = document.createElement('div');
    this.emptyStateOverlay.className = 'map-empty-overlay';
    this.emptyStateOverlay.innerHTML = `
      <div class="map-empty-content">
        <div class="map-empty-icon">📍</div>
        <h3>No events nearby</h3>
        <p>There are no events in this area yet.</p>
        <button class="map-empty-cta" id="change-radius-btn">
          Change radius
        </button>
      </div>
    `;
    this.container.appendChild(this.emptyStateOverlay);

    document.getElementById('change-radius-btn')?.addEventListener('click', () => {
      this.hideEmptyState();
    });
  }

  private hideEmptyState(): void {
    if (this.emptyStateOverlay) {
      this.emptyStateOverlay.remove();
      this.emptyStateOverlay = null;
    }
  }

  private retry(): void {
    this.hideError();
    this.init();
  }

  public updateMarkers(events: MapEvent[], _userLocation: Location): void {
    if (!this.map || !this.isReady) return;

    this.events = events;
    this.hideEmptyState();

    // Update GeoJSON source
    const source = this.map.getSource('events') as GeoJSONSource | undefined;
    if (source) {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: events.map(event => ({
          type: 'Feature' as const,
          properties: {
            id: event.id,
            title: event.title,
            category: event.category,
            participants: event.current_participants,
            maxParticipants: event.max_participants,
            distance: event.distance,
            isPremium: event.is_premium_only,
            color: this.getCategoryColor(event.category),
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [event.longitude, event.latitude],
          },
        })),
      };
      
      source.data = geojson;
    }

    // Show empty state if no events
    if (events.length === 0) {
      setTimeout(() => this.showEmptyState(), 500);
    }
  }

  public selectMarker(eventId: string): void {
    this.animateMarkerSelection(eventId);
  }

  public flyTo(location: Location, zoom?: number): void {
    if (!this.map) return;

    this.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom || this.defaultZoom,
      duration: 1000,
      essential: true,
    });
  }

  public setUserLocation(location: Location): void {
    this.currentLocation = location;
    this.flyTo(location, 15);
  }

  public centerOnUserLocation(): void {
    if (!this.currentLocation) return;
    this.flyTo(this.currentLocation, 15);
  }

  public setOnEventClick(callback: (event: MapEvent) => void): void {
    this.onEventClick = callback;
  }

  public getCenter(): { lat: number; lng: number } {
    if (!this.map) return { lat: 0, lng: 0 };
    const center = this.map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }

  public resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  public destroy(): void {
    this.hideLoading();
    this.hideError();
    this.hideEmptyState();
    
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    this.isReady = false;
  }

  public isMapReady(): boolean {
    return this.isReady;
  }

  private applySafeAreaStyles(): void {
    if (!this.safeArea) return;
    this.container.style.setProperty('--safe-area-top', `${this.safeArea.top}px`);
    this.container.style.setProperty('--safe-area-bottom', `${this.safeArea.bottom}px`);
  }

  public getCurrentEvents(): MapEvent[] {
    return this.events;
  }
}

// Inject Sprint 2.3 map styles with animations
const mapStyles = document.createElement('style');
mapStyles.textContent = `
  /* Sprint 2.3: Map Styles */
  
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

  /* Sprint 2.3: Empty State */
  .map-empty-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 10, 15, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    backdrop-filter: blur(4px);
  }

  .map-empty-content {
    text-align: center;
    padding: 32px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .map-empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .map-empty-content h3 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
  }

  .map-empty-content p {
    margin: 0 0 24px;
    font-size: 14px;
    color: #a1a1aa;
  }

  .map-empty-cta {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .map-empty-cta:hover {
    background: #2563eb;
    transform: scale(1.02);
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

  /* Sprint 2.3: Marker Animations */
  @keyframes markerPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  @keyframes markerBounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @keyframes markerAppear {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    70% {
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes clusterExpand {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  /* Premium badge pulse */
  @keyframes premiumPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(251, 191, 36, 0);
    }
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
`;
document.head.appendChild(mapStyles);

export default LinkUpMap;
