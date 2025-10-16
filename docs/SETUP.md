# weather-mcp Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Navigate to your cloned repository directory
cd /path/to/weather-mcp
npm install
```

**Note:** Replace `/path/to/weather-mcp` with the actual path where you cloned the repository.

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your email for User-Agent
```

### 3. Build the Project

```bash
npm run build
```

### 4. Test the Installation

```bash
# Run basic tests
npm test

# Test with a simple query
node -e "console.log('MCP server ready')"
```

## Configure with Claude Desktop

Add to your Claude Desktop configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json` (typically `C:\Users\YourUsername\AppData\Roaming\Claude\claude_desktop_config.json`)

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

**Important:** Replace `/absolute/path/to/weather-mcp` with the actual absolute path where you cloned the repository.

### Restart Claude Desktop

After updating the configuration:
1. Quit Claude Desktop completely
2. Relaunch the application
3. The weather-mcp tools should now be available

## Configure with Claude Code

Claude Code (CLI) uses MCP servers via configuration in `~/.config/claude-code/mcp_config.json`.

### Option 1: Automatic Configuration

Let Claude Code configure it for you:

1. Start Claude Code in your project directory:
   ```bash
   cd /path/to/weather-mcp
   claude-code
   ```

   Replace `/path/to/weather-mcp` with your actual repository path.

2. Ask Claude to configure the MCP:
   ```
   Configure this weather-mcp server for Claude Code
   ```

3. Claude will update the MCP configuration automatically.

### Option 2: Manual Configuration

Create or edit `~/.config/claude-code/mcp_config.json`:

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

### Verify Configuration

Test that Claude Code can access the tools:

```bash
# Start Claude Code
claude-code

# Ask Claude to list available tools
> What weather tools do you have available?
```

You should see all weather-mcp tools listed.

## Configure with Cline (VSCode Extension)

Cline is a VSCode extension that supports MCP servers. Configure it through VSCode settings.

### Step 1: Install Cline Extension

1. Open VSCode
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Cline"
4. Click Install

### Step 2: Configure MCP Server

#### Option A: VSCode Settings UI

1. Open Settings (Cmd+, / Ctrl+,)
2. Search for "Cline MCP"
3. Click "Edit in settings.json"
4. Add weather-mcp configuration:

```json
{
  "cline.mcpServers": {
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

#### Option B: Direct settings.json Edit

1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Type "Preferences: Open Settings (JSON)"
3. Add the MCP configuration shown above

### Step 3: Reload VSCode

After configuring:
1. Reload VSCode window (Cmd+Shift+P → "Developer: Reload Window")
2. Open Cline panel
3. Weather-mcp tools should be available

### Step 4: Test Integration

In Cline chat, try:
```
Check for Red Flag Warnings in Arizona
```

Cline should use the weather-mcp tools to respond.

## Test the MCP Server

### Standalone Test

```bash
# Start the server
npm start

# In another terminal, run the example
cd examples
node fire-weather-monitoring.js
```

### With Claude Desktop

After configuring, restart Claude Desktop and you should be able to use commands like:

- "Check for Red Flag Warnings in Arizona"
- "Get the fire weather forecast for Phoenix"
- "Show me the current fire danger index for Tucson"
- "Find weather stations in fire zone AZZ149"

## Available Tools

### Fire Weather Tools
- `get_fire_weather_alerts` - Red Flag Warnings and Fire Weather Watches
- `get_fire_weather_zone` - Fire zone information
- `get_fire_weather_forecast` - Fire Weather Forecast products
- `get_fire_danger_index` - Calculate fire danger based on conditions

### General Weather Tools
- `get_point_forecast` - 7-day forecast for any location
- `get_hourly_forecast` - Hourly forecast data
- `get_gridpoint_forecast` - Raw grid forecast data
- `get_point_metadata` - Location metadata and URLs

### Alert Tools
- `get_active_alerts` - All weather alerts with filtering
- `get_alerts_by_type` - Specific alert types
- `get_severe_weather_alerts` - Severe weather warnings

### Station Tools
- `get_weather_stations` - Station information by state
- `get_stations_near_point` - Nearby stations
- `get_fire_weather_stations` - Stations in fire zones

## Environment Variables

Optional configuration in `.env`:

```env
# User Agent (recommended to add your email)
NWS_USER_AGENT=weather-mcp/1.0.0 (your.email@example.com)

# Rate limiting
NWS_RATE_LIMIT=5

# Cache settings (seconds)
CACHE_TTL_ALERTS=300
CACHE_TTL_FORECAST=3600
CACHE_TTL_STATIONS=86400
CACHE_ENABLED=true

# Logging
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

1. **"User-Agent required" error**
   - Make sure NWS_USER_AGENT is set in .env or config

2. **Rate limiting errors**
   - Reduce NWS_RATE_LIMIT in .env
   - Enable caching with CACHE_ENABLED=true

3. **Build errors**
   - Ensure Node.js 18+ is installed
   - Run `npm install` again
   - Clear dist folder: `rm -rf dist && npm run build`

4. **MCP not appearing in Claude**
   - Check config file path is correct
   - Restart Claude Desktop
   - Check logs for errors

### Debug Mode

Enable debug output:

```bash
# Set in .env
DEBUG=true
LOG_LEVEL=debug

# Or run directly
DEBUG=true npm start
```

## Next Steps

1. Explore the [examples](../examples/) directory
2. Read the [API documentation](API.md)
3. Check [CONTRIBUTING.md](../CONTRIBUTING.md) to contribute
4. Open issues for bugs or feature requests

## Support

- GitHub Issues: https://github.com/tyson-swetnam/weather-mcp/issues
- NWS API Docs: https://www.weather.gov/documentation/services-web-api