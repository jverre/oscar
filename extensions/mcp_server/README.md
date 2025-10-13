# Oscar MCP Server

A simple Model Context Protocol (MCP) server with a single "share" tool that does nothing.

## Installation

```bash
npx -y @jverre/oscar
```

## Usage

The server runs on stdio and provides a single tool called "share" that accepts content but performs no action.

## Tool

- **share**: Takes a `content` parameter (string) and returns a message indicating it was called

## Development

### Setup
```bash
npm install
npm run build
```

### Local Testing
To test changes without publishing:

1. Build the project: `npm run build`
2. Point your MCP client to the local build:
   ```
   node /path/to/oscar/extensions/mcp_server/dist/oscar.js
   ```
3. Check logs: `tail -f ~/oscar-mcp-logs/oscar-mcp.log`
4. Rebuild after changes: `npm run build`

## Build

```bash
npm run build
```

## License

MIT
