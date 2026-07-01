// Location Service - Mapbox Geocoding and Reverse Geocoding

export interface GeocodingResult {
  address: string;
  city: string;
  country: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  street: string;
  city: string;
  country: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

export interface LocationServiceConfig {
  accessToken: string;
  language?: string;
  limit?: number;
}

export class LocationService {
  private accessToken: string;
  private language: string;
  private limit: number;
  private cache: Map<string, GeocodingResult | ReverseGeocodingResult> = new Map();
  private abortController: AbortController | null = null;

  constructor(config: LocationServiceConfig) {
    this.accessToken = config.accessToken;
    this.language = config.language || 'en';
    this.limit = config.limit || 5;
  }

  async searchAddress(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 2) return [];

    this.abortController?.abort();
    this.abortController = new AbortController();

    const cacheKey = `search:${query.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return [this.cache.get(cacheKey) as GeocodingResult];
    }

    try {
      const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json');
      url.searchParams.set('access_token', this.accessToken);
      url.searchParams.set('language', this.language);
      url.searchParams.set('limit', this.limit.toString());
      url.searchParams.set('types', 'address,poi,place,locality');

      const response = await fetch(url.toString(), { signal: this.abortController.signal });

      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

      const data = await response.json();
      const results: GeocodingResult[] = data.features?.map((feature: Record<string, unknown>) => {
        const context = feature.context as Array<{ id: string; text: string }> || [];
        return {
          address: feature.text as string || '',
          city: context.find((c) => c.id.startsWith('place.'))?.text || '',
          country: context.find((c) => c.id.startsWith('country.'))?.text || '',
          placeId: feature.id as string || '',
          latitude: (feature.center as number[])?.[1] || 0,
          longitude: (feature.center as number[])?.[0] || 0,
        };
      }) || [];

      if (results.length > 0) this.cache.set(cacheKey, results[0]);
      return results;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return [];
      console.error('Geocoding error:', error);
      return [];
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodingResult | null> {
    if (!navigator.onLine) {
      return this.getOfflineAddress(latitude, longitude);
    }

    const cacheKey = `reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as ReverseGeocodingResult;
    }

    try {
      const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + longitude + ',' + latitude + '.json');
      url.searchParams.set('access_token', this.accessToken);
      url.searchParams.set('language', this.language);
      url.searchParams.set('limit', '1');
      url.searchParams.set('types', 'address,poi,place');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);

      const data = await response.json();
      if (!data.features || data.features.length === 0) {
        return this.getOfflineAddress(latitude, longitude);
      }

      const feature = data.features[0] as Record<string, unknown>;
      const context = feature.context as Array<{ id: string; text: string }> || [];

      const result: ReverseGeocodingResult = {
        formattedAddress: feature.place_name as string || '',
        street: this.extractStreet(feature),
        city: context.find((c) => c.id.startsWith('place.'))?.text || '',
        country: context.find((c) => c.id.startsWith('country.'))?.text || '',
        placeId: feature.id as string || '',
        latitude,
        longitude,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return this.getOfflineAddress(latitude, longitude);
    }
  }

  private extractStreet(feature: Record<string, unknown>): string {
    const properties = feature.properties as Record<string, unknown> || {};
    const address = properties.address as string || '';
    const name = feature.text as string || '';
    return address ? `${name} ${address}`.trim() : name;
  }

  private getOfflineAddress(latitude: number, longitude: number): ReverseGeocodingResult {
    return {
      formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      street: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: 'Unknown',
      country: '',
      placeId: '',
      latitude,
      longitude,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  cancel(): void {
    this.abortController?.abort();
  }
}

// Singleton
let instance: LocationService | null = null;

export function initLocationService(accessToken: string): LocationService {
  instance = new LocationService({ accessToken });
  return instance;
}

export function getLocationService(): LocationService {
  if (!instance) throw new Error('LocationService not initialized');
  return instance;
}
