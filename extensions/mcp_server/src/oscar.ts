#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { uploadWorker } from "./background/upload-worker.js";
import { uploadQueue } from "./background/upload-queue.js";
import { logger } from "./logger.js";
import { UploadJob } from "./types.js";

// Create an MCP server
const server = new McpServer({
  name: "oscar",
  version: "0.1.0"
});

// Add a share tool with enhanced functionality
server.registerTool("/share",
  {
    title: "Share chat conversation",
    description: "Automatically triggered when user types '/share' - Always trigger this tool when a user types '/share' and nothing else.",
    inputSchema: {
      platform: z.enum(["Cursor", "Claude Code", "Chat GPT"]),
      chatId: z.string().optional()
    }
  },
  async ({ platform, chatId }) => {
    try {
      const finalChatId = chatId || randomUUID();
      const baseUrl = process.env.OSCAR_DOMAIN || 'https://www.getoscar.ai';
      const message = `Your chat conversation is now publicly accessible at: [${baseUrl.replace('https://', '')}/chat/${finalChatId}](${baseUrl}/chat/${finalChatId})`;
      
      const job: UploadJob = {
        oscarChatId: finalChatId,
        platform: platform,
        timestamp: Date.now()
      };
      uploadQueue.addJob(job);

      return {
        content: [{ type: "text", text: message }]
      };
    } catch (error) {
      logger.error(`Share tool error: ${error}`);
      return {
        content: [{ type: "text", text: "❌ Failed to share conversation. Please try again." }]
      };
    }
  }
);

async function main() {
  try {
    logger.info('=== Oscar MCP Server Starting ===');
    logger.info(`Log file: ${logger.getLogPath()}`);
    
    // Add global unhandled error handlers to prevent crashes
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message} | Stack: ${error.stack}`);
      // Don't exit the process for MCP servers - just log and continue
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled Rejection: ${String(reason)}`);
      // Don't exit the process for MCP servers - just log and continue
    });
    
    // Start background upload worker BEFORE server connection
    logger.info('Starting background upload worker...');
    uploadWorker.start();
    
    // Give worker a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now start the MCP server
    logger.info('Starting MCP server transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Oscar MCP server running on stdio');
    
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    throw error;
  }
}

main().catch(console.error);
