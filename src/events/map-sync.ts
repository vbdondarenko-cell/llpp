// Sprint 3.5: Map Sync - Marker Animation and Camera Control
// Handles marker appearance animation, camera flyTo, and marker management

import type { MapEvent, Location } from '../types';

export interface MapSyncOptions {
  flyDuration?: number;
  flyZoom?: number;
}

export interface MarkerAnimationOptions {
  scale?: boolean;
  fade?: boolean;
  pulse?: boolean;
  bounce?: boolean;
  duration?: number;
}

const DEFAULT_FLY_DURATION = 1200;
const DEFAULT_FLY_ZOOM = 15;

export class MapSync {
  private map: {
    flyTo: (options: { center: [number, number]; zoom?: number; duration?: number; essential?: boolean }) => void;
    getZoom: () => number;
    getCenter: () => { lat: number; lng: number };
  } | null = null;
  private markers: Map<string, HTMLElement> = new Map();
  private options: Required<MapSyncOptions>;
  private animationFrameId: number | null = null;

  constructor(options?: MapSyncOptions) {
    this.options = {
      flyDuration: options?.flyDuration ?? DEFAULT_FLY_DURATION,
      flyZoom: options?.flyZoom ?? DEFAULT_FLY_ZOOM,
    };
  }

  /**
   * Attach to existing map instance
   */
  attach(map: MapSync['map']): void {
    this.map = map;
  }

  /**
   * Register a marker element for a new event
   * This is used when we want to animate a newly added marker
   */
  registerMarker(eventId: string, element: HTMLElement): void {
    this.markers.set(eventId, element);
  }

  /**
   * Remove marker from tracking
   */
  unregisterMarker(eventId: string): void {
    this.markers.delete(eventId);
  }

  /**
   * Check if marker already exists (prevent duplicates)
   */
  hasMarker(eventId: string): boolean {
    return this.markers.has(eventId);
  }

  /**
   * Fly camera to location with animation
   */
  flyToLocation(location: Location, zoom?: number): void {
    if (!this.map) {
      console.warn('MapSync: No map attached');
      return;
    }

    this.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom ?? this.options.flyZoom,
      duration: this.options.flyDuration,
      essential: true,
    });
  }

  /**
   * Fly to event location with full animation sequence
   */
  flyToEvent(event: MapEvent): void {
    this.flyToLocation(
      { latitude: event.latitude, longitude: event.longitude },
      this.options.flyZoom
    );
  }

  /**
   * Animate marker appearance with scale, fade, pulse, bounce
   */
  animateMarkerAppearance(element: HTMLElement, options?: MarkerAnimationOptions): void {
    const opts: Required<MarkerAnimationOptions> = {
      scale: options?.scale ?? true,
      fade: options?.fade ?? true,
      pulse: options?.pulse ?? true,
      bounce: options?.bounce ?? true,
      duration: options?.duration ?? 600,
    };

    // Start with invisible and small
    element.style.opacity = '0';
    element.style.transform = 'scale(0)';

    // Use requestAnimationFrame for smooth animation
    const startTime = performance.now();
    const duration = opts.duration;

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-back for bounce effect)
      const eased = this.easeOutBack(progress);

      if (opts.scale) {
        const scale = opts.bounce ? eased : this.easeOutCubic(progress);
        element.style.transform = `scale(${scale})`;
      }

      if (opts.fade) {
        element.style.opacity = String(progress);
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        // Animation complete, start pulse if enabled
        if (opts.pulse) {
          this.startPulseAnimation(element);
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Animate single marker with bounce effect
   */
  animateMarkerBounce(element: HTMLElement): void {
    const startTime = performance.now();
    const duration = 500;
    const bounceHeight = 20;

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Bounce up then down
      const bounceProgress = Math.sin(progress * Math.PI);
      const translateY = -bounceHeight * bounceProgress;

      element.style.transform = `translateY(${translateY}px)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.transform = '';
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Start continuous pulse animation
   */
  private startPulseAnimation(element: HTMLElement): void {
    element.classList.add('map-marker-pulse');
  }

  /**
   * Stop all animations
   */
  stopAnimations(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAnimations();
    this.markers.clear();
    this.map = null;
  }

  /**
   * Ease out cubic
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Ease out back (with overshoot)
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}

// Global map sync instance
let mapSyncInstance: MapSync | null = null;

export function getMapSync(options?: MapSyncOptions): MapSync {
  if (!mapSyncInstance) {
    mapSyncInstance = new MapSync(options);
  }
  return mapSyncInstance;
}

export function initMapSync(map: MapSync['map'], options?: MapSyncOptions): MapSync {
  const sync = getMapSync(options);
  sync.attach(map);
  return sync;
}

// Inject animation styles
export function injectMarkerAnimationStyles(): void {
  if (document.getElementById('marker-animation-styles')) return;

  const style = document.createElement('style');
  style.id = 'marker-animation-styles';
  style.textContent = `
    .map-marker-pulse {
      animation: markerPulse 1.5s ease-out infinite;
    }
    .map-marker-bounce {
      animation: markerBounce 0.5s ease-out;
    }
    @keyframes markerPulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
                    0 0 0 0 rgba(99, 102, 241, 0.4);
      }
      50% {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
                    0 0 0 12px rgba(99, 102, 241, 0);
      }
    }
    @keyframes markerBounce {
      0%, 100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-20px);
      }
      50% {
        transform: translateY(-10px);
      }
      70% {
        transform: translateY(-15px);
      }
    }
  `;
  document.head.appendChild(style);
}
