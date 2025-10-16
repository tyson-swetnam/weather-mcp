# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

weather-mcp is a Model Context Protocol (MCP) server that provides access to the National Weather Service API, with a special focus on fire weather monitoring. The server exposes weather data, forecasts, and alerts through standardized MCP tools.

## Common Development Commands

### Build and Development
```bash
npm install          # Install dependencies
npm run build        # Build TypeScript to dist/
npm run build:dev    # Build with watch mode
npm run watch        # Watch mode for development
npm run dev          # Development with tsx watch
npm start            # Start the built MCP server
```

### Testing
```bash
npm test                # Run all tests with Jest
npm run test:coverage   # Run tests with coverage report
npm run test:watch      # Run tests in watch mode
```

### Code Quality
```bash
npm run lint         # Lint TypeScript files with ESLint
npm run format       # Format code with Prettier
```

## Architecture

### Core Components

**MCP Server (`src/index.ts`)**
- Entry point that creates the MCP server instance using `@modelcontextprotocol/sdk`
- Registers all tools from different tool modules
- Handles tool listing and execution via `ListToolsRequestSchema` and `CallToolRequestSchema`
- Implements graceful shutdown (SIGINT, SIGTERM) and error handling
- All tools are combined from separate modules and exposed through a unified interface

**NWS API Client (`src/api/client.ts`)**
- Singleton `NWSClient` class that manages all API interactions with api.weather.gov
- Implements rate limiting using `p-queue` (default: 5 requests/second)
- Integrates caching via `CacheManager` with configurable TTLs per endpoint type
- Handles automatic retry on 429 rate limit responses using Retry-After header
- All API methods are `async` and return typed responses defined in `types.ts`
- Uses axios with custom interceptors for error handling

**Cache Manager (`src/cache/cacheManager.ts`)**
- Wraps `node-cache` for in-memory caching
- Tracks hit/miss statistics for monitoring cache effectiveness
- Can be enabled/disabled via `CACHE_ENABLED` environment variable
- Different TTLs by data type:
  - Alerts: 5 minutes (critical real-time)
  - Forecasts: 1 hour
  - Grid data: 30 minutes
  - Stations: 24 hours
  - Fire zones: 12 hours

**Tool Modules (`src/tools/`)**
- Each module exports an array of tool definitions with `name`, `description`, `inputSchema`, and `handler`
- Input validation using Zod schemas
- Standardized response format: `{ success, data, metadata }` or `{ success: false, error }`
- All handlers are async functions that parse args with Zod, call NWSClient, and return formatted responses

### Tool Organization

**Fire Weather Tools (`src/tools/fireWeather.ts`)**
- `get_fire_weather_alerts`: Red Flag Warnings and Fire Weather Watches
- `get_fire_weather_zone`: Zone information with active alerts
- `get_fire_weather_forecast`: FWF products by office
- `get_fire_danger_index`: Calculates custom fire danger indices from grid data

**Forecast Tools (`src/tools/forecast.ts`)**
- `get_point_forecast`: 7-day forecast grouped by day/night periods
- `get_hourly_forecast`: Hourly data with summary statistics
- `get_gridpoint_forecast`: Raw gridpoint data for advanced analysis
- `get_point_metadata`: Grid coordinates, zones, and URLs for a location

**Alert Tools (`src/tools/alerts.ts`)**
- Various alert filtering and retrieval tools
- Supports filtering by area, zone, urgency, severity, certainty

**Station Tools (`src/tools/stations.ts`)**
- Weather station metadata and observations
- Query by state, location, or fire zones

### Type System (`src/api/types.ts`)

- Comprehensive TypeScript interfaces for all NWS API responses
- GeoJSON types (Point, Polygon, MultiPolygon) for geographic data
- Alert types with CAP-compliant fields (severity, urgency, certainty, etc.)
- Forecast types with periods, gridpoint values, and time-series data
- All NWS API responses follow JSON-LD format with @context and @type fields

## Key Implementation Patterns

### Adding New Tools

1. Create or update a file in `src/tools/`
2. Define Zod schema for input validation
3. Implement async handler function following the pattern:
   ```typescript
   async function toolHandler(args: unknown) {
     const params = Schema.parse(args);
     try {
       const data = await nwsClient.method(...);
       return { success: true, data: {...}, metadata: {...} };
     } catch (error: any) {
       return { success: false, error: {...} };
     }
   }
   ```
4. Export tool definition with MCP metadata
5. Import and add to `allTools` array in `src/index.ts`

### Adding API Client Methods

1. Add TypeScript types in `src/api/types.ts` if needed
2. Add method to `NWSClient` class in `src/api/client.ts`
3. Use `cachedGet()` for GET requests with appropriate TTL from `CACHE_TTL` constants
4. Extract path from full URLs using `.replace(BASE_URL, '')`
5. Use the rate-limiting queue automatically via `cachedGet()`

### Error Handling Strategy

- API errors are caught and transformed to standard format: `{ code, message, status, details }`
- Rate limit (429) errors trigger automatic retry with exponential backoff
- Network errors return `NETWORK_ERROR` code
- All tool handlers catch errors and return `{ success: false, error }` format
- Process-level error handlers for uncaught exceptions and unhandled rejections

## Configuration

Environment variables in `.env`:
- `NWS_USER_AGENT`: Required User-Agent header (include contact email)
- `NWS_RATE_LIMIT`: Requests per second (default: 5)
- `CACHE_TTL_*`: TTL in seconds for different data types
- `CACHE_ENABLED`: Enable/disable caching (default: true)
- `MCP_SERVER_NAME` / `MCP_SERVER_VERSION`: Server identification
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)

## Fire Weather Priority

This project prioritizes fire weather monitoring:
- Red Flag Warning detection is the primary use case
- Southwest US (AZ, NM, West TX) is the target region
- Fire zone handling is integrated throughout
- Custom fire danger index calculation from weather parameters
- Designed to integrate with other fire management MCP tools (NIFC, FIRMS, RAWS)

## Testing Approach

- Jest is configured for TypeScript testing
- Mock external API calls to avoid rate limits
- Test both success and error paths
- When testing against real API, use small limits (e.g., `limit: 1`)
- Target 80% code coverage
- Integration tests should be in `test/` directory

## NWS API Specifics

- Base URL: `https://api.weather.gov`
- No API key required, but User-Agent header is mandatory
- Recommended sustained rate: 5 req/s, burst up to 20 req/s
- Coordinates are passed as decimal degrees: `latitude,longitude`
- Grid coordinates must be obtained via `/points/{lat},{lon}` endpoint first
- All responses use GeoJSON and JSON-LD formats
- Alert event types for fire weather: "Red Flag Warning", "Fire Weather Watch"

## Git Commit Guidelines

### Commit Message Format

Use the Conventional Commits format to maintain a clear, searchable git history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Components:**
- **type**: Category of change (see types below)
- **scope**: Component or module affected (e.g., cache, client, tools, alerts)
- **subject**: Short summary (50 chars or less)
- **body**: Detailed explanation of what and why (wrap at 72 chars)
- **footer**: Breaking changes, issue references, migration notes

### Commit Types

- `feat`: New feature or enhancement
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change (CRITICAL for tracking architecture evolution)
- `perf`: Performance improvement
- `docs`: Documentation only
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, build config, etc.)
- `style`: Code formatting, no logic change
- `ci`: CI/CD configuration changes

### Breaking Changes

**IMPORTANT**: Always mark breaking changes with `BREAKING CHANGE:` in the footer:

```
feat(client)!: redesign caching interface for better performance

Replace direct cache access with async cache provider pattern.
This enables future support for Redis and other cache backends.

BREAKING CHANGE: CacheManager.get() is now async. All callers must await.
Migration: Change `cache.get(key)` to `await cache.get(key)`.

Refs: #42
```

The `!` after the scope and `BREAKING CHANGE:` footer are both required for easy searching.

### Refactor Commits

Document architectural changes thoroughly in refactor commits:

```
refactor(tools): consolidate error handling across all tool modules

Extract common error transformation logic into shared utility.
Previously each tool module handled API errors differently,
making debugging difficult and responses inconsistent.

Changes:
- Add src/utils/errorHandler.ts with standardized transforms
- Update all tool handlers to use shared error handling
- Ensure all errors follow { code, message, status, details } format

This establishes the pattern for future tool development.
```

### Examples

**Feature with breaking change:**
```
feat(api)!: add streaming support for long-running forecasts

Enable streaming responses for gridpoint data requests that
may take >10s to complete. Improves UX for large area queries.

BREAKING CHANGE: getGridpointForecast() now returns AsyncIterable
instead of Promise. Update all callers to use `for await`.
```

**Major refactor:**
```
refactor(core): migrate from singleton pattern to dependency injection

Replace NWSClient singleton with injectable client instances.
This improves testability and enables multiple client configs
in future multi-region support.

Changes:
- Add ClientFactory in src/api/clientFactory.ts
- Update tool handlers to receive client via DI
- Modify server initialization to create and inject client
- Update all tests to use mock clients

Future work: This enables per-region client instances (#67).
```

**Performance improvement:**
```
perf(cache): implement LRU eviction strategy

Replace simple TTL cache with LRU cache to prevent memory growth.
Under high load, cache was growing unbounded with 24hr station TTLs.

Benchmark: Memory usage reduced from 2GB to 150MB peak over 24hrs.
```

**Bug fix:**
```
fix(alerts): correct timezone handling in alert expiry checks

Alert expiry times were compared using local time instead of UTC,
causing false positives for expired alerts in non-UTC timezones.

Fixes #123
```

### Best Practices

1. **Write for future maintainers**: Explain WHY the change was made, not just WHAT changed
2. **Reference issues**: Link to GitHub issues for context (`Fixes #123`, `Refs #456`)
3. **Document migration**: For breaking changes, provide exact steps to migrate
4. **Separate concerns**: One logical change per commit (easier to revert)
5. **Test before committing**: Run tests and linting to ensure quality
6. **Descriptive bodies**: Use bullet points for multi-part changes
7. **Use git add -p**: Stage changes in logical chunks for focused commits

### Reverting and Archaeology

With these conventions, you can:
- Find breaking changes: `git log --grep="BREAKING CHANGE"`
- Track refactors: `git log --grep="^refactor" --oneline`
- See feature history: `git log --grep="^feat" --oneline`
- Understand architecture evolution: `git log --grep="refactor.*core" --stat`
- Revert safely: Descriptive commits make `git revert` reliable

## Development Workflow

1. Make changes to source files in `src/`
2. Use `npm run dev` or `npm run build:dev` for watch mode during development
3. Test changes with `npm test`
4. Lint with `npm run lint` and format with `npm run format`
5. Build production version with `npm run build`
6. Write comprehensive commit message following guidelines above
7. Use `git add` to stage changes (consider `git add -p` for partial staging)
8. Commit with `git commit` (message will open in editor for multi-line commits)
9. Test MCP server integration with Claude Desktop using config in `~/Library/Application Support/Claude/claude_desktop_config.json`
