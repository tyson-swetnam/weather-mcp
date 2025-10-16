import { z } from 'zod';
import { nwsClient } from '../api/client.js';
import { Alert, AlertCollection } from '../api/types.js';

// Input schemas for alert tools
const ActiveAlertsSchema = z.object({
  area: z.string().optional().describe('State or marine area code'),
  point: z.string().optional().describe('Lat,lon coordinates'),
  region: z.string().optional().describe('Region code'),
  zone: z.string().optional().describe('Forecast zone'),
  urgency: z.enum(['Immediate', 'Expected', 'Future', 'Past', 'Unknown']).optional(),
  severity: z.enum(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']).optional(),
  certainty: z.enum(['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown']).optional(),
  event: z.string().optional().describe('Event type (e.g., "Tornado Warning")'),
  limit: z.number().optional().default(100).describe('Maximum number of alerts'),
});

const AlertDetailsSchema = z.object({
  alertId: z.string().describe('Alert ID from NWS'),
});

const AlertsByTypeSchema = z.object({
  eventTypes: z.array(z.string()).describe('List of event types to filter'),
  area: z.string().optional().describe('State or area code'),
  activeOnly: z.boolean().optional().default(true).describe('Only show active alerts'),
});

// Tool handlers

/**
 * Get all active weather alerts with flexible filtering
 */
async function getActiveAlerts(args: unknown) {
  const params = ActiveAlertsSchema.parse(args);

  try {
    const alerts = await nwsClient.getAlerts({
      area: params.area,
      point: params.point,
      region: params.region,
      zone: params.zone,
      urgency: params.urgency,
      severity: params.severity,
      certainty: params.certainty,
      event: params.event,
      limit: params.limit,
    });

    // Filter for active alerts if not showing past
    let features = alerts.features;
    if (params.urgency !== 'Past') {
      const now = new Date();
      features = features.filter(f => {
        const expires = new Date(f.properties.expires);
        return expires > now;
      });
    }

    // Group alerts by severity for summary
    const severityGroups = {
      Extreme: 0,
      Severe: 0,
      Moderate: 0,
      Minor: 0,
      Unknown: 0,
    };

    const formattedAlerts = features.map(f => {
      const alert = f.properties;
      severityGroups[alert.severity]++;

      return {
        id: f.id,
        event: alert.event,
        headline: alert.headline,
        severity: alert.severity,
        urgency: alert.urgency,
        certainty: alert.certainty,
        areas: alert.areaDesc,
        effective: alert.effective,
        expires: alert.expires,
        senderName: alert.senderName,
        description: alert.description.substring(0, 500) + (alert.description.length > 500 ? '...' : ''),
        instruction: alert.instruction,
        response: alert.response,
        geometry: f.geometry,
      };
    });

    return {
      success: true,
      data: {
        count: formattedAlerts.length,
        summary: severityGroups,
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
        code: error.code || 'ALERT_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get alerts filtered by specific event types
 */
async function getAlertsByType(args: unknown) {
  const params = AlertsByTypeSchema.parse(args);

  try {
    // Get all alerts for the area
    const alerts = await nwsClient.getAlerts({
      area: params.area,
    });

    // Filter by event types
    let features = alerts.features.filter(f =>
      params.eventTypes.includes(f.properties.event)
    );

    // Filter for active only if requested
    if (params.activeOnly) {
      const now = new Date();
      features = features.filter(f => {
        const expires = new Date(f.properties.expires);
        return expires > now;
      });
    }

    // Group by event type
    const eventGroups: Record<string, any[]> = {};
    params.eventTypes.forEach(type => {
      eventGroups[type] = [];
    });

    features.forEach(f => {
      const alert = f.properties;
      if (eventGroups[alert.event]) {
        eventGroups[alert.event].push({
          id: f.id,
          headline: alert.headline,
          severity: alert.severity,
          urgency: alert.urgency,
          areas: alert.areaDesc,
          expires: alert.expires,
        });
      }
    });

    return {
      success: true,
      data: {
        totalCount: features.length,
        eventTypes: eventGroups,
        summary: Object.keys(eventGroups).map(type => ({
          event: type,
          count: eventGroups[type].length,
        })),
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        activeOnly: params.activeOnly,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'ALERT_TYPE_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

/**
 * Get severe weather alerts (convenience function)
 */
async function getSevereWeatherAlerts(args: unknown) {
  const SevereWeatherSchema = z.object({
    area: z.string().optional().describe('State or area code'),
    includeWatches: z.boolean().optional().default(true).describe('Include watches'),
    includeWarnings: z.boolean().optional().default(true).describe('Include warnings'),
  });

  const params = SevereWeatherSchema.parse(args);

  try {
    // Define severe weather event types
    const severeEvents: string[] = [];

    if (params.includeWarnings) {
      severeEvents.push(
        'Tornado Warning',
        'Severe Thunderstorm Warning',
        'Flash Flood Warning',
        'Flood Warning',
        'Winter Storm Warning',
        'Ice Storm Warning',
        'Blizzard Warning',
        'High Wind Warning',
        'Hurricane Warning',
        'Extreme Wind Warning'
      );
    }

    if (params.includeWatches) {
      severeEvents.push(
        'Tornado Watch',
        'Severe Thunderstorm Watch',
        'Flash Flood Watch',
        'Flood Watch',
        'Winter Storm Watch',
        'High Wind Watch',
        'Hurricane Watch'
      );
    }

    // Get alerts
    const alerts = await nwsClient.getAlerts({
      area: params.area,
      severity: 'Severe,Extreme',
    });

    // Filter for severe weather events
    const severeAlerts = alerts.features.filter(f =>
      severeEvents.some(event => f.properties.event.includes(event))
    );

    // Sort by severity and urgency
    const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
    const urgencyOrder = { Immediate: 0, Expected: 1, Future: 2, Past: 3, Unknown: 4 };

    severeAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.properties.severity] - severityOrder[b.properties.severity];
      if (severityDiff !== 0) return severityDiff;
      return urgencyOrder[a.properties.urgency] - urgencyOrder[b.properties.urgency];
    });

    const formattedAlerts = severeAlerts.map(f => ({
      id: f.id,
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      urgency: f.properties.urgency,
      areas: f.properties.areaDesc,
      effective: f.properties.effective,
      expires: f.properties.expires,
      instruction: f.properties.instruction,
    }));

    return {
      success: true,
      data: {
        count: formattedAlerts.length,
        mostSevere: formattedAlerts[0] || null,
        alerts: formattedAlerts,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        includeWatches: params.includeWatches,
        includeWarnings: params.includeWarnings,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'SEVERE_WEATHER_ERROR',
        message: error.message,
        details: error.details || {},
      },
    };
  }
}

// Export tools array for the MCP server
export const alertTools = [
  {
    name: 'get_active_alerts',
    description: 'Get all active weather alerts with flexible filtering options',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'State or marine area code' },
        point: { type: 'string', description: 'Lat,lon coordinates' },
        region: { type: 'string', description: 'Region code' },
        zone: { type: 'string', description: 'Forecast zone' },
        urgency: {
          type: 'string',
          enum: ['Immediate', 'Expected', 'Future', 'Past', 'Unknown'],
          description: 'Alert urgency level',
        },
        severity: {
          type: 'string',
          enum: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'],
          description: 'Alert severity level',
        },
        certainty: {
          type: 'string',
          enum: ['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown'],
          description: 'Alert certainty level',
        },
        event: { type: 'string', description: 'Specific event type' },
        limit: { type: 'number', description: 'Maximum alerts to return', default: 100 },
      },
    },
    handler: getActiveAlerts,
  },
  {
    name: 'get_alerts_by_type',
    description: 'Get weather alerts filtered by specific event types',
    inputSchema: {
      type: 'object',
      properties: {
        eventTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of event types to filter',
        },
        area: { type: 'string', description: 'State or area code' },
        activeOnly: {
          type: 'boolean',
          description: 'Only show active alerts',
          default: true,
        },
      },
      required: ['eventTypes'],
    },
    handler: getAlertsByType,
  },
  {
    name: 'get_severe_weather_alerts',
    description: 'Get severe weather warnings and watches',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'State or area code' },
        includeWatches: {
          type: 'boolean',
          description: 'Include weather watches',
          default: true,
        },
        includeWarnings: {
          type: 'boolean',
          description: 'Include weather warnings',
          default: true,
        },
      },
    },
    handler: getSevereWeatherAlerts,
  },
];