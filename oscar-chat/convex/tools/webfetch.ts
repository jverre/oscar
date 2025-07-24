import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { webfetchDescription } from "./webfetch_description";
import { validateSandboxContext, executeCommand } from "./utils";

// Constants
const DEFAULT_TIMEOUT = 30; // seconds
const MAX_TIMEOUT = 120; // seconds
const MAX_CONTENT_LENGTH = 1024 * 1024 * 5; // 5MB

// WebFetch tool for fetching web content
const webFetch = {
  name: "webfetch",
  description: webfetchDescription,
  parameters: z.object({
    url: z.string().describe("The URL to fetch content from"),
    timeout: z.number()
      .min(1)
      .max(MAX_TIMEOUT)
      .optional()
      .describe("Optional timeout in seconds (max 120, default 30)"),
  }),
  execute: async (
    params: { url: string; timeout?: number }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Validate URL format
      if (!params.url.startsWith('http://') && !params.url.startsWith('https://')) {
        return {
          success: false,
          error: "URL must start with http:// or https://"
        };
      }

      // Upgrade HTTP to HTTPS if possible
      let fetchUrl = params.url;
      if (params.url.startsWith('http://')) {
        fetchUrl = params.url.replace('http://', 'https://');
      }

      const timeout = params.timeout || DEFAULT_TIMEOUT;

      // Build curl command with proper options
      const curlCommand = [
        'curl',
        '-L', // Follow redirects
        '-s', // Silent mode
        '-S', // Show errors
        '--max-time', timeout.toString(),
        '--max-filesize', MAX_CONTENT_LENGTH.toString(),
        '--user-agent', '"Mozilla/5.0 (compatible; OpenCode/1.0)"',
        '--header', '"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"',
        '--header', '"Accept-Language: en-US,en;q=0.5"',
        '--header', '"Accept-Encoding: gzip, deflate"',
        '--header', '"Connection: keep-alive"',
        '--compressed',
        `"${fetchUrl}"`
      ].join(' ');

      // Execute the curl command
      const result = await executeCommand(ctx, curlCommand, timeout + 10);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const data = result.data;
      
      // Check for curl errors
      if (data.returncode !== 0) {
        let errorMessage = "Failed to fetch URL";
        
        if (data.stderr) {
          const stderr = data.stderr.toLowerCase();
          if (stderr.includes('timeout')) {
            errorMessage = `Request timed out after ${timeout} seconds`;
          } else if (stderr.includes('could not resolve')) {
            errorMessage = "Could not resolve hostname";
          } else if (stderr.includes('connection refused')) {
            errorMessage = "Connection refused";
          } else if (stderr.includes('ssl')) {
            errorMessage = "SSL/TLS error";
          } else if (stderr.includes('not found')) {
            errorMessage = "URL not found (404)";
          } else {
            errorMessage = `Fetch error: ${data.stderr}`;
          }
        }
        
        return { success: false, error: errorMessage };
      }

      const content = data.stdout;
      
      // Check content length
      const contentLength = content.length;
      let truncated = false;
      let processedContent = content;
      
      if (contentLength > MAX_CONTENT_LENGTH) {
        truncated = true;
        processedContent = content.substring(0, MAX_CONTENT_LENGTH) + '\n[Content truncated due to size limit]';
      }

      // Try to extract basic metadata
      let title = '';
      let contentType = 'text/plain';
      
      // Simple title extraction for HTML content
      if (content.includes('<title>')) {
        const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      }
      
      // Detect content type
      if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
        contentType = 'text/html';
      } else if (content.startsWith('{') || content.startsWith('[')) {
        contentType = 'application/json';
      } else if (content.includes('<?xml')) {
        contentType = 'application/xml';
      }

      return {
        success: true,
        data: {
          url: fetchUrl,
          original_url: params.url,
          content: processedContent,
          content_length: contentLength,
          truncated: truncated,
          timeout_used: timeout,
          title: title,
          content_type: contentType,
          message: "Content fetched successfully"
        }
      };
    } catch (error) {
      return { success: false, error: `Error fetching web content: ${error}` };
    }
  },
};

// Export webfetch tools
export const webfetchTools = {
  webfetch: webFetch,
};