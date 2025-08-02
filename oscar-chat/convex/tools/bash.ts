import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { bashDescription } from "./bash_description";
import { validateSandboxContext, createSnapshot, executeCommand } from "./utils";

// Constants
const MAX_OUTPUT_LENGTH = 30000;
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_TIMEOUT = 600000; // 10 minutes

// Bash command execution tool
const bashExecute = {
  name: "bash",
  description: bashDescription,
  parameters: z.object({
    command: z.string().describe("The bash command to execute"),
    timeout: z.number()
      .min(0)
      .max(MAX_TIMEOUT)
      .optional()
      .describe("Optional timeout in milliseconds (max 600000)"),
    description: z.string()
      .describe("Clear, concise description of what this command does in 5-10 words")
  }),
  execute: async (
    params: { command: string; timeout?: number; description: string }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate required parameters
      if (!params.command) {
        return { 
          success: false, 
          data: null,
          error: "Missing required parameter: command. Please provide the bash command to execute." 
        };
      }

      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Create the command execution request
      const timeoutMs = params.timeout || DEFAULT_TIMEOUT;
      const timeoutSeconds = Math.floor(timeoutMs / 1000);
      
      const result = await executeCommand(ctx, params.command, timeoutSeconds);
      
      if (!result.success) {
        return { success: false, data: null, error: result.error };
      }

      const data = result.data;
      
      // Truncate output if needed
      let stdout = data.stdout || "";
      let stderr = data.stderr || "";
      let truncated = false;

      if (stdout.length + stderr.length > MAX_OUTPUT_LENGTH) {
        truncated = true;
        const halfLength = Math.floor(MAX_OUTPUT_LENGTH / 2);
        
        if (stdout.length > halfLength) {
          stdout = stdout.substring(0, halfLength) + "\n[Output truncated...]";
        }
        if (stderr.length > halfLength) {
          stderr = stderr.substring(0, halfLength) + "\n[Error output truncated...]";
        }
      }

      // Format the output
      let output = "";
      if (stdout) {
        output += `<stdout>\n${stdout}\n</stdout>`;
      }
      if (stderr) {
        if (output) output += "\n\n";
        output += `<stderr>\n${stderr}\n</stderr>`;
      }
      if (!stdout && !stderr) {
        output = "<no output>";
      }

      // Create a snapshot after command execution if it modifies files
      let snapshotResult = null;
      const modifyingCommands = ['touch', 'mkdir', 'rm', 'mv', 'cp', '>', '>>', 'echo', 'cat >', 'tee'];
      const shouldSnapshot = modifyingCommands.some(cmd => params.command.includes(cmd));

      if (shouldSnapshot && data.returncode === 0) {
        snapshotResult = await createSnapshot(ctx, `Snapshot after: ${params.description}`);
      }

      return {
        success: data.returncode === 0,
        data: {
          command: params.command,
          description: params.description,
          stdout,
          stderr,
          exitCode: data.returncode,
          output,
          truncated,
          snapshot: snapshotResult
        },
        error: data.returncode !== 0 ? `Command failed with exit code ${data.returncode}` : undefined
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { 
          success: false, 
          error: `Command timed out after ${params.timeout || DEFAULT_TIMEOUT}ms` 
        };
      }
      return { 
        success: false, 
        error: `Error executing command: ${error}` 
      };
    }
  },
};

// Export bash tools
export const bashTools = {
  bash: bashExecute,
};