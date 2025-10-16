// Test setup file
// Configure environment for testing

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NWS_USER_AGENT = 'weather-mcp-test/1.0.0 (test@example.com)';
process.env.CACHE_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  debug: jest.fn(),
  log: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeValidAlert(received) {
    const pass =
      received &&
      typeof received === 'object' &&
      'id' in received &&
      'event' in received &&
      'severity' in received;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid alert`
          : `expected ${JSON.stringify(received)} to be a valid alert with id, event, and severity`,
    };
  },
});