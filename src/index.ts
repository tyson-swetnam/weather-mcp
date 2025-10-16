#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Import tools
import { fireWeatherTools } from './tools/fireWeather.js';
import { forecastTools } from './tools/forecast.js';
import { alertTools } from './tools/alerts.js';
import { stationTools } from './tools/stations.js';

// Load environment variables
dotenv.config();

// Server configuration
const SERVER_NAME = process.env.MCP_SERVER_NAME || 'weather-mcp';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '1.0.0';

// Create MCP server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...fireWeatherTools,
  ...forecastTools,
  ...alertTools,
  ...stationTools,
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find the requested tool
  const tool = allTools.find(t => t.name === name);

  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    // Execute the tool
    const result = await tool.handler(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Handle errors gracefully
    console.error(`Error executing tool ${name}:`, error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: error.code || 'TOOL_ERROR',
              message: error.message,
              details: error.details || {},
            },
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('\\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Main function to start the server
async function main() {
  console.error(`Starting ${SERVER_NAME} v${SERVER_VERSION}...`);

  // Create transport for stdio communication
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  await server.connect(transport);

  console.error(`${SERVER_NAME} is ready and listening via stdio`);
  console.error('Configuration:');
  console.error(`  - User Agent: ${process.env.NWS_USER_AGENT || 'weather-mcp/1.0.0'}`);
  console.error(`  - Rate Limit: ${process.env.NWS_RATE_LIMIT || '5'} req/s`);
  console.error(`  - Cache Enabled: ${process.env.CACHE_ENABLED !== 'false'}`);
  console.error(`  - Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  console.error('\\nAvailable tools:');
  allTools.forEach(tool => {
    console.error(`  - ${tool.name}: ${tool.description}`);
  });
}

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});