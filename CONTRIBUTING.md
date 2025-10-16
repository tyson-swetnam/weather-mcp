# Contributing to weather-mcp

Thank you for your interest in contributing to weather-mcp! This document provides guidelines and instructions for contributing to this MCP server for the National Weather Service API.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Contributions](#making-contributions)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to create a welcoming environment for all contributors.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/yourusername/weather-mcp.git
cd weather-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Build the project
npm run build

# Run tests
npm test
```

### Development Commands

```bash
# Start development server with watch mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Making Contributions

### Adding New Tools

1. Create a new file in `src/tools/` for your tool category
2. Define input schemas using Zod
3. Implement tool handlers following the existing pattern
4. Export tools array with proper MCP metadata
5. Import and add to `allTools` in `src/index.ts`

Example tool structure:
```typescript
import { z } from 'zod';
import { nwsClient } from '../api/client.js';

const MyToolSchema = z.object({
  param: z.string().describe('Parameter description'),
});

async function myToolHandler(args: unknown) {
  const params = MyToolSchema.parse(args);

  try {
    // Implementation
    return {
      success: true,
      data: { /* ... */ },
      metadata: { /* ... */ },
    };
  } catch (error) {
    return {
      success: false,
      error: { /* ... */ },
    };
  }
}

export const myTools = [
  {
    name: 'my_tool',
    description: 'Tool description',
    inputSchema: { /* JSON Schema */ },
    handler: myToolHandler,
  },
];
```

### API Client Extensions

To add new NWS API endpoints:

1. Add type definitions in `src/api/types.ts`
2. Add client methods in `src/api/client.ts`
3. Configure appropriate caching TTL
4. Handle errors consistently

### Fire Weather Enhancements

Fire weather is a priority focus. When adding fire-related features:

1. Prioritize Southwest US coverage (AZ, NM, West TX)
2. Include Red Flag Warning detection
3. Consider integration with fire management systems
4. Add appropriate fire zone handling

## Testing

### Writing Tests

- Place unit tests next to the files they test
- Place integration tests in the `test/` directory
- Use descriptive test names
- Mock external API calls when appropriate
- Test error conditions

### Test Coverage

We aim for at least 80% code coverage. Run coverage reports with:

```bash
npm run test:coverage
```

### API Testing

Test against the real NWS API sparingly to avoid rate limits:

```javascript
describe('NWS API Integration', () => {
  test('should fetch real data', async () => {
    // Use small limits and specific test data
    const result = await nwsClient.getAlerts({
      area: 'AZ',
      limit: 1
    });
    expect(result).toBeDefined();
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments to all exported functions
- Include parameter descriptions and return types
- Provide usage examples where helpful

### README Updates

When adding features, update:
- Available Tools section
- Response Format examples
- Configuration options if added
- Related projects if relevant

### API Documentation

Document new endpoints in `docs/API.md` including:
- Endpoint URL
- Parameters
- Response format
- Example requests/responses
- Rate limits
- Error codes

## Submitting Changes

### Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass: `npm test`
4. Update the README if needed
5. Create a pull request with a clear description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Tested with real API

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No console.log statements
```

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add tornado warning detection`
- `fix: Handle rate limiting in forecast API`
- `docs: Update fire weather examples`
- `test: Add coverage for alert tools`
- `refactor: Simplify cache management`

## Questions?

Open an issue on GitHub for:
- Feature requests
- Bug reports
- Questions about contribution
- Documentation improvements

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.