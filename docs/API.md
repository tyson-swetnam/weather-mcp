# weather-mcp API Reference

Comprehensive API documentation for the weather-mcp Model Context Protocol server.

## Table of Contents

1. [Configuration](#configuration)
2. [MCP Server Interface](#mcp-server-interface)
3. [Fire Weather Tools](#fire-weather-tools)
4. [Forecast Tools](#forecast-tools)
5. [Alert Tools](#alert-tools)
6. [Station Tools](#station-tools)
7. [Response Format](#response-format)
8. [Error Handling](#error-handling)
9. [NWS API Integration](#nws-api-integration)

## Configuration

### Environment Variables

Configure the server behavior using these environment variables in your `.env` file:

#### Required Configuration

```env
# User-Agent header (REQUIRED by NWS API)
NWS_USER_AGENT=weather-mcp/1.0.0 (your.email@example.com)
```

#### Optional Configuration

```env
# Rate Limiting
NWS_RATE_LIMIT=5              # Requests per second (default: 5)

# Cache TTL Settings (in seconds)
CACHE_TTL_ALERTS=300          # 5 minutes (default)
CACHE_TTL_FORECAST=3600       # 1 hour (default)
CACHE_TTL_GRID_DATA=1800      # 30 minutes (default)
CACHE_TTL_STATIONS=86400      # 24 hours (default)
CACHE_TTL_FIRE_ZONES=43200    # 12 hours (default)

# Cache Control
CACHE_ENABLED=true            # Enable/disable caching (default: true)

# Server Identification
MCP_SERVER_NAME=weather-mcp   # Server name (default: weather-mcp)
MCP_SERVER_VERSION=1.0.0      # Server version (default: 1.0.0)

# Logging
LOG_LEVEL=info                # Log level: debug, info, warn, error (default: info)
DEBUG=false                   # Enable debug mode (default: false)
```

### TypeScript Configuration

The project uses TypeScript with strict mode enabled:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## MCP Server Interface

The server implements the Model Context Protocol specification and communicates via stdio.

### Server Information

```json
{
  "name": "weather-mcp",
  "version": "1.0.0",
  "capabilities": {
    "tools": {}
  }
}
```

### Tool Discovery

List all available tools:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**
```json
{
  "tools": [
    {
      "name": "get_fire_weather_alerts",
      "description": "Get active Red Flag Warnings and Fire Weather Watches",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

### Tool Execution

Execute a tool:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_point_forecast",
    "arguments": {
      "latitude": 33.4484,
      "longitude": -112.0740
    }
  },
  "id": 2
}
```

## Fire Weather Tools

### get_fire_weather_alerts

Get active Red Flag Warnings and Fire Weather Watches.

**Input Schema:**
```typescript
{
  area?: string;      // State code (e.g., "AZ", "NM")
  point?: string;     // Coordinates "lat,lon" (e.g., "33.4484,-112.0740")
  zone?: string;      // Fire weather zone ID (e.g., "AZZ149")
  urgency?: string;   // "Immediate", "Expected", "Future", or "Past"
}
```

**Example Request:**
```json
{
  "area": "AZ",
  "urgency": "Immediate"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "...",
        "event": "Red Flag Warning",
        "headline": "Red Flag Warning issued for...",
        "areaDesc": "Northern Arizona",
        "severity": "Severe",
        "urgency": "Immediate",
        "certainty": "Likely",
        "effective": "2024-10-15T12:00:00-07:00",
        "expires": "2024-10-15T20:00:00-07:00",
        "description": "...",
        "instruction": "..."
      }
    ],
    "count": 1
  },
  "metadata": {
    "source": "api.weather.gov",
    "timestamp": "2024-10-15T12:00:00Z",
    "cached": false
  }
}
```

### get_fire_weather_zone

Get detailed fire weather zone information.

**Input Schema:**
```typescript
{
  zoneId: string;     // Fire weather zone ID (e.g., "AZZ149")
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "AZZ149",
    "type": "fire zone",
    "name": "Mogollon Rim",
    "state": "AZ",
    "cwa": ["PSR", "FGZ"],
    "forecastOffices": ["Phoenix", "Flagstaff"],
    "geometry": { ... },
    "activeAlerts": [...]
  }
}
```

### get_fire_weather_forecast

Get Fire Weather Forecast (FWF) products from a specific NWS office.

**Input Schema:**
```typescript
{
  office: string;     // NWS office code (e.g., "PSR" for Phoenix)
  zone?: string;      // Optional specific zone filter
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "office": "PSR",
    "issuedTime": "2024-10-15T10:00:00Z",
    "periods": [
      {
        "name": "Today",
        "sky": "Partly cloudy",
        "temperature": "85-95F",
        "relativeHumidity": "10-20%",
        "wind": "SW 10-20 mph with gusts to 30 mph",
        "mixingHeight": "8000-10000 ft AGL",
        "transportWinds": "SW 20-25 mph",
        "hainesIndex": "5 (moderate instability)"
      }
    ]
  }
}
```

### get_fire_danger_index

Calculate fire danger index from current weather conditions.

**Input Schema:**
```typescript
{
  latitude: number;   // Latitude (-90 to 90)
  longitude: number;  // Longitude (-180 to 180)
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "index": "HIGH",
    "score": 7.5,
    "factors": {
      "temperature": 95,
      "relativeHumidity": 12,
      "windSpeed": 22,
      "fuelMoisture": "very dry"
    },
    "recommendation": "Extreme caution advised. Outdoor burning not recommended."
  }
}
```

## Forecast Tools

### get_point_forecast

Get 7-day forecast for a specific location.

**Input Schema:**
```typescript
{
  latitude: number;    // Latitude (-90 to 90)
  longitude: number;   // Longitude (-180 to 180)
  units?: "us" | "si"; // Unit system (default: "us")
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": "33.4484,-112.0740",
    "elevation": "1132 ft",
    "updated": "2024-10-15T10:00:00Z",
    "periods": [
      {
        "number": 1,
        "name": "Today",
        "temperature": 95,
        "temperatureUnit": "F",
        "temperatureTrend": null,
        "windSpeed": "10 to 15 mph",
        "windDirection": "SW",
        "icon": "https://api.weather.gov/icons/...",
        "shortForecast": "Sunny",
        "detailedForecast": "Sunny, with a high near 95. Southwest wind 10 to 15 mph."
      },
      ...
    ]
  }
}
```

### get_hourly_forecast

Get hourly forecast data for the next 24-72 hours.

**Input Schema:**
```typescript
{
  latitude: number;
  longitude: number;
  units?: "us" | "si";
  hours?: number;      // Number of hours to return (optional)
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": "33.4484,-112.0740",
    "periods": [
      {
        "startTime": "2024-10-15T12:00:00-07:00",
        "endTime": "2024-10-15T13:00:00-07:00",
        "temperature": 92,
        "temperatureUnit": "F",
        "dewpoint": 32,
        "relativeHumidity": 15,
        "windSpeed": "15 mph",
        "windDirection": "SW",
        "shortForecast": "Sunny"
      },
      ...
    ],
    "summary": {
      "avgTemperature": 88,
      "minTemperature": 72,
      "maxTemperature": 95,
      "avgHumidity": 18,
      "avgWindSpeed": 12
    }
  }
}
```

### get_gridpoint_forecast

Get raw forecast grid data with all meteorological parameters.

**Input Schema:**
```typescript
{
  office: string;      // Grid office (e.g., "PSR")
  gridX: number;       // Grid X coordinate
  gridY: number;       // Grid Y coordinate
}
```

Note: Grid coordinates can be obtained from `get_point_metadata`.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "properties": {
      "temperature": {
        "uom": "wmoUnit:degC",
        "values": [
          { "validTime": "2024-10-15T12:00:00Z", "value": 35 },
          ...
        ]
      },
      "relativeHumidity": { ... },
      "windSpeed": { ... },
      "windDirection": { ... },
      "quantitativePrecipitation": { ... },
      "weather": { ... },
      "hazards": { ... }
    }
  }
}
```

### get_point_metadata

Get grid coordinates, zones, and URLs for a location.

**Input Schema:**
```typescript
{
  latitude: number;
  longitude: number;
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "cwa": "PSR",
    "forecastOffice": "Phoenix",
    "gridId": "PSR",
    "gridX": 78,
    "gridY": 118,
    "forecastZone": "AZZ023",
    "county": "AZC013",
    "fireWeatherZone": "AZZ149",
    "forecast": "https://api.weather.gov/gridpoints/PSR/78,118/forecast",
    "forecastHourly": "https://api.weather.gov/gridpoints/PSR/78,118/forecast/hourly",
    "forecastGridData": "https://api.weather.gov/gridpoints/PSR/78,118",
    "observationStations": "https://api.weather.gov/gridpoints/PSR/78,118/stations"
  }
}
```

## Alert Tools

### get_active_alerts

Get all active weather alerts with flexible filtering.

**Input Schema:**
```typescript
{
  area?: string;        // State code (e.g., "CA")
  point?: string;       // Coordinates "lat,lon"
  region?: string;      // Region code
  zone?: string;        // Forecast zone
  urgency?: string;     // "Immediate", "Expected", "Future", "Past"
  severity?: string;    // "Extreme", "Severe", "Moderate", "Minor"
  certainty?: string;   // "Observed", "Likely", "Possible", "Unlikely"
  event?: string;       // Event type (e.g., "Tornado Warning")
  limit?: number;       // Maximum number of alerts
}
```

### get_alerts_by_type

Get alerts filtered by specific event types.

**Input Schema:**
```typescript
{
  eventTypes: string[];  // Array of event types
  area?: string;
  limit?: number;
}
```

### get_severe_weather_alerts

Get only severe weather warnings (Extreme and Severe severity).

**Input Schema:**
```typescript
{
  area?: string;
  point?: string;
  limit?: number;
}
```

## Station Tools

### get_weather_stations

Get weather station information.

**Input Schema:**
```typescript
{
  state?: string;      // State code (e.g., "AZ")
  limit?: number;      // Maximum stations to return
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "KPHX",
        "name": "Phoenix Sky Harbor International Airport",
        "elevation": 1135,
        "coordinates": {
          "latitude": 33.4342,
          "longitude": -112.0116
        },
        "timeZone": "America/Phoenix",
        "county": "AZC013",
        "forecastZone": "AZZ023",
        "fireWeatherZone": "AZZ149"
      },
      ...
    ]
  }
}
```

### get_stations_near_point

Find weather stations near a specific location.

**Input Schema:**
```typescript
{
  latitude: number;
  longitude: number;
  limit?: number;      // Max stations (default: 10)
}
```

### get_fire_weather_stations

Get stations within specific fire weather zones.

**Input Schema:**
```typescript
{
  zones: string[];     // Array of fire zone IDs (e.g., ["AZZ149"])
  limit?: number;
}
```

## Response Format

All tools return responses in a standardized format:

### Success Response

```typescript
{
  success: true,
  data: {
    // Tool-specific data
  },
  metadata: {
    source: "api.weather.gov",
    timestamp: string,        // ISO 8601 timestamp
    cached: boolean,          // Whether data came from cache
    cacheAge?: number         // Age in seconds (if cached)
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    code: string,            // Error code (e.g., "NOT_FOUND")
    message: string,         // Human-readable message
    status?: number,         // HTTP status code (if applicable)
    details?: object         // Additional error context
  }
}
```

## Error Handling

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `VALIDATION_ERROR` | Invalid input parameters | Check input against schema |
| `NOT_FOUND` | Resource not found | Verify location/zone exists |
| `RATE_LIMITED` | Too many requests | Automatic retry with backoff |
| `API_ERROR` | NWS API error | Check NWS API status |
| `NETWORK_ERROR` | Connection problem | Check network connectivity |
| `TIMEOUT` | Request timeout | Retry request |
| `TOOL_ERROR` | Tool execution error | Check tool logs |

### Rate Limiting

The server implements automatic rate limiting:

- **Default:** 5 requests per second sustained
- **Burst:** Up to 20 requests per second briefly
- **429 Response:** Automatic retry using `Retry-After` header
- **Exponential Backoff:** Increases wait time on repeated failures

### Retry Strategy

```typescript
// Automatic retry for rate-limited requests
if (status === 429) {
  const retryAfter = headers['retry-after'] || 5;
  await sleep(retryAfter * 1000);
  return retry(request);
}
```

## NWS API Integration

### Base Configuration

```typescript
const BASE_URL = 'https://api.weather.gov';
const USER_AGENT = process.env.NWS_USER_AGENT || 'weather-mcp/1.0.0 (weather-mcp@github.com)';
```

### Headers

All requests include:

```http
User-Agent: weather-mcp/1.0.0 (your.email@example.com)
Accept: application/geo+json
```

### Caching Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Alerts | 5 minutes | Critical real-time data |
| Forecasts | 1 hour | Updated hourly by NWS |
| Grid Data | 30 minutes | Mid-frequency updates |
| Stations | 24 hours | Metadata rarely changes |
| Fire Zones | 12 hours | Semi-static boundaries |

### Request Flow

```
1. Check cache for valid entry
   ├─ HIT: Return cached data
   └─ MISS: Continue to API
2. Add request to rate limiter queue
3. Execute HTTP request
4. Handle response
   ├─ 200: Cache and return data
   ├─ 429: Retry with backoff
   ├─ 404: Return NOT_FOUND error
   └─ Other: Return API_ERROR
5. Update cache statistics
```

### GeoJSON Format

All geographic data follows GeoJSON specification:

```typescript
{
  "type": "Feature",
  "geometry": {
    "type": "Point" | "Polygon" | "MultiPolygon",
    "coordinates": [longitude, latitude] | [[[coordinates]]]
  },
  "properties": {
    // Feature-specific properties
  }
}
```

### Coordinate System

- **Format:** Decimal degrees
- **Latitude:** -90 to 90 (positive north)
- **Longitude:** -180 to 180 (positive east, negative west)
- **Order:** Always `[longitude, latitude]` in GeoJSON
- **Precision:** Up to 6 decimal places (~0.1 meter accuracy)

### Time Format

All timestamps use ISO 8601 with timezone:

```
2024-10-15T12:00:00-07:00
```

- **Format:** `YYYY-MM-DDTHH:mm:ss±HH:MM`
- **Timezone:** Always included
- **UTC:** Indicated by `Z` suffix

## Performance Optimization

### Cache Hit Ratio

Target >70% cache hit ratio for optimal performance:

```typescript
const stats = nwsClient.getCacheStats();
console.log(`Hit ratio: ${stats.hitRate}%`);
```

### Concurrent Requests

The rate limiter allows controlled concurrency:

```typescript
const queue = new PQueue({
  concurrency: 5,           // 5 concurrent requests
  interval: 1000,           // per second
  intervalCap: 5            // 5 requests per interval
});
```

### Memory Management

Cache size is managed automatically:
- Expired entries removed every 2 minutes
- Manual clear: `nwsClient.clearCache()`
- No max size limit (relies on TTL)

## Best Practices

1. **Always set User-Agent** with your contact email
2. **Enable caching** for production use
3. **Monitor cache hit ratio** to tune TTLs
4. **Handle errors gracefully** with fallback logic
5. **Respect rate limits** - use default settings
6. **Validate coordinates** before API calls
7. **Use appropriate units** (US or SI)
8. **Check alert urgency** for priority
9. **Parse ISO 8601 timestamps** with timezone awareness
10. **Log errors** for debugging

## Related Resources

- [NWS API Documentation](https://www.weather.gov/documentation/services-web-api)
- [CAP Alert Format](https://docs.oasis-open.org/emergency/cap/v1.2/)
- [GeoJSON Specification](https://geojson.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [weather-mcp GitHub](https://github.com/tyson-swetnam/weather-mcp)

## Support

For issues or questions:
- GitHub Issues: https://github.com/tyson-swetnam/weather-mcp/issues
- Documentation: See [docs/](.) directory
- NWS API Status: https://api.weather.gov/
