import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { readDescription } from "./read_description";
import { validateSandboxContext, executeCommand } from "./utils";

// Constants
const DEFAULT_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

// Read tool for reading file contents
const readFile = {
  name: "read",
  description: readDescription,
  parameters: z.object({
    file_path: z.string().describe("The absolute path to the file to read"),
    offset: z.number().optional().describe("The line number to start reading from (0-based). Only provide if the file is too large to read at once"),
    limit: z.number().optional().describe("The number of lines to read. Only provide if the file is too large to read at once"),
  }),
  execute: async (
    params: { file_path: string; offset?: number; limit?: number }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Check if file is an image type
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
      const isImage = imageExtensions.some(ext => params.file_path.toLowerCase().endsWith(ext));

      if (isImage) {
        // For images, we'll read the file and return metadata
        const result = await executeCommand(ctx, `file "${params.file_path}" && ls -la "${params.file_path}"`);
        
        if (!result.success) {
          return { success: false, error: result.error };
        }

        if (result.data.returncode !== 0) {
          return { success: false, error: `Image file not found or cannot be read: ${result.data.stderr}` };
        }

        return {
          success: true,
          data: {
            file_path: params.file_path,
            content: `[IMAGE FILE]\n${result.data.stdout}`,
            is_image: true,
            message: "Image file detected. File information displayed above."
          }
        };
      }

      // For text files, read with optional offset and limit
      let command = `cat "${params.file_path}"`;
      
      // Apply offset and limit if provided
      if (params.offset !== undefined || params.limit !== undefined) {
        const offset = params.offset || 0;
        const limit = params.limit || DEFAULT_LIMIT;
        
        // Use tail and head to implement offset and limit
        if (offset > 0) {
          command = `tail -n +${offset + 1} "${params.file_path}"`;
        } else {
          command = `cat "${params.file_path}"`;
        }
        
        if (limit > 0) {
          command += ` | head -n ${limit}`;
        }
      }

      // Add line numbers
      command += ` | cat -n`;

      const result = await executeCommand(ctx, command);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      if (result.data.returncode !== 0) {
        return { success: false, error: `File not found or cannot be read: ${result.data.stderr}` };
      }

      let content = result.data.stdout;

      // Truncate long lines
      const lines = content.split('\n');
      let truncated = false;
      const processedLines = lines.map((line: any) => {
        if (line.length > MAX_LINE_LENGTH) {
          truncated = true;
          return line.substring(0, MAX_LINE_LENGTH) + '... [line truncated]';
        }
        return line;
      });

      content = processedLines.join('\n');

      // Check if file is empty
      const isEmpty = content.trim().length === 0;

      return {
        success: true,
        data: {
          file_path: params.file_path,
          content: content,
          offset: params.offset || 0,
          limit: params.limit || DEFAULT_LIMIT,
          lines_read: lines.length,
          truncated: truncated,
          empty: isEmpty,
          message: isEmpty ? "File exists but is empty" : "File read successfully"
        }
      };
    } catch (error) {
      return { success: false, error: `Error reading file: ${error}` };
    }
  },
};

// Export read tools
export const readTools = {
  read: readFile,
};