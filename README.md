# weather-mcp

A Model Context Protocol (MCP) server for the National Weather Service API, providing comprehensive weather data access with special focus on fire weather monitoring and alerts.

## Features

### 🔥 Fire Weather Monitoring
- **Red Flag Warnings**: Real-time fire weather alerts and watches
- **Fire Weather Zones**: Zone-specific forecasts and conditions
- **Fire Weather Forecasts**: Detailed FWF products by office

### 🌤️ Weather Data
- **Point Forecasts**: 7-day forecasts at 2.5km resolution
- **Grid Data**: Raw forecast grid data with all parameters
- **Weather Stations**: Observation station metadata and data
- **Weather Alerts**: All active weather alerts by area or location

### 📊 Data Formats
- JSON-LD with GeoJSON support
- CAP-compliant alert format
- OpenAPI specification available
- Real-time updates with generous rate limits

## Installation

```bash
# Clone the repository
git clone https://github.com/tyson-swetnam/weather-mcp.git
cd weather-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The NWS API currently requires no API key, but does require a User-Agent header. Configure in `.env`:

```env
# Optional: Custom User-Agent (defaults to weather-mcp/1.0.0)
NWS_USER_AGENT="YourApp/1.0.0 (your.email@example.com)"

# Optional: Rate limiting (requests per second)
NWS_RATE_LIMIT=5

# Optional: Cache settings (in seconds)
CACHE_TTL_ALERTS=300      # 5 minutes
CACHE_TTL_FORECAST=3600   # 1 hour
CACHE_TTL_STATIONS=86400  # 24 hours
```

## Quick Start

See the [Setup Guide](docs/SETUP.md) for detailed installation instructions for:
- **Claude Desktop** - Desktop application
- **Claude Code** - CLI tool
- **Cline** - VSCode extension

### Basic Setup

```bash
# Build the project
npm run build

# Start the MCP server
npm start
```

### Configure with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "weather-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/weather-mcp/dist/index.js"],
      "env": {
        "NWS_USER_AGENT": "weather-mcp/1.0.0 (your.email@example.com)"
      }
    }
  }
}
```

Restart Claude Desktop after configuration. See [docs/SETUP.md](docs/SETUP.md) for Claude Code and Cline setup.

### As a Library

```javascript
const { WeatherMCP } = require('weather-mcp');

const weatherMCP = new WeatherMCP({
  userAgent: 'MyApp/1.0.0',
  cacheEnabled: true
});

// Get Red Flag Warnings for Arizona
const warnings = await weatherMCP.getFireWeatherAlerts({
  area: 'AZ',
  urgency: 'Immediate'
});

// Get forecast for a location
const forecast = await weatherMCP.getPointForecast({
  latitude: 33.4484,
  longitude: -112.0740
});
```

## Available Tools

### Fire Weather Tools

#### `get_fire_weather_alerts`
Get active Red Flag Warnings and Fire Weather Watches.

**Parameters:**
- `area`: State code (e.g., "AZ", "NM")
- `point`: Lat/lon coordinates
- `zone`: Fire weather zone ID
- `urgency`: Filter by urgency (Immediate, Expected, Future)

**Example:**
```json
{
  "tool": "get_fire_weather_alerts",
  "arguments": {
    "area": "AZ",
    "urgency": "Immediate"
  }
}
```

#### `get_fire_weather_zone`
Get detailed fire weather zone information.

**Parameters:**
- `zoneId`: Fire weather zone identifier (e.g., "AZZ149")

**Example:**
```json
{
  "tool": "get_fire_weather_zone",
  "arguments": {
    "zoneId": "AZZ149"
  }
}
```

#### `get_fire_weather_forecast`
Get Fire Weather Forecast (FWF) products.

**Parameters:**
- `office`: NWS office code (e.g., "PSR" for Phoenix)
- `zone`: Specific fire zone (optional)

### Weather Data Tools

#### `get_point_forecast`
Get 7-day forecast for a specific location.

**Parameters:**
- `latitude`: Latitude in decimal degrees
- `longitude`: Longitude in decimal degrees
- `units`: "us" (default) or "si"

**Example:**
```json
{
  "tool": "get_point_forecast",
  "arguments": {
    "latitude": 33.4484,
    "longitude": -112.0740,
    "units": "us"
  }
}
```

#### `get_gridpoint_forecast`
Get raw forecast grid data.

**Parameters:**
- `office`: Grid office (e.g., "PSR")
- `gridX`: Grid X coordinate
- `gridY`: Grid Y coordinate

#### `get_weather_stations`
Get weather station information.

**Parameters:**
- `state`: State code
- `limit`: Maximum number of stations

#### `get_active_alerts`
Get all active weather alerts.

**Parameters:**
- `area`: State or marine area code
- `point`: Lat/lon coordinates
- `region`: Region code
- `zone`: Forecast zone
- `urgency`: Immediate, Expected, Future, Past
- `severity`: Extreme, Severe, Moderate, Minor
- `certainty`: Observed, Likely, Possible, Unlikely

## Response Format

All tools return structured JSON responses:

```json
{
  "success": true,
  "data": {
    // Tool-specific data
  },
  "metadata": {
    "source": "api.weather.gov",
    "timestamp": "2024-10-14T12:00:00Z",
    "cached": false
  }
}
```

## Fire Weather Integration

This MCP server is optimized for fire weather monitoring and integrates well with fire management systems:

### Red Flag Warning Monitoring
```javascript
// Monitor Red Flag Warnings for Southwest states
const warnings = await weatherMCP.monitorFireWeather({
  states: ['AZ', 'NM', 'TX'],
  alertTypes: ['Red Flag Warning', 'Fire Weather Watch'],
  callback: (alert) => {
    console.log(`New alert: ${alert.event} for ${alert.areaDesc}`);
  }
});
```

### Fire Weather Zone Analysis
```javascript
// Get fire danger for specific zones
const zones = ['AZZ149', 'AZZ150', 'NMZ106'];
const zoneData = await Promise.all(
  zones.map(zone => weatherMCP.getFireWeatherZone({ zoneId: zone }))
);
```

### Integration with Fire APIs
Designed to work alongside other fire management MCP tools:
- Combine with NIFC fire perimeter data
- Correlate with NASA FIRMS hotspot detection
- Enhanced with RAWS weather station data
- Cross-reference with air quality monitoring

## Development

### Project Structure
```
weather-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── server.ts          # Server implementation
│   ├── tools/             # Tool implementations
│   │   ├── fireWeather.ts
│   │   ├── forecast.ts
│   │   ├── alerts.ts
│   │   └── stations.ts
│   ├── api/              # NWS API client
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── types.ts
│   ├── cache/            # Caching layer
│   └── utils/            # Utilities
├── test/                 # Tests
├── examples/             # Usage examples
└── docs/                 # Documentation
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific endpoint
npm run test:endpoint -- --grep "fire weather"
```

### Building

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Watch mode
npm run watch
```

## API Rate Limits

The NWS API has generous rate limits:
- No hard rate limit currently enforced
- Recommended: 5 requests/second sustained
- Burst: Up to 20 requests/second briefly
- Retry-After header provided when limited
- User-Agent header required

## Caching Strategy

Optimized caching for different data types:
- **Alerts**: 5-minute cache (critical real-time data)
- **Forecasts**: 1-hour cache (updates hourly)
- **Grid Data**: 30-minute cache
- **Station Metadata**: 24-hour cache
- **Fire Zones**: 12-hour cache

## Error Handling

Comprehensive error handling with retries:
```javascript
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 5,
    "details": {
      "endpoint": "/alerts/active",
      "timestamp": "2024-10-14T12:00:00Z"
    }
  }
}
```

## Related Projects

- [nifc-mcp](https://github.com/yourusername/nifc-mcp) - NIFC fire perimeter data
- [firms-mcp](https://github.com/yourusername/firms-mcp) - NASA FIRMS satellite detection
- [raws-mcp](https://github.com/yourusername/raws-mcp) - RAWS weather station data
- [drought-mcp](https://github.com/yourusername/drought-mcp) - US Drought Monitor

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- National Weather Service for providing the public API
- Southwest Coordination Center for fire weather requirements
- MCP community for the protocol specification

## Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- **[Setup Guide](docs/SETUP.md)** - Installation and configuration for Claude Desktop, Claude Code, and Cline
- **[User Guide](docs/USER_GUIDE.md)** - How to use the weather tools, examples, and best practices
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture, contributing, and adding new tools
- **[API Reference](docs/API.md)** - Detailed API documentation

## Support

For issues, questions, or suggestions:
- GitHub Issues: [weather-mcp/issues](https://github.com/tyson-swetnam/weather-mcp/issues)
- Discussions: Ask questions and share ideas
- Documentation: See links above