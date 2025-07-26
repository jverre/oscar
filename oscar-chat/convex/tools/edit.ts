import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { editDescription } from "./edit_description";
import { validateSandboxContext, createSnapshot, executeCommand } from "./utils";

// Edit tool for making changes to files
const editFile = {
  name: "edit",
  description: editDescription,
  parameters: z.object({
    file_path: z.string().describe("The absolute path to the file to modify"),
    old_string: z.string().describe("The text to replace"),
    new_string: z.string().describe("The text to replace it with (must be different from old_string)"),
    replace_all: z.boolean().optional().default(false).describe("Replace all occurrences of old_string (default false)"),
  }),
  execute: async (
    params: { file_path: string; old_string: string; new_string: string; replace_all?: boolean }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Validate parameters
      if (params.old_string === params.new_string) {
        return {
          success: false,
          error: "old_string and new_string must be different"
        };
      }

      if (params.old_string.length === 0) {
        return {
          success: false,
          error: "old_string cannot be empty"
        };
      }

      // First, read the file to check if it exists and get its contents
      const readResult = await executeCommand(ctx, `cat "${params.file_path}"`);
      
      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      if (readResult.data.returncode !== 0) {
        return { success: false, error: `File not found or cannot be read: ${readResult.data.stderr}` };
      }

      const fileContent = readResult.data.stdout;

      // Check if old_string exists in the file
      if (!fileContent.includes(params.old_string)) {
        return {
          success: false,
          error: `String not found in file: "${params.old_string}"`
        };
      }

      // Check if old_string is unique (unless replace_all is true)
      if (!params.replace_all) {
        const occurrences = fileContent.split(params.old_string).length - 1;
        if (occurrences > 1) {
          return {
            success: false,
            error: `String "${params.old_string}" appears ${occurrences} times in the file. Use replace_all=true to replace all occurrences, or provide a more specific string that appears only once.`
          };
        }
      }

      // Perform the replacement
      const newContent = params.replace_all 
        ? fileContent.replace(new RegExp(escapeRegExp(params.old_string), 'g'), params.new_string)
        : fileContent.replace(params.old_string, params.new_string);

      // Write the modified content back to the file
      const writeResult = await executeCommand(ctx, `cat > "${params.file_path}" << 'EOF'\\n${newContent}\\nEOF`);
      
      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      if (writeResult.data.returncode !== 0) {
        return { success: false, error: `Failed to write file: ${writeResult.data.stderr}` };
      }

      // Create a snapshot after editing the file
      const snapshotResult = await createSnapshot(ctx, `Snapshot after editing ${params.file_path}`);

      return {
        success: true,
        data: {
          file_path: params.file_path,
          old_string: params.old_string,
          new_string: params.new_string,
          replace_all: params.replace_all,
          changes_made: params.replace_all 
            ? fileContent.split(params.old_string).length - 1 
            : 1,
          message: "File edited successfully",
          snapshot: snapshotResult
        }
      };
    } catch (error) {
      return { success: false, error: `Error editing file: ${error}` };
    }
  },
};

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

// Export edit tools
export const editTools = {
  edit: editFile,
};