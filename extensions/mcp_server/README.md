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

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## License

MIT
