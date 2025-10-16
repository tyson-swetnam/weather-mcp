import { z } from 'zod';
import { nwsClient } from '../api/client.js';
import { Forecast, GridpointForecast, Period } from '../api/types.js';

// Input schemas for forecast tools
const PointForecastSchema = z.object({
  latitude: z.number().describe('Latitude in decimal degrees'),
  longitude: z.number().describe('Longitude in decimal degrees'),
  units: z.enum(['us', 'si']).optional().default('us').describe('Unit system (us/si)'),
  days: z.number().optional().default(7).describe('Number of forecast days'),
});

const HourlyForecastSchema = z.object({
  latitude: z.number().describe('Latitude in decimal degrees'),
  longitude: z.number().describe('Longitude in decimal degrees'),
  units: z.enum(['us', 'si']).optional().default('us').describe('Unit system (us/si)'),
  hours: z.number().optional().default(48).describe('Number of forecast hours'),
});

const GridpointForecastSchema = z.object({
  office: z.string().describe('Grid office (e.g., "PSR")'),
  gridX: z.number().describe('Grid X coordinate'),
  gridY: z.number().describe('Grid Y coordinate'),
  parameters: z.array(z.string()).optional().describe('Specific parameters to return'),
});

const PointMetadataSchema = z.object({
  latitude: z.number().describe('Latitude in decimal degrees'),
  longitude: z.number().describe('Longitude in decimal degrees'),
});

// Tool handlers

/**
 * Get 7-day forecast for a specific location
 */
async function getPointForecast(args: unknown) {
  const params = PointForecastSchema.parse(args);

  try {
    const forecast = await nwsClient.getForecast(
      params.latitude,
      params.longitude,
      params.units
    );

    // Limit to requested number of days
    const maxPeriods = params.days * 2; // Day and night periods
    const periods = forecast.properties.periods.slice(0, maxPeriods);

    // Group periods by day
    const dailyForecasts = [];
    for (let i = 0; i < periods.length; i += 2) {
      const dayPeriod = periods[i];
      const nightPeriod = periods[i + 1];

      dailyForecasts.push({
        date: dayPeriod.startTime.split('T')[0],
        day: {
          name: dayPeriod.name,
          temperature: dayPeriod.temperature,
          windSpeed: dayPeriod.windSpeed,
          windDirection: dayPeriod.windDirection,
          shortForecast: dayPeriod.shortForecast,
          detailedForecast: dayPeriod.detailedForecast,
          icon: dayPeriod.icon,
        },
        night: nightPeriod ? {
          name: nightPeriod.name,
          temperature: nightPeriod.temperature,
          windSpeed: nightPeriod.windSpeed,
          windDirection: nightPeriod.windDirection,
          shortForecast: nightPeriod.shortForecast,
          detailedForecast: nightPeriod.detailedForecast,
          icon: nightPeriod.icon,
        } : null,
      });
    }

    return {
      success: true,
      data: {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        units: params.units,
        forecast: dailyForecasts,
        elevation: forecast.properties.elevation,
        updateTime: forecast.properties.updateTime,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        generator: forecast.properties.forecastGenerator,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'FORECAST_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get hourly forecast for a specific location
 */
async function getHourlyForecast(args: unknown) {
  const params = HourlyForecastSchema.parse(args);

  try {
    const forecast = await nwsClient.getHourlyForecast(
      params.latitude,
      params.longitude,
      params.units
    );

    // Limit to requested number of hours
    const periods = forecast.properties.periods.slice(0, params.hours);

    // Format hourly data
    const hourlyData = periods.map((period: Period) => ({
      time: period.startTime,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      shortForecast: period.shortForecast,
      isDaytime: period.isDaytime,
      icon: period.icon,
    }));

    // Calculate summary statistics
    const temps = periods.map((p: Period) => p.temperature);
    const summary = {
      maxTemperature: Math.max(...temps),
      minTemperature: Math.min(...temps),
      avgTemperature: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
    };

    return {
      success: true,
      data: {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        units: params.units,
        hourlyForecast: hourlyData,
        summary,
        elevation: forecast.properties.elevation,
        updateTime: forecast.properties.updateTime,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        generator: forecast.properties.forecastGenerator,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'HOURLY_FORECAST_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get raw gridpoint forecast data
 */
async function getGridpointForecast(args: unknown) {
  const params = GridpointForecastSchema.parse(args);

  try {
    const gridData = await nwsClient.getGridpointForecast(
      params.office,
      params.gridX,
      params.gridY
    );

    // Extract requested parameters or default set
    const requestedParams = params.parameters || [
      'temperature',
      'dewpoint',
      'relativeHumidity',
      'windSpeed',
      'windDirection',
      'probabilityOfPrecipitation',
      'quantitativePrecipitation',
      'skyCover',
    ];

    const data: any = {
      grid: {
        office: params.office,
        x: params.gridX,
        y: params.gridY,
      },
      updateTime: gridData.properties.updateTime,
      validTimes: gridData.properties.validTimes,
      elevation: gridData.properties.elevation,
      parameters: {},
    };

    // Extract requested parameters
    for (const param of requestedParams) {
      if ((gridData.properties as any)[param]) {
        const paramData = (gridData.properties as any)[param];
        data.parameters[param] = {
          uom: paramData.uom,
          values: paramData.values,
        };
      }
    }

    // Add special parameters if available
    if (gridData.properties.hazards && gridData.properties.hazards.values.length > 0) {
      data.hazards = gridData.properties.hazards.values;
    }

    if (gridData.properties.weather && gridData.properties.weather.length > 0) {
      data.weather = gridData.properties.weather;
    }

    return {
      success: true,
      data,
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        availableParameters: Object.keys(gridData.properties).filter(
          key => !['@id', '@type', 'updateTime', 'validTimes', 'elevation', 'forecastOffice', 'gridId', 'gridX', 'gridY'].includes(key)
        ),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'GRIDPOINT_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get point metadata and forecast URLs
 */
async function getPointMetadata(args: unknown) {
  const params = PointMetadataSchema.parse(args);

  try {
    const point = await nwsClient.getPoint(params.latitude, params.longitude);

    return {
      success: true,
      data: {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        grid: {
          office: point.properties.gridId,
          x: point.properties.gridX,
          y: point.properties.gridY,
        },
        cwa: point.properties.cwa,
        forecastOffice: point.properties.forecastOffice,
        timeZone: point.properties.timeZone,
        radarStation: point.properties.radarStation,
        relativeLocation: point.properties.relativeLocation.properties,
        zones: {
          forecast: point.properties.forecastZone,
          county: point.properties.county,
          fireWeather: point.properties.fireWeatherZone,
        },
        urls: {
          forecast: point.properties.forecast,
          forecastHourly: point.properties.forecastHourly,
          forecastGridData: point.properties.forecastGridData,
          observationStations: point.properties.observationStations,
        },
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
        code: error.code || 'POINT_METADATA_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

// Export tools array for the MCP server
export const forecastTools = [
  {
    name: 'get_point_forecast',
    description: 'Get 7-day forecast for a specific location',
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
        units: {
          type: 'string',
          enum: ['us', 'si'],
          description: 'Unit system (us/si)',
          default: 'us',
        },
        days: {
          type: 'number',
          description: 'Number of forecast days (max 7)',
          default: 7,
        },
      },
      required: ['latitude', 'longitude'],
    },
    handler: getPointForecast,
  },
  {
    name: 'get_hourly_forecast',
    description: 'Get hourly forecast for a specific location',
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
        units: {
          type: 'string',
          enum: ['us', 'si'],
          description: 'Unit system (us/si)',
          default: 'us',
        },
        hours: {
          type: 'number',
          description: 'Number of forecast hours (max 156)',
          default: 48,
        },
      },
      required: ['latitude', 'longitude'],
    },
    handler: getHourlyForecast,
  },
  {
    name: 'get_gridpoint_forecast',
    description: 'Get raw forecast grid data for advanced analysis',
    inputSchema: {
      type: 'object',
      properties: {
        office: {
          type: 'string',
          description: 'Grid office (e.g., "PSR" for Phoenix)',
        },
        gridX: {
          type: 'number',
          description: 'Grid X coordinate',
        },
        gridY: {
          type: 'number',
          description: 'Grid Y coordinate',
        },
        parameters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific parameters to return',
        },
      },
      required: ['office', 'gridX', 'gridY'],
    },
    handler: getGridpointForecast,
  },
  {
    name: 'get_point_metadata',
    description: 'Get metadata and forecast URLs for a location',
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
      },
      required: ['latitude', 'longitude'],
    },
    handler: getPointMetadata,
  },
];