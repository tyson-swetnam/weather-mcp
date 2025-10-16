/**
 * Basic API tests for weather-mcp
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'https://api.weather.gov';
const USER_AGENT = 'weather-mcp-test/1.0.0 (test@example.com)';

// Test locations
const PHOENIX = { lat: 33.4484, lon: -112.0740 };
const TUCSON = { lat: 32.2226, lon: -110.9747 };
const FLAGSTAFF = { lat: 35.1983, lon: -111.6513 };

// Create axios client
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/geo+json',
  },
  timeout: 10000,
});

describe('NWS API Tests', () => {
  describe('Alerts API', () => {
    test('should fetch active alerts for Arizona', async () => {
      const response = await client.get('/alerts/active', {
        params: { area: 'AZ' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('features');
      expect(Array.isArray(response.data.features)).toBe(true);
    });

    test('should fetch Red Flag Warnings', async () => {
      const response = await client.get('/alerts/active', {
        params: {
          area: 'AZ',
          event: 'Red Flag Warning',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('features');
    });
  });

  describe('Point API', () => {
    test('should fetch point metadata for Phoenix', async () => {
      const response = await client.get(`/points/${PHOENIX.lat},${PHOENIX.lon}`);

      expect(response.status).toBe(200);
      expect(response.data.properties).toHaveProperty('gridId');
      expect(response.data.properties).toHaveProperty('gridX');
      expect(response.data.properties).toHaveProperty('gridY');
      expect(response.data.properties).toHaveProperty('fireWeatherZone');
    });

    test('should handle invalid coordinates', async () => {
      try {
        await client.get('/points/999,999');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Forecast API', () => {
    test('should fetch forecast for Tucson', async () => {
      // First get the point
      const pointResponse = await client.get(`/points/${TUCSON.lat},${TUCSON.lon}`);
      const forecastUrl = pointResponse.data.properties.forecast;

      // Get the forecast
      const forecastPath = forecastUrl.replace(BASE_URL, '');
      const response = await client.get(forecastPath);

      expect(response.status).toBe(200);
      expect(response.data.properties).toHaveProperty('periods');
      expect(Array.isArray(response.data.properties.periods)).toBe(true);
      expect(response.data.properties.periods.length).toBeGreaterThan(0);
    });
  });

  describe('Fire Weather Zones', () => {
    test('should fetch fire weather zone AZZ149', async () => {
      const response = await client.get('/zones/fire/AZZ149');

      expect(response.status).toBe(200);
      expect(response.data.properties).toHaveProperty('name');
      expect(response.data.properties).toHaveProperty('state');
      expect(response.data.properties.state).toBe('AZ');
    });

    test('should handle invalid zone ID', async () => {
      try {
        await client.get('/zones/fire/INVALID');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Stations API', () => {
    test('should fetch stations in Arizona', async () => {
      const response = await client.get('/stations', {
        params: { state: 'AZ', limit: 10 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('features');
      expect(Array.isArray(response.data.features)).toBe(true);
    });

    test('should fetch stations near Flagstaff', async () => {
      // Get point first
      const pointResponse = await client.get(`/points/${FLAGSTAFF.lat},${FLAGSTAFF.lon}`);
      const stationsUrl = pointResponse.data.properties.observationStations;

      // Get stations
      const stationsPath = stationsUrl.replace(BASE_URL, '');
      const response = await client.get(stationsPath);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('features');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          client.get('/alerts/active', { params: { area: 'AZ' } })
        );
      }

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBeGreaterThan(0);
    }, 30000);
  });
});

// Integration tests for MCP tools
describe('MCP Tool Integration Tests', () => {
  // These would test the actual tool implementations
  // For now, just placeholder tests

  test('fire weather tools should be defined', () => {
    const { fireWeatherTools } = require('../dist/tools/fireWeather.js');
    expect(fireWeatherTools).toBeDefined();
    expect(Array.isArray(fireWeatherTools)).toBe(true);
    expect(fireWeatherTools.length).toBeGreaterThan(0);
  });

  test('forecast tools should be defined', () => {
    const { forecastTools } = require('../dist/tools/forecast.js');
    expect(forecastTools).toBeDefined();
    expect(Array.isArray(forecastTools)).toBe(true);
    expect(forecastTools.length).toBeGreaterThan(0);
  });

  test('alert tools should be defined', () => {
    const { alertTools } = require('../dist/tools/alerts.js');
    expect(alertTools).toBeDefined();
    expect(Array.isArray(alertTools)).toBe(true);
    expect(alertTools.length).toBeGreaterThan(0);
  });

  test('station tools should be defined', () => {
    const { stationTools } = require('../dist/tools/stations.js');
    expect(stationTools).toBeDefined();
    expect(Array.isArray(stationTools)).toBe(true);
    expect(stationTools.length).toBeGreaterThan(0);
  });
});