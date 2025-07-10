# MCP Location Server - Refactored Architecture

A Model Context Protocol (MCP) server that provides location information based on IP addresses, built with a modular monorepo architecture.

## 🏗️ Architecture Overview

This project has been refactored from a single-file implementation into a well-structured monorepo with the following benefits:

- **Modular Design**: Each tool is organized into logical modules with clear separation of concerns
- **Shared Utilities**: Common functionality is extracted into reusable packages
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testability**: Comprehensive test suite with isolated unit tests
- **Maintainability**: Clean code structure following SOLID principles
- **Scalability**: Easy to add new tools and extend functionality

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 7+ (for workspace support)

### Installation

```bash
# Install all dependencies for all packages
npm install
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@mcp-monorepo/location
```

### Development

```bash
# Start development mode with file watching
npm run dev

# Start specific package in dev mode
npm run dev --workspace=@mcp-monorepo/location
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Running the Server

```bash
# After building
node packages/location/dist/index.js

# Or using npm script
npm run start --workspace=@mcp-monorepo/location
```

## 🔧 Available Tools

### 1. Get Current Location

**Tool ID**: `get-current-location`

**Description**: Get current location information based on your public IP address.

**Parameters**: None

**Example Response**:

```
Current Location Information:

IP Address: 203.0.113.1
Location: New York, New York, United States
Coordinates: 40.7128, -74.0060
Timezone: America/New_York
Postal Code: 10001
ISP: Example ISP
```

### 2. Get Location by IP

**Tool ID**: `get-location-by-ip`

**Description**: Get location information for a specific IP address.

**Parameters**:

- `ipAddress` (string, required): IP address to lookup location information

**Example Response**:

```
Location Information for 8.8.8.8:

IP Address: 8.8.8.8
Location: Mountain View, California, United States
Coordinates: 37.386, -122.0838
Timezone: America/Los_Angeles
ISP: Google LLC
```

## 🏛️ Architecture Principles

### Separation of Concerns

Each tool is organized into distinct layers:

- **Types**: TypeScript interfaces and type definitions
- **Helper**: Pure business logic and data processing
- **Formatter**: Output formatting and presentation
- **Handler**: MCP protocol integration
- **Index**: Tool registration and exports

### Dependency Management

The architecture promotes:

- **Clear dependencies**: Each package declares its dependencies explicitly
- **Workspace resolution**: Internal packages use `*` protocol

### Error Handling

Robust error handling with:

- **Input validation**: All inputs are validated before processing
- **Graceful degradation**: Meaningful error messages for users
- **Structured errors**: Consistent error format across tools

### Testing Strategy

- **Unit tests**: Each helper function is tested in isolation
- **Mocking**: External dependencies are mocked for reliable testing
- **Coverage**: Comprehensive test coverage for critical paths

## 🔌 Integration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "location": {
      "command": "node",
      "args": ["/path/to/packages/location/dist/index.js"]
    }
  }
}
```

### Other MCP Clients

The server implements the standard MCP protocol and can be used with any compatible client.

## 🧪 Data Source

Location data is provided by [IP-API](http://ip-api.com/), which offers:

- Free tier with reasonable rate limits
- Comprehensive location data including coordinates, timezone, ISP information
- Support for both IPv4 and IPv6 addresses

## 📈 Future Enhancements

The modular architecture makes it easy to add:

- Additional location providers (for redundancy)
- Caching layer for improved performance
- Rate limiting and request throttling
- More detailed location information (weather, demographics, etc.)
- Integration with other MCP tools

## 🤝 Contributing

Contributions are welcome! The modular structure makes it easy to:

1. Add new tools in the `packages/location/src/` directory
2. Add comprehensive tests for new functionality
3. Follow the established patterns for consistency

## 📄 License

ISC License - see package.json for details.
