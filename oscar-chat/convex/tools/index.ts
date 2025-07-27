import { z } from "zod";
import { tool } from 'ai';

// Tool execution context
export interface ToolContext {
  sandboxId?: string;
  pluginId?: string;
  organizationId?: string;
  userId?: string;
  modalAuthToken?: string;
  convexUrl?: string;
  authToken?: string;
}

// Tool result interface
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Import all tools
import { fileSystemTools } from "./fileSystem";
import { snapshotTools } from "./snapshots";
import { bashTools } from "./bash";
import { editTools } from "./edit";
import { readTools } from "./read";
import { writeTools } from "./write";
import { webfetchTools } from "./webfetch";
import { systemPrompt } from "./system_prompt";

// Export all tools as a registry
export const toolRegistry = {
  ...fileSystemTools,
  ...snapshotTools,
  ...bashTools,
  ...editTools,
  ...readTools,
  ...writeTools,
  ...webfetchTools,
};

// Get tool by name
export function getTool(name: string) {
  return toolRegistry[name as keyof typeof toolRegistry];
}

// Get all tool names
export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}

// Convert tools to AI SDK format
export function getToolsForAI(toolContext: ToolContext) {
  return Object.entries(toolRegistry).reduce((acc, [name, toolDef]) => {
    acc[name] = tool({
      description: toolDef.description,
      inputSchema: toolDef.parameters,
      execute: async (params: any) => {
        console.log(`Executing tool: ${name}`, params);
        
        try {
          const result = await toolDef.execute(params, toolContext);
          console.log(`Tool ${name} result:`, result);
          return result;
        } catch (error) {
          console.error(`Tool ${name} error:`, error);
          return { success: false, error: `Tool execution failed: ${error}` };
        }
      },
    });
    return acc;
  }, {} as Record<string, any>);
}

// Export system prompt
export { systemPrompt }; 