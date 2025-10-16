import { z } from 'zod';
import { nwsClient } from '../api/client.js';
import { StationCollection, Station } from '../api/types.js';

// Input schemas for station tools
const StationsSchema = z.object({
  state: z.string().optional().describe('State code (e.g., "AZ")'),
  limit: z.number().optional().default(50).describe('Maximum number of stations'),
});

const StationsNearPointSchema = z.object({
  latitude: z.number().describe('Latitude in decimal degrees'),
  longitude: z.number().describe('Longitude in decimal degrees'),
  limit: z.number().optional().default(10).describe('Maximum number of stations'),
  radius: z.number().optional().describe('Search radius in kilometers'),
});

const StationDetailsSchema = z.object({
  stationId: z.string().describe('Station identifier (e.g., "KPHX")'),
});

// Tool handlers

/**
 * Get weather station information
 */
async function getWeatherStations(args: unknown) {
  const params = StationsSchema.parse(args);

  try {
    const stations = await nwsClient.getStations({
      state: params.state,
      limit: params.limit,
    });

    // Format station data
    const formattedStations = stations.features.map(f => ({
      id: f.properties.stationIdentifier,
      name: f.properties.name,
      coordinates: {
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      },
      elevation: {
        value: f.properties.elevation.value,
        unit: f.properties.elevation.unitCode,
      },
      timeZone: f.properties.timeZone,
      county: f.properties.county,
      fireWeatherZone: f.properties.fireWeatherZone,
    }));

    // Group by state if no specific state requested
    const stateGroups: Record<string, any[]> = {};
    if (!params.state) {
      formattedStations.forEach(station => {
        // Extract state from station name or county
        const stateMatch = station.name.match(/,\s*([A-Z]{2})$/);
        if (stateMatch) {
          const state = stateMatch[1];
          if (!stateGroups[state]) {
            stateGroups[state] = [];
          }
          stateGroups[state].push(station);
        }
      });
    }

    return {
      success: true,
      data: {
        count: formattedStations.length,
        stations: formattedStations,
        byState: params.state ? null : stateGroups,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        query: params,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'STATION_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get weather stations near a specific point
 */
async function getStationsNearPoint(args: unknown) {
  const params = StationsNearPointSchema.parse(args);

  try {
    const stations = await nwsClient.getStationsNearPoint(
      params.latitude,
      params.longitude,
      params.limit
    );

    // Calculate distances from the point
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Format and sort stations by distance
    const formattedStations = stations.features.map(f => {
      const stationLat = f.geometry.coordinates[1];
      const stationLon = f.geometry.coordinates[0];
      const distance = calculateDistance(
        params.latitude,
        params.longitude,
        stationLat,
        stationLon
      );

      return {
        id: f.properties.stationIdentifier,
        name: f.properties.name,
        coordinates: {
          latitude: stationLat,
          longitude: stationLon,
        },
        distance: {
          value: Math.round(distance * 10) / 10,
          unit: 'km',
        },
        elevation: {
          value: f.properties.elevation.value,
          unit: f.properties.elevation.unitCode,
        },
        timeZone: f.properties.timeZone,
        county: f.properties.county,
        fireWeatherZone: f.properties.fireWeatherZone,
      };
    });

    // Sort by distance
    formattedStations.sort((a, b) => a.distance.value - b.distance.value);

    // Filter by radius if specified
    let filteredStations = formattedStations;
    if (params.radius !== undefined) {
      const radius = params.radius;
      filteredStations = formattedStations.filter(s => s.distance.value <= radius);
    }

    // Find nearest station
    const nearest = filteredStations[0] || null;

    return {
      success: true,
      data: {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        count: filteredStations.length,
        nearest,
        stations: filteredStations,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        searchRadius: params.radius || 'unlimited',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'STATION_NEAR_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get fire weather observation stations
 */
async function getFireWeatherStations(args: unknown) {
  const FireWeatherStationsSchema = z.object({
    state: z.string().optional().describe('State code'),
    fireZone: z.string().optional().describe('Fire weather zone ID'),
    limit: z.number().optional().default(50).describe('Maximum stations'),
  });

  const params = FireWeatherStationsSchema.parse(args);

  try {
    // Get all stations for the state
    const stations = await nwsClient.getStations({
      state: params.state,
      limit: 500, // Get more to filter
    });

    // Filter for stations with fire weather zones
    let fireStations = stations.features.filter(f =>
      f.properties.fireWeatherZone && f.properties.fireWeatherZone.length > 0
    );

    // Filter by specific fire zone if provided
    if (params.fireZone !== undefined) {
      const fireZone = params.fireZone;
      fireStations = fireStations.filter(f =>
        f.properties.fireWeatherZone.includes(fireZone)
      );
    }

    // Limit results
    fireStations = fireStations.slice(0, params.limit);

    // Group by fire weather zone
    const zoneGroups: Record<string, any[]> = {};

    const formattedStations = fireStations.map(f => {
      const station = {
        id: f.properties.stationIdentifier,
        name: f.properties.name,
        coordinates: {
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        },
        elevation: {
          value: f.properties.elevation.value,
          unit: f.properties.elevation.unitCode,
        },
        fireWeatherZone: f.properties.fireWeatherZone,
        county: f.properties.county,
      };

      // Add to zone groups
      const zoneId = f.properties.fireWeatherZone.split('/').pop();
      if (zoneId) {
        if (!zoneGroups[zoneId]) {
          zoneGroups[zoneId] = [];
        }
        zoneGroups[zoneId].push(station);
      }

      return station;
    });

    return {
      success: true,
      data: {
        count: formattedStations.length,
        stations: formattedStations,
        byZone: zoneGroups,
        zones: Object.keys(zoneGroups),
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        state: params.state,
        fireZone: params.fireZone,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'FIRE_STATION_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

// Export tools array for the MCP server
export const stationTools = [
  {
    name: 'get_weather_stations',
    description: 'Get weather station information by state',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'State code (e.g., "AZ")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of stations',
          default: 50,
        },
      },
    },
    handler: getWeatherStations,
  },
  {
    name: 'get_stations_near_point',
    description: 'Get weather stations near a specific location',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'Latitude in decimal degrees',
        },
        longitude: {
          type: 'number',
          description: 'Longitude in decimal degrees',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of stations',
          default: 10,
        },
        radius: {
          type: 'number',
          description: 'Search radius in kilometers',
        },
      },
      required: ['latitude', 'longitude'],
    },
    handler: getStationsNearPoint,
  },
  {
    name: 'get_fire_weather_stations',
    description: 'Get weather stations in fire weather zones',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'State code',
        },
        fireZone: {
          type: 'string',
          description: 'Fire weather zone ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum stations',
          default: 50,
        },
      },
    },
    handler: getFireWeatherStations,
  },
];