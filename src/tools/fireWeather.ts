import { z } from 'zod';
import { nwsClient } from '../api/client.js';
import { Alert, AlertCollection, FireWeatherZone } from '../api/types.js';

// Input schemas for fire weather tools
const FireWeatherAlertsSchema = z.object({
  area: z.string().optional().describe('State code (e.g., "AZ", "NM")'),
  point: z.string().optional().describe('Lat,lon coordinates (e.g., "33.4484,-112.0740")'),
  zone: z.string().optional().describe('Fire weather zone ID (e.g., "AZZ149")'),
  urgency: z.enum(['Immediate', 'Expected', 'Future', 'Past', 'Unknown']).optional(),
  includeExpired: z.boolean().optional().default(false),
});

const FireWeatherZoneSchema = z.object({
  zoneId: z.string().describe('Fire weather zone identifier (e.g., "AZZ149")'),
});

const FireWeatherForecastSchema = z.object({
  office: z.string().describe('NWS office code (e.g., "PSR" for Phoenix)'),
  zone: z.string().optional().describe('Specific fire zone'),
});

const FireDangerIndexSchema = z.object({
  latitude: z.number().describe('Latitude in decimal degrees'),
  longitude: z.number().describe('Longitude in decimal degrees'),
  hours: z.number().optional().default(24).describe('Forecast hours (default: 24)'),
});

// Tool handlers

/**
 * Get active fire weather alerts (Red Flag Warnings, Fire Weather Watches)
 */
async function getFireWeatherAlerts(args: unknown) {
  const params = FireWeatherAlertsSchema.parse(args);

  try {
    // Get fire weather specific alerts
    const alerts = await nwsClient.getFireWeatherAlerts({
      area: params.area,
      point: params.point,
      zone: params.zone,
    });

    // Filter by urgency if specified
    let features = alerts.features;
    if (params.urgency) {
      features = features.filter(f => f.properties.urgency === params.urgency);
    }

    // Filter out expired alerts unless requested
    if (!params.includeExpired) {
      const now = new Date();
      features = features.filter(f => {
        const expires = new Date(f.properties.expires);
        return expires > now;
      });
    }

    // Format the response
    const formattedAlerts = features.map(f => ({
      id: f.id,
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      urgency: f.properties.urgency,
      certainty: f.properties.certainty,
      areas: f.properties.areaDesc,
      zones: f.properties.affectedZones,
      effective: f.properties.effective,
      expires: f.properties.expires,
      description: f.properties.description,
      instruction: f.properties.instruction,
      parameters: {
        windSpeed: f.properties.parameters?.maxWindSpeed?.[0],
        windGust: f.properties.parameters?.maxWindGust?.[0],
        relativeHumidity: f.properties.parameters?.minRelativeHumidity?.[0],
      },
    }));

    return {
      success: true,
      data: {
        count: formattedAlerts.length,
        alerts: formattedAlerts,
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
        code: error.code || 'FIRE_WEATHER_ALERT_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get detailed fire weather zone information
 */
async function getFireWeatherZone(args: unknown) {
  const params = FireWeatherZoneSchema.parse(args);

  try {
    const zone = await nwsClient.getFireWeatherZone(params.zoneId);

    // Get current alerts for this zone
    const alerts = await nwsClient.getFireWeatherAlerts({
      zone: params.zoneId,
    });

    return {
      success: true,
      data: {
        zone: {
          id: zone.properties.id,
          name: zone.properties.name,
          state: zone.properties.state,
          timeZone: zone.properties.timeZone,
          forecastOffices: zone.properties.forecastOffices,
          observationStations: zone.properties.observationStations,
          geometry: zone.geometry,
        },
        activeAlerts: alerts.features.map(f => ({
          event: f.properties.event,
          severity: f.properties.severity,
          expires: f.properties.expires,
        })),
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'FIRE_ZONE_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get Fire Weather Forecast (FWF) products
 */
async function getFireWeatherForecast(args: unknown) {
  const params = FireWeatherForecastSchema.parse(args);

  try {
    const forecast = await nwsClient.getFireWeatherForecast(params.office);

    // Parse the forecast products
    const products = forecast['@graph'] || [];

    // Filter for specific zone if provided
    let relevantProducts = products;
    if (params.zone) {
      relevantProducts = products.filter((p: any) =>
        p.productCode?.includes(params.zone) ||
        p.productText?.includes(params.zone)
      );
    }

    return {
      success: true,
      data: {
        office: params.office,
        zone: params.zone,
        products: relevantProducts.map((p: any) => ({
          id: p.id,
          issuanceTime: p.issuanceTime,
          productCode: p.productCode,
          productName: p.productName,
          productText: p.productText,
        })),
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'FIRE_FORECAST_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Calculate fire danger indices from gridpoint data
 */
async function getFireDangerIndex(args: unknown) {
  const params = FireDangerIndexSchema.parse(args);

  try {
    // Get the point information
    const point = await nwsClient.getPoint(params.latitude, params.longitude);

    // Get gridpoint forecast data
    const gridData = await nwsClient.getGridpointForecast(
      point.properties.gridId,
      point.properties.gridX,
      point.properties.gridY
    );

    // Extract fire-relevant parameters
    const currentTime = new Date();
    const futureTime = new Date(currentTime.getTime() + params.hours * 60 * 60 * 1000);

    // Find values within the time range
    const findValuesInRange = (values: any[]) => {
      return values.filter(v => {
        const time = new Date(v.validTime.split('/')[0]);
        return time >= currentTime && time <= futureTime;
      });
    };

    const temperature = findValuesInRange(gridData.properties.temperature.values);
    const humidity = findValuesInRange(gridData.properties.relativeHumidity.values);
    const windSpeed = findValuesInRange(gridData.properties.windSpeed.values);
    const windGust = gridData.properties.windGust
      ? findValuesInRange(gridData.properties.windGust.values)
      : [];

    // Calculate simple fire danger indices
    const fireIndices = temperature.map((temp, i) => {
      const rh = humidity[i]?.value || 50;
      const ws = windSpeed[i]?.value || 0;
      const tempF = temp.value * 9/5 + 32; // Convert C to F

      // Simple Fire Danger Index calculation
      // Higher temperature, lower humidity, higher wind = higher danger
      const tempFactor = Math.max(0, (tempF - 50) / 50); // 0-1 scale
      const rhFactor = Math.max(0, (100 - rh) / 100); // 0-1 scale
      const windFactor = Math.min(1, ws / 40); // 0-1 scale, max at 40 mph

      const dangerIndex = (tempFactor * 0.4 + rhFactor * 0.4 + windFactor * 0.2) * 100;

      return {
        time: temp.validTime,
        temperature: tempF,
        relativeHumidity: rh,
        windSpeed: ws,
        dangerIndex: Math.round(dangerIndex),
        dangerLevel:
          dangerIndex < 25 ? 'Low' :
          dangerIndex < 50 ? 'Moderate' :
          dangerIndex < 75 ? 'High' :
          'Extreme',
      };
    });

    // Get Red Flag Threat Index if available
    const redFlagIndex = gridData.properties.redFlagThreatIndex
      ? findValuesInRange(gridData.properties.redFlagThreatIndex.values)
      : [];

    return {
      success: true,
      data: {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
          gridId: point.properties.gridId,
          gridX: point.properties.gridX,
          gridY: point.properties.gridY,
        },
        indices: fireIndices,
        redFlagThreatIndex: redFlagIndex,
        summary: {
          maxDangerIndex: Math.max(...fireIndices.map(i => i.dangerIndex)),
          avgDangerIndex: Math.round(
            fireIndices.reduce((sum, i) => sum + i.dangerIndex, 0) / fireIndices.length
          ),
          criticalHours: fireIndices.filter(i => i.dangerLevel === 'High' || i.dangerLevel === 'Extreme').length,
        },
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        forecastHours: params.hours,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'FIRE_DANGER_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

// Export tools array for the MCP server
export const fireWeatherTools = [
  {
    name: 'get_fire_weather_alerts',
    description: 'Get active Red Flag Warnings and Fire Weather Watches for an area',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'State code (e.g., "AZ", "NM")' },
        point: { type: 'string', description: 'Lat,lon coordinates' },
        zone: { type: 'string', description: 'Fire weather zone ID' },
        urgency: {
          type: 'string',
          enum: ['Immediate', 'Expected', 'Future', 'Past', 'Unknown'],
          description: 'Filter by urgency level',
        },
        includeExpired: { type: 'boolean', description: 'Include expired alerts' },
      },
    },
    handler: getFireWeatherAlerts,
  },
  {
    name: 'get_fire_weather_zone',
    description: 'Get detailed information about a specific fire weather zone',
    inputSchema: {
      type: 'object',
      properties: {
        zoneId: {
          type: 'string',
          description: 'Fire weather zone identifier (e.g., "AZZ149")',
        },
      },
      required: ['zoneId'],
    },
    handler: getFireWeatherZone,
  },
  {
    name: 'get_fire_weather_forecast',
    description: 'Get Fire Weather Forecast (FWF) products for an NWS office',
    inputSchema: {
      type: 'object',
      properties: {
        office: {
          type: 'string',
          description: 'NWS office code (e.g., "PSR" for Phoenix)',
        },
        zone: {
          type: 'string',
          description: 'Specific fire zone (optional)',
        },
      },
      required: ['office'],
    },
    handler: getFireWeatherForecast,
  },
  {
    name: 'get_fire_danger_index',
    description: 'Calculate fire danger indices based on weather parameters',
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
        hours: {
          type: 'number',
          description: 'Forecast hours (default: 24)',
          default: 24,
        },
      },
      required: ['latitude', 'longitude'],
    },
    handler: getFireDangerIndex,
  },
];