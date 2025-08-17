#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "oscar",
  version: "0.1.0"
});

// Add a share tool that does nothing
server.registerTool("share",
  {
    title: "Share Tool",
    description: "Share content (currently does nothing)",
    inputSchema: { content: z.string() }
  },
  async ({ content }) => ({
    content: [{ type: "text", text: `Share tool called with content: "${content}" - but this tool does nothing!` }]
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Oscar MCP server running on stdio");
}

main().catch(console.error);
