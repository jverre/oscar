#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { uploadWorker } from "./background/upload-worker.js";
import { uploadQueue } from "./background/upload-queue.js";
import { logger } from "./logger.js";
import { UploadJob, ConversationExtractResult } from "./types.js";
import { getOscarConfig } from "./config.js";

/**
 * Oscar API client for communication with Oscar through API routes
 */
class OscarClient {
  constructor(private baseUrl: string) {}

  async createConversation(conversationId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/create_conversation`;
      
      logger.info(`[Oscar Client] Creating conversation ${conversationId} at ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Oscar Client] Failed to create conversation: ${response.status} ${errorText}`);
        return false;
      }
      
      const result = await response.json();
      logger.info(`[Oscar Client] Created conversation ${conversationId}: ${JSON.stringify(result)}`);
      return true;
      
    } catch (error) {
      logger.error(`[Oscar Client] Error creating conversation: ${error}`);
      return false;
    }
  }

  async uploadMessages(extractResult: ConversationExtractResult): Promise<string> {
    const url = `${this.baseUrl}/api/upload_messages`;
    let debugInfo = '';
    
    const payload = {
      conversationId: extractResult.conversationId,
      messages: extractResult.messages.map(message => ({
        messageId: message.messageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        conversationId: message.conversationId,
        messageOrder: message.messageOrder
      }))
    };
    
    debugInfo += `📤 HTTP POST to: ${url}\n`;
    debugInfo += `📦 Payload size: ${JSON.stringify(payload).length} bytes\n`;
    debugInfo += `📦 Messages count: ${payload.messages.length}\n`;
    debugInfo += `📦 Conversation ID: ${payload.conversationId}\n`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    debugInfo += `📥 Response status: ${response.status} ${response.statusText}\n`;
    debugInfo += `📥 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}\n`;
    
    if (!response.ok) {
      const errorText = await response.text();
      debugInfo += `❌ Error response: ${errorText}\n`;
      throw new Error(`HTTP ${response.status}: ${errorText}\n${debugInfo}`);
    }
    
    const result = await response.json();
    debugInfo += `📥 Response body: ${JSON.stringify(result)}\n`;
    
    if (!result.success) {
      debugInfo += `❌ Upload marked as failed in response\n`;
      throw new Error(`Upload failed: ${result.error || 'Unknown error'}\n${debugInfo}`);
    }
    
    debugInfo += `✅ Upload successful - inserted ${result.insertedCount || 'unknown'} messages\n`;
    return debugInfo;
  }
}

// Get configuration and create Oscar client
const config = getOscarConfig();
const oscarClient = new OscarClient(config.baseUrl);

// Export Oscar client for use by other modules
export { oscarClient };

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
      platform: z.enum(["Cursor", "Claude"]),
      chatId: z.string().optional()
    }
  },
  async ({ platform, chatId }) => {
    try {
      const finalChatId = chatId || randomUUID();
      const config = getOscarConfig();
      
      // Create conversation using Oscar client
      const success = await oscarClient.createConversation(finalChatId);
      
      if (!success) {
        logger.warn(`Failed to create conversation ${finalChatId} - continuing anyway`);
      }
      
      const message = `Your chat conversation is now publicly accessible at: [${config.baseUrl.replace('https://', '')}/chat/${finalChatId}](${config.baseUrl}/chat/${finalChatId})`;
      
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
