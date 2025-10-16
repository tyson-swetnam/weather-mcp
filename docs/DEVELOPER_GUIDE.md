# weather-mcp Developer Guide

This guide explains the internal architecture of weather-mcp and how to contribute to the project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Adding New Tools](#adding-new-tools)
5. [API Client Development](#api-client-development)
6. [Caching Strategy](#caching-strategy)
7. [Testing](#testing)
8. [Code Quality](#code-quality)
9. [Common Patterns](#common-patterns)
10. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

weather-mcp follows a layered architecture:

```
┌─────────────────────────────────────┐
│   MCP Client (Claude Desktop, etc)  │
└───────────────┬─────────────────────┘
                │ stdio
                ↓
┌─────────────────────────────────────┐
│         MCP Server (index.ts)        │
│  - Tool Registration                 │
│  - Request Routing                   │
│  - Error Handling                    │
└───────────────┬─────────────────────┘
                │
    ┌───────────┴───────────┐
    ↓                       ↓
┌────────────┐      ┌──────────────┐
│   Tools    │      │ Tool Modules │
│ Registry   │      │  - fireWeather│
└──────┬─────┘      │  - forecast   │
       │            │  - alerts     │
       │            │  - stations   │
       │            └───────┬───────┘
       │                    │
       └────────────┬───────┘
                    ↓
           ┌────────────────┐
           │   NWS Client    │
           │  - Rate Limit   │
           │  - Caching      │
           │  - Retry Logic  │
           └────────┬────────┘
                    │
                    ↓
           ┌────────────────┐
           │  Cache Manager  │
           │  - node-cache   │
           │  - Statistics   │
           └────────────────┘
```

### Key Design Principles

1. **Separation of Concerns:** Tools, API client, and caching are independent layers
2. **Single Responsibility:** Each module has one clear purpose
3. **Type Safety:** TypeScript throughout with comprehensive types
4. **Error Handling:** Consistent error format across all layers
5. **Testability:** Dependency injection and mockable interfaces

## Project Structure

```
weather-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── api/
│   │   ├── client.ts         # NWS API client (singleton)
│   │   ├── endpoints.ts      # API endpoint definitions
│   │   └── types.ts          # TypeScript types for API
│   ├── tools/
│   │   ├── fireWeather.ts    # Fire weather tools
│   │   ├── forecast.ts       # Forecast tools
│   │   ├── alerts.ts         # Alert tools
│   │   └── stations.ts       # Station tools
│   ├── cache/
│   │   └── cacheManager.ts   # Cache implementation
│   └── utils/
│       ├── validation.ts     # Input validation helpers
│       └── formatting.ts     # Response formatting
├── test/
│   ├── api/                  # API client tests
│   ├── tools/                # Tool tests
│   └── integration/          # End-to-end tests
├── examples/                 # Usage examples
└── docs/                     # Documentation
```

### File Organization Rules

- **One tool category per file** in `tools/`
- **Types before implementation** in all files
- **Exports at bottom** of each module
- **Tests mirror source structure** in `test/`

## Core Components

### 1. MCP Server (src/index.ts)

The entry point creates and configures the MCP server:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'weather-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

**Responsibilities:**
- Register all tools from tool modules
- Handle `tools/list` requests
- Route `tools/call` to appropriate handlers
- Manage lifecycle (startup, shutdown)
- Global error handling

**Key patterns:**
```typescript
// Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}));

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = allTools.find(t => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  return await tool.handler(request.params.arguments);
});
```

### 2. NWS API Client (src/api/client.ts)

Singleton class managing all NWS API interactions:

```typescript
class NWSClient {
  private static instance: NWSClient;
  private axios: AxiosInstance;
  private rateLimiter: PQueue;
  private cache: CacheManager;

  private constructor() {
    // Initialize axios, rate limiter, cache
  }

  public static getInstance(): NWSClient {
    if (!NWSClient.instance) {
      NWSClient.instance = new NWSClient();
    }
    return NWSClient.instance;
  }

  private async cachedGet<T>(path: string, ttl: number): Promise<T> {
    // Check cache first, then fetch if needed
  }

  public async getAlerts(params: AlertParams): Promise<AlertResponse> {
    // Public API methods
  }
}
```

**Key features:**
- **Rate limiting:** Uses `p-queue` for 5 req/s sustained rate
- **Caching:** Integrates `CacheManager` with configurable TTLs
- **Retry logic:** Automatic retry on 429 with exponential backoff
- **Type safety:** All methods return typed responses
- **Error handling:** Transforms API errors to standard format

**Adding new API methods:**
```typescript
// 1. Add types in types.ts
export interface NewDataResponse {
  // ...
}

// 2. Add method to NWSClient
public async getNewData(params: Params): Promise<NewDataResponse> {
  const path = `/endpoint/${params.id}`;
  return this.cachedGet<NewDataResponse>(path, CACHE_TTL.CUSTOM);
}
```

### 3. Cache Manager (src/cache/cacheManager.ts)

Wraps `node-cache` with statistics tracking:

```typescript
export class CacheManager {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  public get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }

  public set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, value, ttl);
  }

  public getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      ratio: this.hits / (this.hits + this.misses),
    };
  }
}
```

**TTL Strategy:**
```typescript
export const CACHE_TTL = {
  ALERTS: 300,        // 5 minutes (critical real-time)
  FORECAST: 3600,     // 1 hour (updated hourly)
  GRIDPOINT: 1800,    // 30 minutes
  STATIONS: 86400,    // 24 hours (rarely changes)
  ZONES: 43200,       // 12 hours
};
```

### 4. Tool Modules (src/tools/*.ts)

Each tool module exports an array of tool definitions:

```typescript
import { z } from 'zod';
import { nwsClient } from '../api/client.js';

// Input schema
const GetForecastSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  units: z.enum(['us', 'si']).optional(),
});

// Handler implementation
async function getForecastHandler(args: unknown) {
  // 1. Parse and validate input
  const params = GetForecastSchema.parse(args);

  try {
    // 2. Call API client
    const data = await nwsClient.getPointForecast(params);

    // 3. Return success response
    return {
      success: true,
      data: {
        location: `${params.latitude}, ${params.longitude}`,
        periods: data.properties.periods,
      },
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };
  } catch (error: any) {
    // 4. Return error response
    return {
      success: false,
      error: {
        code: error.code || 'API_ERROR',
        message: error.message,
        status: error.status,
        details: error.details,
      },
    };
  }
}

// Tool definition
export const forecastTools = [
  {
    name: 'get_point_forecast',
    description: 'Get 7-day forecast for a specific location',
    inputSchema: zodToJsonSchema(GetForecastSchema),
    handler: getForecastHandler,
  },
];
```

## Adding New Tools

Follow this step-by-step process:

### Step 1: Define the Tool

Choose the appropriate tool module or create a new one:
- Fire weather → `fireWeather.ts`
- General forecasts → `forecast.ts`
- Alerts → `alerts.ts`
- Stations → `stations.ts`
- New category → Create new file

### Step 2: Create Input Schema

Use Zod for validation:

```typescript
import { z } from 'zod';

const MyToolSchema = z.object({
  // Required string parameter
  location: z.string().min(2).max(50),

  // Optional number with constraints
  radius: z.number().min(1).max(100).optional(),

  // Enum for specific values
  severity: z.enum(['minor', 'moderate', 'severe']).optional(),

  // Array of strings
  zones: z.array(z.string()).optional(),
});

type MyToolParams = z.infer<typeof MyToolSchema>;
```

### Step 3: Implement Handler

```typescript
async function myToolHandler(args: unknown) {
  // Parse and validate
  const params = MyToolSchema.parse(args);

  try {
    // Call API
    const result = await nwsClient.getMyData(params);

    // Transform data if needed
    const processedData = processResult(result);

    // Return success
    return {
      success: true,
      data: processedData,
      metadata: {
        source: 'api.weather.gov',
        timestamp: new Date().toISOString(),
        cached: false, // Will be updated by cache manager
      },
    };
  } catch (error: any) {
    // Handle errors
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          details: error.errors,
        },
      };
    }

    return {
      success: false,
      error: {
        code: error.code || 'API_ERROR',
        message: error.message,
        status: error.status,
      },
    };
  }
}
```

### Step 4: Export Tool Definition

```typescript
export const myTools = [
  {
    name: 'my_tool_name',
    description: 'Clear, concise description of what the tool does',
    inputSchema: zodToJsonSchema(MyToolSchema),
    handler: myToolHandler,
  },
];
```

### Step 5: Register in Server

In `src/index.ts`:

```typescript
import { myTools } from './tools/myTools.js';

const allTools = [
  ...fireWeatherTools,
  ...forecastTools,
  ...alertTools,
  ...stationTools,
  ...myTools, // Add your tools
];
```

### Step 6: Add Tests

Create `test/tools/myTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { myTools } from '../../src/tools/myTools.js';

describe('my_tool_name', () => {
  const tool = myTools.find(t => t.name === 'my_tool_name');

  it('should exist', () => {
    expect(tool).toBeDefined();
  });

  it('should validate input', async () => {
    const result = await tool!.handler({ invalid: 'input' });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return data on success', async () => {
    const result = await tool!.handler({ location: 'Phoenix' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle API errors', async () => {
    // Mock API error
    // ...
  });
});
```

## API Client Development

### Making API Requests

Always use the `cachedGet` method for GET requests:

```typescript
private async cachedGet<T>(
  path: string,
  ttl: number
): Promise<T> {
  // Generate cache key
  const cacheKey = `nws:${path}`;

  // Check cache
  const cached = this.cache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Add to rate limit queue
  return this.rateLimiter.add(async () => {
    const response = await this.axios.get<T>(path);

    // Store in cache
    this.cache.set(cacheKey, response.data, ttl);

    return response.data;
  });
}
```

### Error Handling

Transform all errors to standard format:

```typescript
try {
  const data = await this.axios.get(path);
  return data;
} catch (error: any) {
  if (error.response?.status === 429) {
    // Rate limited - throw for retry
    const retryAfter = error.response.headers['retry-after'] || 5;
    throw {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      retryAfter: parseInt(retryAfter),
      status: 429,
    };
  }

  if (error.response?.status === 404) {
    throw {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      status: 404,
      details: { path },
    };
  }

  // Generic error
  throw {
    code: 'API_ERROR',
    message: error.message,
    status: error.response?.status,
  };
}
```

### Adding Types

Always add comprehensive types in `types.ts`:

```typescript
// Base structure
export interface MyApiResponse {
  '@context'?: any;
  '@type'?: string;
  properties: MyProperties;
  geometry?: GeoJSON.Geometry;
}

// Properties interface
export interface MyProperties {
  id: string;
  name: string;
  // ... more fields
}

// Related types
export interface MyFeature extends GeoJSON.Feature {
  properties: MyProperties;
}

export interface MyFeatureCollection extends GeoJSON.FeatureCollection {
  features: MyFeature[];
}
```

## Caching Strategy

### When to Cache

Cache based on data volatility:

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Alerts | 5 min | Critical, real-time |
| Forecasts | 1 hour | Updated hourly |
| Gridpoint | 30 min | Mid-frequency updates |
| Stations | 24 hours | Rarely changes |
| Zones | 12 hours | Static metadata |

### Cache Keys

Use consistent key format:

```typescript
const cacheKey = `nws:${endpoint}:${JSON.stringify(params)}`;
```

### Cache Invalidation

Cache entries expire automatically via TTL. For manual invalidation:

```typescript
this.cache.del(cacheKey);
```

### Monitoring Cache Performance

Track cache statistics:

```typescript
const stats = cacheManager.getStats();
console.log(`Cache hit ratio: ${stats.ratio * 100}%`);
```

Aim for >70% hit ratio for optimal performance.

## Testing

### Unit Tests

Test individual functions and methods:

```typescript
describe('parseForecastData', () => {
  it('should extract periods correctly', () => {
    const input = mockApiResponse;
    const result = parseForecastData(input);
    expect(result.periods).toHaveLength(14);
  });

  it('should handle missing data', () => {
    const input = {};
    expect(() => parseForecastData(input)).toThrow();
  });
});
```

### Integration Tests

Test full tool execution:

```typescript
describe('get_point_forecast integration', () => {
  it('should return forecast for valid coordinates', async () => {
    const tool = forecastTools.find(t => t.name === 'get_point_forecast');
    const result = await tool!.handler({
      latitude: 33.4484,
      longitude: -112.0740,
    });

    expect(result.success).toBe(true);
    expect(result.data.periods).toBeDefined();
  });
});
```

### Mocking

Mock the NWS client for faster tests:

```typescript
jest.mock('../src/api/client.ts', () => ({
  nwsClient: {
    getPointForecast: jest.fn().mockResolvedValue(mockData),
  },
}));
```

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npm test -- tools/forecast.test.ts
```

### Coverage Goals

Target coverage levels:
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

## Code Quality

### Linting

ESLint configuration enforces:
- TypeScript strict mode
- No unused variables
- Consistent formatting
- Import order

Run linter:
```bash
npm run lint
```

### Formatting

Prettier handles code formatting:
```bash
npm run format
```

### Type Checking

Ensure TypeScript compiles without errors:
```bash
npm run build
```

### Pre-commit Checks

Consider adding a pre-commit hook:

```bash
#!/bin/sh
npm run lint && npm test && npm run build
```

## Common Patterns

### Pattern 1: Coordinate Validation

```typescript
function validateCoordinates(lat: number, lon: number) {
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (lon < -180 || lon > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
}
```

### Pattern 2: Error Response Builder

```typescript
function buildErrorResponse(error: any) {
  return {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      status: error.status,
      details: error.details,
    },
  };
}
```

### Pattern 3: Success Response Builder

```typescript
function buildSuccessResponse(data: any, cached: boolean = false) {
  return {
    success: true,
    data,
    metadata: {
      source: 'api.weather.gov',
      timestamp: new Date().toISOString(),
      cached,
    },
  };
}
```

### Pattern 4: Data Transformation

```typescript
function transformApiResponse(apiData: ApiResponse): TransformedData {
  return {
    // Extract and reshape fields
    id: apiData.properties.id,
    name: apiData.properties.name,
    // Compute derived fields
    displayName: formatDisplayName(apiData.properties),
  };
}
```

## Contributing Guidelines

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full details. Key points:

### Development Workflow

1. **Fork and clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/weather-mcp.git
   cd weather-mcp
   npm install
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feat/my-new-feature
   ```

3. **Develop with tests**
   ```bash
   npm run dev  # Watch mode
   npm test     # Run tests
   ```

4. **Commit following conventions**
   ```bash
   git commit -m "feat(tools): add wind gust forecast tool"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/my-new-feature
   ```

### Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `docs`: Documentation only
- `test`: Adding tests
- `chore`: Maintenance

### Code Review

PRs must:
- Pass all tests
- Maintain >80% coverage
- Pass linting
- Include documentation
- Have descriptive commits

## Resources

### External Documentation

- [NWS API Specification](https://www.weather.gov/documentation/services-web-api)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)

### Internal Documentation

- [User Guide](USER_GUIDE.md) - How to use the tools
- [Setup Guide](SETUP.md) - Installation and configuration
- [API Reference](API.md) - Detailed API documentation
- [CLAUDE.md](../CLAUDE.md) - Claude Code guidance

### Getting Help

- GitHub Discussions: Ask questions
- GitHub Issues: Report bugs
- Pull Requests: Contribute code

## Debugging

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug
DEBUG=true

# Or run directly
DEBUG=true npm start
```

### Inspect API Requests

Add axios interceptors:

```typescript
this.axios.interceptors.request.use(request => {
  console.log('Request:', request.method, request.url);
  return request;
});

this.axios.interceptors.response.use(response => {
  console.log('Response:', response.status, response.config.url);
  return response;
});
```

### Test MCP Server Manually

```bash
# Start server
npm start

# In another terminal, send MCP requests via stdio
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm start
```

Happy developing!
