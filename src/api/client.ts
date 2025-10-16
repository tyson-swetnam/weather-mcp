import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';
import { CacheManager } from '../cache/cacheManager.js';
import {
  AlertCollection,
  Forecast,
  GridpointForecast,
  StationCollection,
  FireWeatherZone,
  Point,
  NWSError
} from './types.js';

dotenv.config();

// Configuration
const BASE_URL = 'https://api.weather.gov';
const USER_AGENT = process.env.NWS_USER_AGENT || 'weather-mcp/1.0.0 (weather-mcp@github.com)';
const RATE_LIMIT = parseInt(process.env.NWS_RATE_LIMIT || '5', 10);

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  ALERTS: parseInt(process.env.CACHE_TTL_ALERTS || '300', 10),      // 5 minutes
  FORECAST: parseInt(process.env.CACHE_TTL_FORECAST || '3600', 10), // 1 hour
  GRID_DATA: parseInt(process.env.CACHE_TTL_GRID_DATA || '1800', 10), // 30 minutes
  STATIONS: parseInt(process.env.CACHE_TTL_STATIONS || '86400', 10),  // 24 hours
  FIRE_ZONES: parseInt(process.env.CACHE_TTL_FIRE_ZONES || '43200', 10), // 12 hours
};

export class NWSClient {
  private client: AxiosInstance;
  private queue: PQueue;
  private cache: CacheManager;

  constructor() {
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/geo+json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Create rate limiting queue
    this.queue = new PQueue({
      concurrency: RATE_LIMIT,
      interval: 1000, // per second
      intervalCap: RATE_LIMIT,
    });

    // Initialize cache
    this.cache = new CacheManager();

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }

  /**
   * Handle API errors
   */
  private async handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as NWSError;

      // Handle rate limiting
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

        console.error(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Retry the request
        return this.client.request(error.config!);
      }

      // Throw formatted error
      throw {
        code: `NWS_${status}`,
        message: data?.detail || error.message,
        status,
        details: data,
      };
    }

    throw {
      code: 'NETWORK_ERROR',
      message: error.message,
      details: {},
    };
  }

  /**
   * Make a cached GET request
   */
  private async cachedGet<T>(
    url: string,
    ttl: number,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const cacheKey = `${url}${JSON.stringify(config?.params || {})}`;

    // Check cache first
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Make request through rate limiter
    const response = await this.queue.add(async () => {
      return this.client.get<T>(url, config);
    });

    if (response) {
      const data = response.data;
      this.cache.set(cacheKey, data, ttl);
      return data;
    }

    throw new Error('No response received');
  }

  /**
   * Get active weather alerts
   */
  async getAlerts(params?: {
    area?: string;
    point?: string;
    region?: string;
    zone?: string;
    urgency?: string;
    severity?: string;
    certainty?: string;
    event?: string;
    limit?: number;
  }): Promise<AlertCollection> {
    return this.cachedGet<AlertCollection>(
      '/alerts/active',
      CACHE_TTL.ALERTS,
      { params }
    );
  }

  /**
   * Get fire weather alerts specifically
   */
  async getFireWeatherAlerts(params?: {
    area?: string;
    point?: string;
    zone?: string;
  }): Promise<AlertCollection> {
    const queryParams: any = { ...params };

    // Add fire weather specific event filters
    queryParams.event = ['Red Flag Warning', 'Fire Weather Watch'].join(',');

    return this.getAlerts(queryParams);
  }

  /**
   * Get point metadata
   */
  async getPoint(latitude: number, longitude: number): Promise<Point> {
    return this.cachedGet<Point>(
      `/points/${latitude},${longitude}`,
      CACHE_TTL.FORECAST
    );
  }

  /**
   * Get forecast for a point
   */
  async getForecast(latitude: number, longitude: number, units: 'us' | 'si' = 'us'): Promise<Forecast> {
    // First get the point to find the forecast URL
    const point = await this.getPoint(latitude, longitude);
    const forecastUrl = point.properties.forecast;

    // Extract path from full URL
    const path = forecastUrl.replace(BASE_URL, '');

    return this.cachedGet<Forecast>(
      path,
      CACHE_TTL.FORECAST,
      { params: { units } }
    );
  }

  /**
   * Get hourly forecast for a point
   */
  async getHourlyForecast(latitude: number, longitude: number, units: 'us' | 'si' = 'us'): Promise<Forecast> {
    // First get the point to find the forecast URL
    const point = await this.getPoint(latitude, longitude);
    const forecastUrl = point.properties.forecastHourly;

    // Extract path from full URL
    const path = forecastUrl.replace(BASE_URL, '');

    return this.cachedGet<Forecast>(
      path,
      CACHE_TTL.FORECAST,
      { params: { units } }
    );
  }

  /**
   * Get gridpoint forecast data
   */
  async getGridpointForecast(
    office: string,
    gridX: number,
    gridY: number
  ): Promise<GridpointForecast> {
    return this.cachedGet<GridpointForecast>(
      `/gridpoints/${office}/${gridX},${gridY}`,
      CACHE_TTL.GRID_DATA
    );
  }

  /**
   * Get fire weather zone information
   */
  async getFireWeatherZone(zoneId: string): Promise<FireWeatherZone> {
    return this.cachedGet<FireWeatherZone>(
      `/zones/fire/${zoneId}`,
      CACHE_TTL.FIRE_ZONES
    );
  }

  /**
   * Get weather stations
   */
  async getStations(params?: {
    state?: string;
    limit?: number;
  }): Promise<StationCollection> {
    return this.cachedGet<StationCollection>(
      '/stations',
      CACHE_TTL.STATIONS,
      { params }
    );
  }

  /**
   * Get stations near a point
   */
  async getStationsNearPoint(
    latitude: number,
    longitude: number,
    limit: number = 10
  ): Promise<StationCollection> {
    // First get the point to find nearby stations URL
    const point = await this.getPoint(latitude, longitude);
    const stationsUrl = point.properties.observationStations;

    // Extract path from full URL
    const path = stationsUrl.replace(BASE_URL, '');

    return this.cachedGet<StationCollection>(
      path,
      CACHE_TTL.STATIONS,
      { params: { limit } }
    );
  }

  /**
   * Get fire weather forecast products
   */
  async getFireWeatherForecast(office: string): Promise<any> {
    return this.cachedGet<any>(
      `/products/types/FWF/locations/${office}`,
      CACHE_TTL.FORECAST
    );
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; keys: number } {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const nwsClient = new NWSClient();