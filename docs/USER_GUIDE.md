# weather-mcp User Guide

Welcome to the weather-mcp user guide! This guide will help you effectively use the National Weather Service MCP tools for weather forecasting, alerts, and fire weather monitoring.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Fire Weather Monitoring](#fire-weather-monitoring)
3. [General Weather Forecasts](#general-weather-forecasts)
4. [Weather Alerts](#weather-alerts)
5. [Weather Stations](#weather-stations)
6. [Use Cases & Examples](#use-cases--examples)
7. [Understanding Responses](#understanding-responses)
8. [Best Practices](#best-practices)

## Getting Started

Once weather-mcp is configured (see [SETUP.md](SETUP.md)), you can interact with it through natural language queries in Claude Desktop, Claude Code, or other MCP-compatible clients.

### Quick Examples

Try these queries to get started:

- "What's the weather forecast for Phoenix, AZ?"
- "Are there any Red Flag Warnings in New Mexico?"
- "Show me fire weather conditions in Tucson"
- "Get current weather alerts for California"

The MCP server will automatically select the appropriate tool and parameters based on your request.

## Fire Weather Monitoring

The primary focus of weather-mcp is fire weather monitoring, especially for the Southwest United States.

### Red Flag Warnings

Red Flag Warnings indicate dangerous fire weather conditions are occurring or expected soon. High winds combined with low humidity and dry fuels create extreme fire danger.

**Example queries:**
```
Check for Red Flag Warnings in Arizona
Are there any fire weather watches active in New Mexico?
Show me urgent fire weather alerts for the Southwest
```

**What you'll get:**
- Alert headline and description
- Affected areas and zones
- Start and end times
- Severity, urgency, and certainty levels
- Recommended actions

### Fire Weather Zones

The NWS divides regions into fire weather zones for targeted forecasting. Understanding your zone helps you monitor relevant conditions.

**Example queries:**
```
Get information about fire zone AZZ149
What fire weather zones cover Flagstaff?
Tell me about fire zone NMZ106
```

**What you'll get:**
- Zone name and description
- Geographic boundaries
- Current active alerts
- Responsible NWS office

### Fire Weather Forecasts

Fire Weather Forecasts (FWF) are specialized forecasts issued by NWS offices for fire management.

**Example queries:**
```
Get the fire weather forecast from Phoenix office
Show me the FWF for Tucson area
What's the fire weather forecast for Santa Fe?
```

**What you'll get:**
- Day and night period forecasts
- Sky conditions and precipitation
- Temperature and humidity ranges
- Wind speed and direction
- Mixing height and transport winds
- Lightning risk
- Haines Index (atmospheric instability)

### Fire Danger Index

The fire danger index is calculated from current weather conditions to assess fire risk.

**Example queries:**
```
Calculate fire danger for Tucson, AZ
What's the fire risk index for Albuquerque?
Show fire danger levels for Phoenix metro
```

**What you'll get:**
- Fire danger rating (Low, Moderate, High, Very High, Extreme)
- Contributing factors (temperature, humidity, wind)
- Risk assessment explanation

## General Weather Forecasts

### Point Forecasts

Get detailed 7-day forecasts for any latitude/longitude coordinate in the US.

**Example queries:**
```
What's the weather forecast for 33.4484, -112.0740?
Give me the 7-day forecast for Phoenix
Weather forecast for Tucson, Arizona
```

**What you'll get:**
- Day and night periods (typically 14 periods)
- Temperature (high/low)
- Wind speed and direction
- Precipitation probability
- Detailed conditions narrative
- Short forecast summary

### Hourly Forecasts

Hourly forecasts provide detailed hour-by-hour conditions for the next 24-72 hours.

**Example queries:**
```
Hourly forecast for Phoenix tomorrow
Hour-by-hour weather for Albuquerque
Detailed hourly conditions for Tucson
```

**What you'll get:**
- Temperature by hour
- Dewpoint and relative humidity
- Wind speed and direction
- Precipitation probability
- Cloud cover
- Summary statistics (averages, ranges)

### Gridpoint Data

Advanced users can access raw forecast grid data with all meteorological parameters.

**Example queries:**
```
Get gridpoint forecast data for Phoenix
Show me raw grid data for coordinates 33.4484, -112.0740
Advanced forecast data for PSR grid 78,118
```

**What you'll get:**
- All available weather parameters
- Time series data
- Quantitative precipitation forecast (QPF)
- Snow amount
- Weather type codes
- Hazards

## Weather Alerts

### Active Alerts

Monitor all active weather alerts with flexible filtering options.

**Example queries:**
```
Show all weather alerts in California
What warnings are active in Phoenix area?
Get severe weather alerts for New Mexico
```

**Filtering options:**
- **By area:** State code (e.g., AZ, NM, CA)
- **By point:** Latitude/longitude
- **By zone:** Forecast or fire zone
- **By urgency:** Immediate, Expected, Future
- **By severity:** Extreme, Severe, Moderate, Minor
- **By certainty:** Observed, Likely, Possible

**What you'll get:**
- Alert type and event name
- Affected areas
- Effective and expiration times
- Severity, urgency, certainty ratings
- Detailed description and instructions
- Issuing NWS office

### Alert Types

Common alert types you might encounter:

**Fire Weather:**
- Red Flag Warning
- Fire Weather Watch
- Extreme Fire Danger

**Severe Weather:**
- Tornado Warning/Watch
- Severe Thunderstorm Warning/Watch
- Flash Flood Warning/Watch

**Wind:**
- High Wind Warning/Watch
- Wind Advisory
- Dust Storm Warning

**Heat:**
- Excessive Heat Warning/Watch
- Heat Advisory

## Weather Stations

### Finding Stations

Weather stations provide ground-truth observations. You can find stations by state, location, or fire zone.

**Example queries:**
```
Find weather stations in Arizona
Show stations near Phoenix
Get stations in fire zone AZZ149
What weather stations are in Tucson area?
```

**What you'll get:**
- Station identifier and name
- Location coordinates
- Elevation
- Associated zones
- Contact information
- Current observation URL

### Station Observations

While the MCP focuses on forecasts and alerts, station metadata helps you locate observation points for verification and monitoring.

## Use Cases & Examples

### Use Case 1: Daily Fire Weather Briefing

**Scenario:** Fire manager needs morning briefing for operations

**Queries:**
1. "Check for Red Flag Warnings in Arizona and New Mexico"
2. "Get fire weather forecast for Phoenix and Tucson offices"
3. "Calculate fire danger index for operational zones"
4. "Show me wind conditions for the next 24 hours in fire zones"

**Result:** Comprehensive fire weather situation awareness

### Use Case 2: Pre-Burn Planning

**Scenario:** Planning a prescribed burn for next week

**Queries:**
1. "7-day forecast for burn location coordinates"
2. "Hourly wind forecast for planned burn window"
3. "Check for any upcoming fire weather watches"
4. "Get relative humidity forecast for the area"

**Result:** Data-driven burn window selection

### Use Case 3: Event Planning

**Scenario:** Outdoor event needs weather contingency planning

**Queries:**
1. "Weather forecast for event location and date"
2. "Hourly conditions during event time window"
3. "Check for any weather watches or warnings"
4. "Precipitation probability for the area"

**Result:** Informed weather risk assessment

### Use Case 4: Regional Monitoring

**Scenario:** Monitor fire weather across entire Southwest

**Queries:**
1. "All Red Flag Warnings in AZ, NM, CO, UT"
2. "Fire danger levels across the Southwest"
3. "Active fire weather watches by state"
4. "High wind warnings affecting fire zones"

**Result:** Regional fire weather situation map

### Use Case 5: Research and Analysis

**Scenario:** Analyzing fire weather patterns

**Queries:**
1. "Get gridpoint data for historical analysis location"
2. "Show all weather parameters for research area"
3. "Find weather stations for validation data"
4. "Get time series forecast data"

**Result:** Complete dataset for research

## Understanding Responses

### Success Responses

All successful tool calls return data in this format:

```json
{
  "success": true,
  "data": {
    // Tool-specific data here
  },
  "metadata": {
    "source": "api.weather.gov",
    "timestamp": "2024-10-15T12:00:00Z",
    "cached": false,
    "cacheAge": null
  }
}
```

**Key fields:**
- `success`: Always `true` for successful responses
- `data`: The actual weather data requested
- `metadata.cached`: Whether data came from cache (faster) or API
- `metadata.timestamp`: When the data was retrieved

### Error Responses

When something goes wrong, you'll receive:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 404,
    "details": {
      // Additional context
    }
  }
}
```

**Common error codes:**
- `NOT_FOUND`: Location or zone doesn't exist
- `RATE_LIMITED`: Too many requests (automatic retry)
- `VALIDATION_ERROR`: Invalid input parameters
- `API_ERROR`: NWS API issue
- `NETWORK_ERROR`: Connection problem

### Data Formats

**Coordinates:**
- Latitude: Decimal degrees, positive north (e.g., 33.4484)
- Longitude: Decimal degrees, positive east / negative west (e.g., -112.0740)
- Always latitude first, then longitude

**Times:**
- ISO 8601 format: `2024-10-15T12:00:00-07:00`
- Includes timezone offset
- Can be parsed by standard date libraries

**Temperatures:**
- Fahrenheit by default (US API)
- Celsius available by specifying `units: "si"`

**Wind:**
- Speed in MPH (or km/h for SI units)
- Direction as compass point (e.g., "SW") or degrees

**Probabilities:**
- Percentage (0-100)
- Used for precipitation chance, etc.

## Best Practices

### 1. Specify Locations Clearly

Be specific about locations to get accurate results:

**Good:**
- "Phoenix, Arizona"
- "Coordinates 33.4484, -112.0740"
- "Fire zone AZZ149"

**Less Good:**
- "Phoenix" (could be multiple cities)
- "Arizona" (too broad for point forecasts)

### 2. Time-Sensitive Queries

For current conditions, specify time context:

**Good:**
- "Current Red Flag Warnings"
- "Active alerts right now"
- "Today's fire weather forecast"

**Less Good:**
- "Red Flag Warnings" (unclear time scope)

### 3. Understand Update Schedules

NWS data updates on different schedules:
- **Alerts:** Real-time (check every 5 minutes)
- **Forecasts:** Updated every 1-6 hours
- **Fire Weather Forecasts:** Typically twice daily (morning/afternoon)
- **Gridpoint data:** Every 1-3 hours

The MCP's cache system respects these schedules automatically.

### 4. Use Appropriate Tools

Match your query to the right tool:
- **Quick overview:** Point forecast
- **Detailed planning:** Hourly forecast
- **Fire operations:** Fire weather tools
- **Safety monitoring:** Alert tools
- **Research:** Gridpoint data

### 5. Regional Awareness

Fire weather tools are optimized for:
- Arizona (AZ)
- New Mexico (NM)
- Western Texas (TX)
- Southern California (CA)
- Colorado (CO)
- Utah (UT)

While all NWS data works nationwide, fire weather features focus on these high-priority regions.

### 6. Handle Errors Gracefully

If you get an error:
1. Check location spelling and format
2. Verify coordinates are in valid range
3. Try a broader query (state instead of point)
4. Wait a moment and retry (rate limiting)

### 7. Combine Multiple Queries

For comprehensive situation awareness, ask multiple related questions:

```
1. "Red Flag Warnings in New Mexico"
2. "Fire weather forecast for Albuquerque office"
3. "Current wind conditions in affected zones"
4. "Hourly humidity forecast for fire areas"
```

### 8. Interpret Confidence Levels

Alert certainty levels help prioritize:
- **Observed:** Happening now (highest priority)
- **Likely:** High confidence (>50%)
- **Possible:** Some risk (>10%)
- **Unlikely:** Low confidence (<10%)

Fire weather decisions should weight Observed and Likely alerts heavily.

### 9. Cross-Reference Data

For critical decisions, validate across sources:
- Compare forecast with current observations
- Check multiple fire zones if on boundary
- Review both short-term (hourly) and long-term (7-day)

### 10. Stay Updated

Weather conditions change rapidly. For active fire operations:
- Check alerts every 30-60 minutes
- Review forecasts twice daily
- Monitor wind trends hourly during critical periods

## Getting Help

If you need assistance:

1. **Documentation:**
   - [Setup Guide](SETUP.md)
   - [Developer Guide](DEVELOPER_GUIDE.md)
   - [API Reference](API.md)

2. **GitHub Issues:**
   - Report bugs: Include query and error message
   - Request features: Describe use case
   - Ask questions: We're here to help!

3. **NWS Resources:**
   - [NWS API Documentation](https://www.weather.gov/documentation/services-web-api)
   - [Fire Weather Program](https://www.weather.gov/fire/)
   - [Alert Types](https://www.weather.gov/help-map)

## What's Next?

- Explore advanced features in [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- Check out [example scripts](../examples/)
- Learn about [contributing](../CONTRIBUTING.md)
- Review [API details](API.md)

Happy weather monitoring!
